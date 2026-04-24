// ── POST /api/sow/public/[number]/accept ────────────────────────────
// Client-side SOW acceptance. Client POSTs their typed signature name.
// We:
//   1. Transition SOW: sent/viewed → accepted, stamp accepted_at/signature/ip
//   2. Auto-generate the deposit invoice (25% by default, per pricing.deposit_cents)
//   3. Link deposit_invoice_id back on the SOW row
//   4. Return the deposit invoice's public URL so client can pay immediately

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { allocateDocNumber } from '@/lib/doc-numbering'
import { getValueStackItems } from '@/lib/services-catalog'
import type { SowPricing, SowPhase } from '@/lib/invoice-types'

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
  if (sow.prospect_id) {
    try {
      const invNumber = await allocateDocNumber({
        doc_type: 'INV',
        prospect_id: sow.prospect_id,
        ref_table: 'invoices',
        ref_id: depositInvoice.id,
      })
      await supabaseAdmin
        .from('invoices')
        .update({ invoice_number: invNumber })
        .eq('id', depositInvoice.id)
      depositInvoice.invoice_number = invNumber
    } catch (numErr) {
      // Prospect may not yet have a client_code. Fall back to legacy number.
      console.warn('[accept] New-format numbering failed, falling back:', numErr instanceof Error ? numErr.message : numErr)
      const { data: legacyNum } = await supabaseAdmin.rpc('generate_invoice_number')
      if (legacyNum) {
        await supabaseAdmin
          .from('invoices')
          .update({ invoice_number: legacyNum })
          .eq('id', depositInvoice.id)
        depositInvoice.invoice_number = legacyNum
      }
      // If legacy also fails, the PENDING number stays — visible in admin, fixable manually.
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
    lineItems.push({
      invoice_id: depositInvoice.id,
      description: 'New Client Appreciation — included with your engagement',
      quantity: 1,
      unit_price_cents: -valueStackSubtotalCents,
      subtotal_cents: -valueStackSubtotalCents,
      discount_pct: 0,
      discount_cents: 0,
      discount_label: 'New Client Appreciation',
      line_total_cents: -valueStackSubtotalCents,
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

  const depositPublicUrl = `https://demandsignals.co/invoice/${depositInvoice.invoice_number}/${depositInvoice.public_uuid}`

  return NextResponse.json({
    accepted: true,
    deposit_invoice: {
      number: depositInvoice.invoice_number,
      amount_cents: depositCents,
      public_url: depositPublicUrl,
      pay_url: `https://demandsignals.co/invoice/${depositInvoice.invoice_number}/${depositInvoice.public_uuid}#pay`,
    },
  })
}
