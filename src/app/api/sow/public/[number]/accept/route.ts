// ── POST /api/sow/public/[number]/accept ────────────────────────────
// Client-side SOW acceptance. Client POSTs their typed signature name.
// We:
//   1. Transition SOW: sent/viewed → accepted, stamp accepted_at/signature/ip
//   2. Auto-generate the deposit invoice (25% by default, per pricing.deposit_cents)
//   3. Link deposit_invoice_id back on the SOW row
//   4. Return the deposit invoice's public URL so client can pay immediately
//
// NOTE (Plan B): This route runs the simple "single deposit installment"
// lifecycle for the magic-link client-Accept flow. The admin path uses
// /api/admin/sow/[id]/convert → src/lib/payment-plans.ts, which supports
// multi-installment + TIK + cascade triggers + Stripe subscriptions.
// Both paths converge on the same downstream side effects (project +
// prospect.is_client + subscriptions + trade_credits). Keep them in sync.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { allocateDocNumber } from '@/lib/doc-numbering'
import { getValueStackItems } from '@/lib/services-catalog'
import { sendInvoiceEmail } from '@/lib/invoice-email'
import { sendSms, isSmsEnabled } from '@/lib/twilio-sms'
import { renderInvoicePdf } from '@/lib/pdf/invoice'
import { uploadPrivate } from '@/lib/r2-storage'
import { getInvoicePaymentSummary, getInvoiceProjectMeta } from '@/lib/invoice-context'
import type { SowPricing, SowPhase, Invoice, InvoiceWithLineItems } from '@/lib/invoice-types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { key, signature }: { key?: string; signature?: string } = body
  if (!key) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!signature || signature.trim().length < 2) {
    return NextResponse.json(
      { error: 'Signature required (type your full name)' },
      { status: 400 },
    )
  }

  const { data: sow } = await supabaseAdmin
    .from('sow_documents')
    .select('*, prospect:prospects(*)')
    .eq('sow_number', number)
    .eq('public_uuid', key)
    .maybeSingle()

  if (!sow) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!['sent', 'viewed'].includes(sow.status)) {
    return NextResponse.json(
      { error: `SOW is ${sow.status} — cannot accept` },
      { status: 409 },
    )
  }

  // Capture IP for audit trail.
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    null

  const acceptedAt = new Date().toISOString()

  // Generate deposit invoice.
  const pricing = sow.pricing as SowPricing
  const depositCents = pricing.deposit_cents ?? Math.round(pricing.total_cents * 0.25)

  // Pull the "New Client Appreciation" value stack from services_catalog.
  // These auto-populate as 100%-discounted lines on the deposit invoice,
  // giving the client visible proof of $X,XXX in included value on day one.
  const valueStackItems = await getValueStackItems()
  const valueStackSubtotalCents = valueStackItems.reduce(
    (sum, item) => sum + item.display_price_cents,
    0,
  )

  // Invoice totals:
  //   displayed subtotal = deposit + value_stack (what the prospect sees as
  //     total value of what they're receiving)
  //   displayed discount = -value_stack (the courtesy discount)
  //   total due          = deposit (actual money owed)
  const displayedSubtotalCents = depositCents + valueStackSubtotalCents

  // Insert deposit invoice with a temp placeholder number, then allocate
  // a proper INV-CLIENT-MMDDYY{SUFFIX} number once we have the row id.
  const tempInvNumber = `PENDING-${crypto.randomUUID()}`
  const { data: depositInvoice, error: invErr } = await supabaseAdmin
    .from('invoices')
    .insert({
      invoice_number: tempInvNumber,
      kind: 'business',
      prospect_id: sow.prospect_id,
      quote_session_id: sow.quote_session_id,
      status: 'sent',
      sent_at: acceptedAt,
      sent_via_channel: 'manual',
      subtotal_cents: displayedSubtotalCents,
      discount_cents: valueStackSubtotalCents,
      total_due_cents: depositCents,
      currency: 'USD',
      auto_generated: true,
      auto_trigger: 'sow_deposit',
      auto_sent: true,
      category_hint: 'service_revenue',
      notes: `Deposit invoice for SOW ${sow.sow_number} — ${sow.title}. Remaining balance: $${((pricing.total_cents - depositCents) / 100).toFixed(2)}`,
    })
    .select('*')
    .single()

  if (invErr || !depositInvoice) {
    return NextResponse.json(
      { error: `Deposit invoice insert: ${invErr?.message}` },
      { status: 500 },
    )
  }

  // Allocate new-format invoice number. Fall back to legacy RPC if prospect
  // has no client_code (best-effort — don't break the accept flow).
  //
  // CRITICAL: the local depositInvoice.invoice_number must reflect what's
  // actually persisted on the row. Previously the local var was bumped to
  // the new number AFTER the update() without checking for error, so a
  // silent update failure left the DB at PENDING-{uuid} while the API
  // returned the intended INV-CLIENT-MMDDYY{A} as the magic-link target —
  // producing a 404 on the customer's pay page.
  if (sow.prospect_id) {
    try {
      const invNumber = await allocateDocNumber({
        doc_type: 'INV',
        prospect_id: sow.prospect_id,
        ref_table: 'invoices',
        ref_id: depositInvoice.id,
      })
      const { error: renameErr } = await supabaseAdmin
        .from('invoices')
        .update({ invoice_number: invNumber })
        .eq('id', depositInvoice.id)
      if (renameErr) {
        // The number was allocated in document_numbers but the rename failed.
        // Leave the row at PENDING (admin can fix manually) and log loudly so
        // we don't silently hand a customer a URL that 404s.
        console.error('[accept] Invoice rename failed after allocateDocNumber:', renameErr.message)
      } else {
        depositInvoice.invoice_number = invNumber
      }
    } catch (numErr) {
      // Prospect may not yet have a client_code. Fall back to legacy number.
      console.warn('[accept] New-format numbering failed, falling back:', numErr instanceof Error ? numErr.message : numErr)
      const { data: legacyNum } = await supabaseAdmin.rpc('generate_invoice_number')
      if (legacyNum) {
        const { error: renameErr } = await supabaseAdmin
          .from('invoices')
          .update({ invoice_number: legacyNum })
          .eq('id', depositInvoice.id)
        if (renameErr) {
          console.error('[accept] Legacy invoice rename failed:', renameErr.message)
        } else {
          depositInvoice.invoice_number = legacyNum
        }
      }
      // If legacy also fails, the PENDING number stays — visible in admin, fixable manually.
    }
  }

  // Re-verify the row's current invoice_number from the DB before we hand
  // the magic link to the customer. If for any reason the row was renamed
  // by a concurrent process, our local copy may already be stale; if a
  // rename failed, the DB authoritative state may still be PENDING. Either
  // way, returning what's actually persisted prevents the customer-facing
  // 404 we just diagnosed.
  {
    const { data: fresh } = await supabaseAdmin
      .from('invoices')
      .select('invoice_number, public_uuid')
      .eq('id', depositInvoice.id)
      .single()
    if (fresh?.invoice_number) {
      depositInvoice.invoice_number = fresh.invoice_number
      depositInvoice.public_uuid = fresh.public_uuid
    }
  }

  // Build line items:
  //   0: Deposit line (real charge)
  //   1..N: Value stack items at full price (for visible perceived value)
  //   N+1: "New Client Appreciation" 100% discount line offsetting value stack
  const lineItems: Array<Record<string, unknown>> = [
    {
      invoice_id: depositInvoice.id,
      description: `Deposit for ${sow.title} (SOW ${sow.sow_number})`,
      quantity: 1,
      unit_price_cents: depositCents,
      subtotal_cents: depositCents,
      discount_pct: 0,
      discount_cents: 0,
      line_total_cents: depositCents,
      sort_order: 0,
    },
  ]

  valueStackItems.forEach((item, idx) => {
    lineItems.push({
      invoice_id: depositInvoice.id,
      description: item.name + (item.description ? ` — ${item.description}` : ''),
      quantity: 1,
      unit_price_cents: item.display_price_cents,
      subtotal_cents: item.display_price_cents,
      discount_pct: 0,
      discount_cents: 0,
      line_total_cents: item.display_price_cents,
      sort_order: idx + 1,
    })
  })

  if (valueStackSubtotalCents > 0) {
    // Model the appreciation discount as a 100%-discounted line: unit_price
    // and discount both equal the stack subtotal, line_total = 0. Keeps the
    // schema's check constraints happy (unit_price_cents >= 0,
    // discount_cents >= 0) while still surfacing the bundle as a single
    // visible "New Client Appreciation" row that nets to zero.
    lineItems.push({
      invoice_id: depositInvoice.id,
      description: 'New Client Appreciation — included with your engagement',
      quantity: 1,
      unit_price_cents: valueStackSubtotalCents,
      subtotal_cents: valueStackSubtotalCents,
      discount_pct: 100,
      discount_cents: valueStackSubtotalCents,
      discount_label: 'New Client Appreciation',
      line_total_cents: 0,
      sort_order: valueStackItems.length + 1,
    })
  }

  const { error: liErr } = await supabaseAdmin.from('invoice_line_items').insert(lineItems)
  if (liErr) {
    await supabaseAdmin.from('invoices').delete().eq('id', depositInvoice.id)
    return NextResponse.json({ error: `Line item insert: ${liErr.message}` }, { status: 500 })
  }

  // Flip SOW status.
  await supabaseAdmin
    .from('sow_documents')
    .update({
      status: 'accepted',
      accepted_at: acceptedAt,
      accepted_signature: signature.trim(),
      accepted_ip: ip,
      deposit_invoice_id: depositInvoice.id,
    })
    .eq('id', sow.id)

  // Materialize subscriptions for recurring deliverables in phases.
  // Each monthly/quarterly/annual deliverable gets its own subscription row.
  if (sow.prospect_id && Array.isArray(sow.phases) && (sow.phases as SowPhase[]).length > 0) {
    const cadenceToBillingInterval: Record<string, string> = {
      monthly: 'month',
      quarterly: 'quarter',
      annual: 'year',
    }

    for (const phase of sow.phases as SowPhase[]) {
      for (const deliv of phase.deliverables) {
        const cadence = deliv.cadence ?? 'one_time'
        if (!['monthly', 'quarterly', 'annual'].includes(cadence)) continue

        const billingInterval = cadenceToBillingInterval[cadence]
        const lineCents = deliv.line_total_cents ?? (((deliv.hours ?? deliv.quantity ?? 1)) * (deliv.unit_price_cents ?? 0))

        // Determine start date from trigger or default to now.
        let periodStart = new Date()
        if (deliv.start_trigger?.type === 'date' && deliv.start_trigger.date) {
          periodStart = new Date(deliv.start_trigger.date)
        }

        // Compute period end based on billing interval.
        const periodEnd = new Date(periodStart)
        if (billingInterval === 'month') periodEnd.setMonth(periodEnd.getMonth() + 1)
        else if (billingInterval === 'quarter') periodEnd.setMonth(periodEnd.getMonth() + 3)
        else if (billingInterval === 'year') periodEnd.setFullYear(periodEnd.getFullYear() + 1)

        // Try to find an existing subscription_plans row matching service_id.
        let planId: string | null = null
        if (deliv.service_id) {
          const { data: existingPlan } = await supabaseAdmin
            .from('subscription_plans')
            .select('id')
            .eq('slug', deliv.service_id)
            .eq('active', true)
            .maybeSingle()
          if (existingPlan) planId = existingPlan.id
        }

        // If no matching plan found, create a throwaway plan for this deliverable.
        if (!planId) {
          const throwawaySlug = `sow-${sow.sow_number}-deliv-${deliv.id.slice(0, 8)}`
          const { data: newPlan } = await supabaseAdmin
            .from('subscription_plans')
            .insert({
              slug: throwawaySlug,
              name: deliv.name,
              description: `Auto-created from SOW ${sow.sow_number}`,
              price_cents: lineCents,
              billing_interval: billingInterval,
              active: true,
            })
            .select('id')
            .single()
          if (newPlan) planId = newPlan.id
        }

        if (!planId) continue // skip if we couldn't get a plan

        await supabaseAdmin.from('subscriptions').insert({
          prospect_id: sow.prospect_id,
          plan_id: planId,
          status: 'active',
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          next_invoice_date: periodEnd.toISOString().slice(0, 10),
          override_monthly_amount_cents: lineCents,
          notes: `Auto-created from SOW ${sow.sow_number} deliverable "${deliv.name}" (${cadence})`,
        })
      }
    }
  }

  // ── Create trade credit if SOW has a TIK discount ─────────────────
  if (sow.trade_credit_cents && sow.trade_credit_cents > 0 && sow.prospect_id) {
    const { error: tcErr } = await supabaseAdmin.from('trade_credits').insert({
      prospect_id: sow.prospect_id,
      sow_document_id: sow.id,
      original_amount_cents: sow.trade_credit_cents,
      remaining_cents: sow.trade_credit_cents,
      description: sow.trade_credit_description ?? `Trade credit from SOW ${sow.sow_number}`,
      status: 'outstanding',
    })
    if (tcErr) console.error('trade_credits insert failed:', tcErr.message)
  }

  // ── Best-effort: mark prospect as client + create project ─────────
  // Wrapped in try/catch so failures here never break the accept flow.
  // The deposit invoice + subscriptions are already committed at this point.
  try {
    // 1. Mark prospect as client (idempotent — .eq('is_client', false) guard)
    if (sow.prospect_id) {
      await supabaseAdmin
        .from('prospects')
        .update({ is_client: true, became_client_at: new Date().toISOString() })
        .eq('id', sow.prospect_id)
        .eq('is_client', false)
    }

    // 2. Create project from SOW phases
    const projectPhases = (sow.phases ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      status: 'pending',
      completed_at: null,
      deliverables: (p.deliverables ?? []).map((d: any) => ({
        id: d.id,
        service_id: d.service_id ?? null,
        name: d.name,
        description: d.description,
        cadence: d.cadence ?? 'one_time',
        quantity: d.quantity,
        hours: d.hours,
        unit_price_cents: d.unit_price_cents,
        line_total_cents: d.line_total_cents,
        status: 'pending',
        delivered_at: null,
      })),
    }))

    // Monthly value = sum of monthly + (quarterly/3) + (annual/12) recurring deliverable cents
    let monthlyCents = 0
    for (const phase of sow.phases ?? []) {
      for (const d of phase.deliverables ?? []) {
        const cents = d.line_total_cents ?? 0
        if (d.cadence === 'monthly') monthlyCents += cents
        else if (d.cadence === 'quarterly') monthlyCents += Math.round(cents / 3)
        else if (d.cadence === 'annual') monthlyCents += Math.round(cents / 12)
      }
    }

    const { error: projErr } = await supabaseAdmin.from('projects').insert({
      prospect_id: sow.prospect_id,
      sow_document_id: sow.id,
      name: sow.title,
      type: 'website',
      status: 'planning',
      start_date: new Date().toISOString().slice(0, 10),
      target_date: null,
      phases: projectPhases,
      monthly_value: monthlyCents > 0 ? monthlyCents / 100 : null,
      notes: `Auto-created from accepted SOW ${sow.sow_number}`,
    })
    if (projErr) console.error('[accept] Project creation failed:', projErr.message)
  } catch (lifecycleErr: any) {
    console.error('[accept] Client lifecycle side-effect failed:', lifecycleErr?.message ?? lifecycleErr)
  }

  // ── Render + persist deposit invoice PDF, then email it to the client ──
  // Best-effort: any failure here is logged but does not break the accept
  // flow. The accepted-state UI copy ('A deposit invoice has been sent.')
  // depends on this actually firing — the response payload now reports
  // delivery state so the UI can adapt.
  let invoiceEmailResult: {
    sent: boolean
    to: string | null
    error: string | null
  } = { sent: false, to: null, error: null }

  try {
    const recipient =
      sow.prospect?.owner_email ?? sow.prospect?.business_email ?? null

    // Hydrate the just-inserted invoice with line items + bill_to so the
    // PDF renderer has everything it needs.
    const { data: lineItems } = await supabaseAdmin
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', depositInvoice.id)
      .order('sort_order', { ascending: true })

    const renderInput: InvoiceWithLineItems = {
      ...(depositInvoice as Invoice),
      line_items: lineItems ?? [],
      bill_to: {
        business_name: sow.prospect?.business_name ?? 'Client',
        contact_name: sow.prospect?.owner_name ?? null,
        email: sow.prospect?.owner_email ?? null,
      },
    }

    const [paymentSummary, projectMeta] = await Promise.all([
      getInvoicePaymentSummary(depositInvoice.id, depositInvoice.total_due_cents),
      getInvoiceProjectMeta(depositInvoice.id),
    ])

    const pdfBuffer = await renderInvoicePdf(renderInput, {
      prospect: {
        business_name: sow.prospect?.business_name ?? 'Client',
        owner_name:    sow.prospect?.owner_name ?? null,
        owner_email:   sow.prospect?.owner_email ?? null,
        address:       sow.prospect?.address ?? null,
        city:          sow.prospect?.city ?? null,
        state:         sow.prospect?.state ?? null,
        zip:           sow.prospect?.zip ?? null,
      },
      project: projectMeta,
      paymentSummary,
    })

    // Persist the rendered PDF to R2 so the magic-link page can serve it.
    const pdfKey = `invoices/${depositInvoice.invoice_number}_v${depositInvoice.pdf_version ?? 1}.pdf`
    try {
      await uploadPrivate(pdfKey, pdfBuffer, 'application/pdf')
      await supabaseAdmin
        .from('invoices')
        .update({
          pdf_storage_path: pdfKey,
          pdf_rendered_at: new Date().toISOString(),
        })
        .eq('id', depositInvoice.id)
    } catch (uploadErr) {
      console.error('[accept] Deposit invoice R2 upload failed:', uploadErr instanceof Error ? uploadErr.message : uploadErr)
    }

    if (recipient) {
      const result = await sendInvoiceEmail(
        renderInput,
        recipient,
        {
          business_name: sow.prospect?.business_name ?? undefined,
          owner_email:   sow.prospect?.owner_email ?? null,
          owner_name:    sow.prospect?.owner_name ?? null,
        },
        pdfBuffer,
      )
      invoiceEmailResult = {
        sent: result.success,
        to: recipient,
        error: result.success ? null : (result.error ?? 'unknown send failure'),
      }
      if (!result.success) {
        console.error('[accept] Deposit invoice email send failed:', result.error)
      }
    } else {
      invoiceEmailResult = {
        sent: false,
        to: null,
        error: 'No prospect email on file (owner_email + business_email both null)',
      }
      console.warn('[accept] Skipping deposit invoice email — no recipient')
    }
  } catch (emailErr) {
    invoiceEmailResult.error =
      emailErr instanceof Error ? emailErr.message : 'unknown deposit email error'
    console.error('[accept] Deposit invoice email pipeline threw:', invoiceEmailResult.error)
  }

  // ── SMS the magic-link to the prospect (best-effort, parallel) ──
  // Sends a short text with the deposit invoice URL so the client can pay
  // from their phone without hunting through email. Honors the
  // sms_delivery_enabled kill switch; logs delivery state on the response
  // so the post-accept UI can be honest about what fired.
  let invoiceSmsResult: {
    sent: boolean
    to: string | null
    error: string | null
  } = { sent: false, to: null, error: null }

  try {
    const smsRecipient =
      sow.prospect?.owner_phone ?? sow.prospect?.business_phone ?? null

    if (!smsRecipient) {
      invoiceSmsResult.error = 'No prospect phone on file (owner_phone + business_phone both null)'
      console.warn('[accept] Skipping deposit invoice SMS — no recipient phone')
    } else if (!(await isSmsEnabled())) {
      invoiceSmsResult.error = 'SMS delivery disabled in config'
      // Don't log — kill switch is operator intent, not a failure.
    } else {
      const businessName = sow.prospect?.business_name ?? 'your business'
      const depositStr = `$${(depositCents / 100).toFixed(2)}`
      const url = `https://demandsignals.co/invoice/${depositInvoice.invoice_number}/${depositInvoice.public_uuid}`
      const message =
        `${businessName}: thanks for signing your SOW with Demand Signals. ` +
        `Your deposit invoice ${depositInvoice.invoice_number} (${depositStr}) — ${url}`
      const result = await sendSms(smsRecipient, message)
      invoiceSmsResult = {
        sent: result.success,
        to: smsRecipient,
        error: result.success ? null : (result.error ?? 'unknown sms failure'),
      }
      if (!result.success) {
        console.error('[accept] Deposit invoice SMS send failed:', result.error)
      }
    }
  } catch (smsErr) {
    invoiceSmsResult.error =
      smsErr instanceof Error ? smsErr.message : 'unknown deposit sms error'
    console.error('[accept] Deposit invoice SMS pipeline threw:', invoiceSmsResult.error)
  }

  const depositPublicUrl = `https://demandsignals.co/invoice/${depositInvoice.invoice_number}/${depositInvoice.public_uuid}`

  return NextResponse.json({
    accepted: true,
    deposit_invoice: {
      number: depositInvoice.invoice_number,
      amount_cents: depositCents,
      public_url: depositPublicUrl,
      pay_url: `https://demandsignals.co/invoice/${depositInvoice.invoice_number}/${depositInvoice.public_uuid}#pay`,
      email: invoiceEmailResult,
      sms: invoiceSmsResult,
    },
  })
}
