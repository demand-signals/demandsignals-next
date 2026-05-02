// ── payment-plans.ts ────────────────────────────────────────────────
// SOW → Project conversion orchestrator + payment-plan lifecycle.
// See docs/superpowers/specs/2026-04-24-stripe-payment-plans-design.md §7.
//
// Public API:
//   convertSowToProject(sowId, body)        — orchestrator
//   firePaymentInstallment(installmentId)   — fires one row (cash → invoice + Payment Link, TIK → ledger)
//   cascadeOnPayment(installmentId)         — fires dependent on_completion_of_payment rows
//   markInstallmentPaid(installmentId, n)   — updates status (handles partial payments)
//   findInstallmentForInvoice(invoiceId)    — webhook helper

import { supabaseAdmin } from '@/lib/supabase/admin'
import { allocateDocNumber } from '@/lib/doc-numbering'
import type {
  ConvertSowRequest,
  ConvertSowResult,
  ConvertSowPaymentInstallmentSpec,
  ConvertSowSubscriptionSpec,
  PaymentInstallment,
} from './payment-plan-types'
import type { SowPhase, SowPricing } from './invoice-types'

// ── Validation ──────────────────────────────────────────────────────

export class PaymentPlanValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PaymentPlanValidationError'
  }
}

/**
 * Validates that the payment plan is internally consistent.
 * Returns nothing on success; throws PaymentPlanValidationError on failure.
 */
export function validatePaymentPlan(
  plan: ConvertSowPaymentInstallmentSpec[],
  expectedCashTotalCents: number,
  sowPhases: SowPhase[],
): void {
  if (plan.length === 0) {
    throw new PaymentPlanValidationError('Payment plan must have at least one installment')
  }

  const sequences = plan.map((p) => p.sequence)
  const uniqueSeqs = new Set(sequences)
  if (uniqueSeqs.size !== sequences.length) {
    throw new PaymentPlanValidationError('Installment sequences must be unique')
  }

  const phaseIds = new Set<string>()
  for (const phase of sowPhases) phaseIds.add(phase.id)

  let cashSum = 0
  for (const p of plan) {
    if (p.amount_cents <= 0) {
      throw new PaymentPlanValidationError(`Installment ${p.sequence}: amount must be positive`)
    }
    if (p.currency_type === 'cash') cashSum += p.amount_cents

    switch (p.trigger_type) {
      case 'on_acceptance':
        break
      case 'time':
        if (!p.trigger_date) {
          throw new PaymentPlanValidationError(
            `Installment ${p.sequence}: time trigger requires trigger_date`,
          )
        }
        break
      case 'milestone':
        if (!p.trigger_milestone_id) {
          throw new PaymentPlanValidationError(
            `Installment ${p.sequence}: milestone trigger requires trigger_milestone_id`,
          )
        }
        if (!phaseIds.has(p.trigger_milestone_id)) {
          throw new PaymentPlanValidationError(
            `Installment ${p.sequence}: trigger_milestone_id "${p.trigger_milestone_id}" not found in SOW phases`,
          )
        }
        break
      case 'on_completion_of_payment':
        if (typeof p.trigger_payment_sequence !== 'number') {
          throw new PaymentPlanValidationError(
            `Installment ${p.sequence}: on_completion_of_payment trigger requires trigger_payment_sequence`,
          )
        }
        if (!uniqueSeqs.has(p.trigger_payment_sequence)) {
          throw new PaymentPlanValidationError(
            `Installment ${p.sequence}: trigger_payment_sequence ${p.trigger_payment_sequence} not found in plan`,
          )
        }
        if (p.trigger_payment_sequence >= p.sequence) {
          throw new PaymentPlanValidationError(
            `Installment ${p.sequence}: trigger_payment_sequence must reference an earlier sequence`,
          )
        }
        break
    }
  }

  if (cashSum !== expectedCashTotalCents) {
    throw new PaymentPlanValidationError(
      `Cash total mismatch: plan sums to $${(cashSum / 100).toFixed(2)} but expected $${(expectedCashTotalCents / 100).toFixed(2)}`,
    )
  }
}

// ── Orchestrator: convertSowToProject ────────────────────────────────

export async function convertSowToProject(
  sowId: string,
  body: ConvertSowRequest,
): Promise<ConvertSowResult> {
  // 1. Load SOW + prospect
  const { data: sow, error: sowErr } = await supabaseAdmin
    .from('sow_documents')
    .select('*, prospect:prospects(id, business_name, owner_email, owner_phone, client_code, is_client)')
    .eq('id', sowId)
    .single()

  if (sowErr || !sow) {
    throw new Error(`SOW ${sowId} not found: ${sowErr?.message}`)
  }
  if (!sow.prospect_id) {
    throw new Error('SOW has no prospect — cannot convert')
  }

  const isForceMode = body.force === true
  if (['declined', 'void'].includes(sow.status) && !isForceMode) {
    throw new Error(`SOW status is "${sow.status}" — pass force:true to override`)
  }

  // 2. Validate payment plan
  const pricing = sow.pricing as SowPricing
  const phases = (sow.phases ?? []) as SowPhase[]
  const tikCents = body.tik?.amount_cents ?? 0
  const expectedCashTotal = pricing.total_cents - tikCents

  validatePaymentPlan(body.payment_plan, expectedCashTotal, phases)

  // 3. Idempotency: existing schedule?
  const { data: existingSchedule } = await supabaseAdmin
    .from('payment_schedules')
    .select('id, project_id')
    .eq('sow_document_id', sowId)
    .maybeSingle()

  if (existingSchedule && !isForceMode && sow.status === 'accepted') {
    return await buildConversionResult(existingSchedule.id, existingSchedule.project_id)
  }

  // 4. Stamp SOW accepted
  await supabaseAdmin
    .from('sow_documents')
    .update({
      status: 'accepted',
      accepted_at: body.acceptance.accepted_at,
      accepted_signature: body.acceptance.signed_by,
      accepted_ip: null,  // admin-converted
    })
    .eq('id', sowId)

  // 5. Mark prospect as client
  if (!sow.prospect.is_client) {
    await supabaseAdmin
      .from('prospects')
      .update({ is_client: true, became_client_at: new Date().toISOString() })
      .eq('id', sow.prospect_id)
  }

  // 6. Create project (or reuse existing)
  let projectId: string
  const { data: existingProject } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('sow_document_id', sowId)
    .maybeSingle()

  if (existingProject) {
    projectId = existingProject.id
  } else {
    const projectPhases = phases.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      status: 'pending',
      completed_at: null,
      deliverables: (p.deliverables ?? []).map((d) => ({
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

    let monthlyCents = 0
    for (const phase of phases) {
      for (const d of phase.deliverables ?? []) {
        const cents = d.line_total_cents ?? 0
        if (d.cadence === 'monthly') monthlyCents += cents
        else if (d.cadence === 'quarterly') monthlyCents += Math.round(cents / 3)
        else if (d.cadence === 'annual') monthlyCents += Math.round(cents / 12)
      }
    }

    const { data: newProject, error: projErr } = await supabaseAdmin
      .from('projects')
      .insert({
        prospect_id: sow.prospect_id,
        sow_document_id: sowId,
        name: sow.title,
        type: 'website',
        status: 'planning',
        start_date: new Date().toISOString().slice(0, 10),
        target_date: null,
        phases: projectPhases,
        monthly_value: monthlyCents > 0 ? monthlyCents / 100 : null,
        notes: `Auto-created from SOW ${sow.sow_number} via convertSowToProject`,
      })
      .select('id')
      .single()

    if (projErr || !newProject) {
      throw new Error(`Project creation failed: ${projErr?.message}`)
    }
    projectId = newProject.id
  }

  // 7. Create payment schedule + installments
  let scheduleId: string
  if (existingSchedule) {
    scheduleId = existingSchedule.id
    if (!existingSchedule.project_id) {
      await supabaseAdmin
        .from('payment_schedules')
        .update({ project_id: projectId })
        .eq('id', scheduleId)
    }
  } else {
    const { data: newSchedule, error: schedErr } = await supabaseAdmin
      .from('payment_schedules')
      .insert({
        sow_document_id: sowId,
        project_id: projectId,
        total_cents: pricing.total_cents,
      })
      .select('id')
      .single()

    if (schedErr || !newSchedule) {
      throw new Error(`Payment schedule creation failed: ${schedErr?.message}`)
    }
    scheduleId = newSchedule.id

    // 8. Insert installments. First pass: NULL trigger_payment_id.
    //    Second pass: UPDATE to resolve sequence → id mapping.
    const installmentsToInsert = body.payment_plan.map((p) => ({
      schedule_id: scheduleId,
      sequence: p.sequence,
      amount_cents: p.amount_cents,
      currency_type: p.currency_type,
      expected_payment_method: p.expected_payment_method ?? null,
      trigger_type: p.trigger_type,
      trigger_date: p.trigger_type === 'time' ? p.trigger_date ?? null : null,
      trigger_milestone_id:
        p.trigger_type === 'milestone' ? p.trigger_milestone_id ?? null : null,
      trigger_payment_id: null,
      description: p.description ?? null,
      status: 'pending' as const,
    }))

    const { data: insertedRows, error: insErr } = await supabaseAdmin
      .from('payment_installments')
      .insert(installmentsToInsert)
      .select('id, sequence')

    if (insErr || !insertedRows) {
      throw new Error(`Installment insert failed: ${insErr?.message}`)
    }

    const seqToId = new Map<number, string>()
    for (const row of insertedRows) seqToId.set(row.sequence, row.id)

    for (const p of body.payment_plan) {
      if (p.trigger_type === 'on_completion_of_payment' && typeof p.trigger_payment_sequence === 'number') {
        const triggerId = seqToId.get(p.trigger_payment_sequence)
        const rowId = seqToId.get(p.sequence)
        if (!triggerId || !rowId) continue
        await supabaseAdmin
          .from('payment_installments')
          .update({ trigger_payment_id: triggerId })
          .eq('id', rowId)
      }
    }
  }

  // 9. TIK on_acceptance: open ledger immediately
  let tradeCreditId: string | null = null
  if (body.tik && body.tik.trigger_type === 'on_acceptance' && body.tik.amount_cents > 0) {
    const { data: existingTC } = await supabaseAdmin
      .from('trade_credits')
      .select('id')
      .eq('sow_document_id', sowId)
      .maybeSingle()

    if (existingTC) {
      tradeCreditId = existingTC.id
    } else {
      const { data: newTC, error: tcErr } = await supabaseAdmin
        .from('trade_credits')
        .insert({
          prospect_id: sow.prospect_id,
          sow_document_id: sowId,
          original_amount_cents: body.tik.amount_cents,
          remaining_cents: body.tik.amount_cents,
          description: body.tik.description,
          status: 'outstanding',
        })
        .select('id')
        .single()

      if (!tcErr && newTC) {
        tradeCreditId = newTC.id
      } else {
        console.error('[convertSowToProject] TIK ledger insert failed:', tcErr?.message)
      }
    }
  }

  // 10. Fire on_acceptance + backfilled installments
  const { data: allInstallments } = await supabaseAdmin
    .from('payment_installments')
    .select('*')
    .eq('schedule_id', scheduleId)
    .order('sequence', { ascending: true })

  for (const installment of (allInstallments ?? []) as PaymentInstallment[]) {
    if (installment.status !== 'pending') continue

    const spec = body.payment_plan.find((p) => p.sequence === installment.sequence)

    if (spec?.already_paid) {
      await fireBackfilledInstallment(installment, spec, sow)
      continue
    }

    if (installment.trigger_type === 'on_acceptance') {
      await firePaymentInstallment(installment.id, { sow, sendInvoice: body.send_invoices })
    }
  }

  // 11. Subscriptions (Plan C)
  for (const subSpec of body.subscriptions) {
    await createSubscriptionFromSpec(subSpec, sow)
  }

  return await buildConversionResult(scheduleId, projectId)
}

// ── createSubscriptionFromSpec ──────────────────────────────────────
// Creates a DSIG subscription row + (unless already_activated) a real Stripe
// subscription with trial_end and cancel_at as appropriate.
async function createSubscriptionFromSpec(
  subSpec: ConvertSowSubscriptionSpec,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sow: any,
): Promise<void> {
  const { computeEndDate, createStripeSubscription } = await import('./stripe-subscriptions')

  const planId = await findOrCreatePlanForSubscription(subSpec, sow)
  const periodStart = new Date(subSpec.start_date)
  const periodEnd = computeNextPeriodEnd(periodStart, subSpec.interval)

  if (subSpec.already_activated) {
    // Backfill: insert DSIG row only, no Stripe call.
    const endDate = subSpec.cycle_cap
      ? computeEndDate(subSpec.start_date, subSpec.interval, subSpec.cycle_cap)
      : null

    await supabaseAdmin
      .from('subscriptions')
      .insert({
        prospect_id: sow.prospect_id,
        plan_id: planId,
        status: 'active',
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        next_invoice_date: periodEnd.toISOString().slice(0, 10),
        override_monthly_amount_cents: subSpec.amount_cents,
        cycle_cap: subSpec.cycle_cap ?? null,
        end_date: endDate,
        notes: 'Backfilled — already activated, no Stripe linkage',
      })
    return
  }

  // Normal flow: insert DSIG row, then create Stripe subscription.
  const { data: subRow, error: subErr } = await supabaseAdmin
    .from('subscriptions')
    .insert({
      prospect_id: sow.prospect_id,
      plan_id: planId,
      status: 'trialing',  // updated to 'active' once first charge succeeds
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      next_invoice_date: periodEnd.toISOString().slice(0, 10),
      override_monthly_amount_cents: subSpec.amount_cents,
      cycle_cap: subSpec.cycle_cap ?? null,
      notes: `Auto-created from SOW ${sow.sow_number} via convertSowToProject`,
    })
    .select('id')
    .single()

  if (subErr || !subRow) {
    console.error('[createSubscriptionFromSpec] DSIG insert failed:', subErr?.message)
    return
  }

  try {
    const productName = `${sow.title} — recurring (SOW ${sow.sow_number})`
    const result = await createStripeSubscription({
      dsigSubscriptionId: subRow.id,
      prospectId: sow.prospect_id,
      amountCents: subSpec.amount_cents,
      interval: subSpec.interval,
      startDateISO: subSpec.start_date,
      cycleCap: subSpec.cycle_cap,
      productName,
    })

    await supabaseAdmin
      .from('subscriptions')
      .update({
        stripe_subscription_id: result.subscription.id,
        stripe_customer_id: result.customerId,
        end_date: result.endDate,
      })
      .eq('id', subRow.id)
  } catch (stripeErr) {
    console.error('[createSubscriptionFromSpec] Stripe error:', stripeErr)
    await supabaseAdmin
      .from('subscriptions')
      .update({
        notes: `STRIPE ERROR: ${stripeErr instanceof Error ? stripeErr.message : String(stripeErr)}`,
      })
      .eq('id', subRow.id)
  }
}

async function findOrCreatePlanForSubscription(
  spec: ConvertSowSubscriptionSpec,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sow: any,
): Promise<string> {
  const expectedSlug = `sow-${sow.sow_number}-deliv-${spec.deliverable_id.slice(0, 8)}`
  const { data: existing } = await supabaseAdmin
    .from('subscription_plans')
    .select('id')
    .eq('slug', expectedSlug)
    .maybeSingle()

  if (existing) return existing.id

  const intervalMap: Record<string, string> = {
    month: 'month',
    quarter: 'quarter',
    year: 'year',
  }

  const { data: newPlan, error } = await supabaseAdmin
    .from('subscription_plans')
    .insert({
      slug: expectedSlug,
      name: `${sow.title} — recurring`,
      description: `Auto-created from SOW ${sow.sow_number} via convertSowToProject`,
      price_cents: spec.amount_cents,
      billing_interval: intervalMap[spec.interval] ?? 'month',
      active: true,
    })
    .select('id')
    .single()

  if (error || !newPlan) {
    throw new Error(`Plan creation failed: ${error?.message}`)
  }
  return newPlan.id
}

function computeNextPeriodEnd(start: Date, interval: 'month' | 'quarter' | 'year'): Date {
  const end = new Date(start)
  if (interval === 'month') end.setMonth(end.getMonth() + 1)
  else if (interval === 'quarter') end.setMonth(end.getMonth() + 3)
  else if (interval === 'year') end.setFullYear(end.getFullYear() + 1)
  return end
}

// ── Backfill: pre-paid installment ─────────────────────────────────
async function fireBackfilledInstallment(
  installment: PaymentInstallment,
  spec: ConvertSowPaymentInstallmentSpec,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sow: any,
): Promise<void> {
  if (!spec.already_paid) return

  const { invoice } = await generateInvoiceFromInstallment(installment, sow, {
    autoSent: true,
  })

  await supabaseAdmin
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: spec.already_paid.paid_date,
      paid_method: spec.already_paid.paid_method,
      paid_note: spec.already_paid.reference ?? `Backfilled at conversion`,
    })
    .eq('id', invoice.id)

  await supabaseAdmin
    .from('payment_installments')
    .update({
      status: 'paid',
      amount_paid_cents: installment.amount_cents,
      fired_at: new Date().toISOString(),
      invoice_id: invoice.id,
    })
    .eq('id', installment.id)

  if (sow.prospect_id) {
    const { createReceiptForInvoice } = await import('./stripe-sync')
    await createReceiptForInvoice({
      invoiceId: invoice.id,
      prospectId: sow.prospect_id,
      amountCents: installment.amount_cents,
      paymentMethod: spec.already_paid.paid_method,
      paymentReference: spec.already_paid.reference ?? null,
      notes: `Backfilled — paid externally on ${spec.already_paid.paid_date}`,
    })
  }
}

// ── firePaymentInstallment ─────────────────────────────────────────
// Transitions a pending installment into invoice_issued (cash) or
// tik_open (TIK). Idempotent: no-op if status != 'pending'.
export async function firePaymentInstallment(
  installmentId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: { sow?: any; parentInvoice?: any; sendInvoice?: boolean } = {},
): Promise<void> {
  const { data: installment } = await supabaseAdmin
    .from('payment_installments')
    .select('*, schedule:payment_schedules(sow_document_id, project_id, parent_invoice_id)')
    .eq('id', installmentId)
    .single()

  if (!installment || installment.status !== 'pending') return

  // Resolve the parent — either a SOW (Stripe Plan B / SOW conversion
  // path, the original use case) or an invoice (per-invoice payment
  // plan path, migration 042a). The schedule CHECK constraint ensures
  // exactly one parent is set; both null = invariant violation, both
  // set = invariant violation.
  const sowId = installment.schedule?.sow_document_id
  const parentInvoiceId = installment.schedule?.parent_invoice_id

  if (sowId) {
    let sow = options.sow
    if (!sow) {
      const { data: sowRow } = await supabaseAdmin
        .from('sow_documents')
        .select('*, prospect:prospects(*)')
        .eq('id', sowId)
        .single()
      sow = sowRow
    }

    if (installment.currency_type === 'cash') {
      const { invoice } = await generateInvoiceFromInstallment(installment, sow, {
        autoSent: options.sendInvoice ?? false,
      })

      await supabaseAdmin
        .from('payment_installments')
        .update({
          status: 'invoice_issued',
          invoice_id: invoice.id,
          fired_at: new Date().toISOString(),
        })
        .eq('id', installmentId)
    } else if (installment.currency_type === 'tik') {
      const { data: tc } = await supabaseAdmin
        .from('trade_credits')
        .insert({
          prospect_id: sow.prospect_id,
          sow_document_id: sow.id,
          original_amount_cents: installment.amount_cents,
          remaining_cents: installment.amount_cents,
          description: installment.description ?? `TIK installment ${installment.sequence} from SOW ${sow.sow_number}`,
          status: 'outstanding',
        })
        .select('id')
        .single()

      await supabaseAdmin
        .from('payment_installments')
        .update({
          status: 'tik_open',
          trade_credit_id: tc?.id ?? null,
          fired_at: new Date().toISOString(),
        })
        .eq('id', installmentId)
    }
    return
  }

  if (parentInvoiceId) {
    // Per-invoice payment plan (migration 042a). The "parent" here is
    // a regular invoice that's been split into installments; firing
    // generates a child invoice for this slice and links it back.
    let parentInvoice = options.parentInvoice
    if (!parentInvoice) {
      const { data: invRow } = await supabaseAdmin
        .from('invoices')
        .select('*, prospect:prospects(*)')
        .eq('id', parentInvoiceId)
        .single()
      parentInvoice = invRow
    }
    if (!parentInvoice) {
      throw new Error(`Installment ${installmentId} parent_invoice ${parentInvoiceId} not found`)
    }

    if (installment.currency_type === 'cash') {
      const { invoice } = await generateInvoiceFromParentInvoiceInstallment(
        installment,
        parentInvoice,
        { autoSent: options.sendInvoice ?? false },
      )

      await supabaseAdmin
        .from('payment_installments')
        .update({
          status: 'invoice_issued',
          invoice_id: invoice.id,
          fired_at: new Date().toISOString(),
        })
        .eq('id', installmentId)
    } else if (installment.currency_type === 'tik') {
      // TIK installments on an invoice-parented plan: open a trade
      // credit row tied to the prospect (no SOW reference). Same
      // status flip pattern as the SOW path.
      const { data: tc } = await supabaseAdmin
        .from('trade_credits')
        .insert({
          prospect_id: parentInvoice.prospect_id,
          sow_document_id: null,
          original_amount_cents: installment.amount_cents,
          remaining_cents: installment.amount_cents,
          description:
            installment.description ??
            `TIK installment ${installment.sequence} from invoice ${parentInvoice.invoice_number}`,
          status: 'outstanding',
        })
        .select('id')
        .single()

      await supabaseAdmin
        .from('payment_installments')
        .update({
          status: 'tik_open',
          trade_credit_id: tc?.id ?? null,
          fired_at: new Date().toISOString(),
        })
        .eq('id', installmentId)
    }
    return
  }

  throw new Error(`Installment ${installmentId} has no parent (sow_document_id and parent_invoice_id both null)`)
}

// ── generateInvoiceFromInstallment ─────────────────────────────────
export async function generateInvoiceFromInstallment(
  installment: PaymentInstallment,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sow: any,
  options: { autoSent?: boolean } = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ invoice: any }> {
  const now = new Date().toISOString()

  const tempInvNumber = `PENDING-${crypto.randomUUID()}`
  const { data: invoice, error: invErr } = await supabaseAdmin
    .from('invoices')
    .insert({
      invoice_number: tempInvNumber,
      kind: 'business',
      prospect_id: sow.prospect_id,
      quote_session_id: sow.quote_session_id,
      payment_installment_id: installment.id,
      status: 'sent',
      sent_at: options.autoSent ? now : null,
      sent_via_channel: options.autoSent ? 'manual' : null,
      subtotal_cents: installment.amount_cents,
      discount_cents: 0,
      total_due_cents: installment.amount_cents,
      currency: 'USD',
      auto_generated: true,
      auto_trigger: `installment_${installment.trigger_type}`,
      auto_sent: options.autoSent ?? false,
      category_hint: 'service_revenue',
      notes: `${installment.description ?? `Payment ${installment.sequence}`} for SOW ${sow.sow_number} — ${sow.title}`,
      // Discount inheritance (migration 036). Per-installment invoices
      // bill the installment amount which is already a fraction of the
      // post-discount total — copying preserves the audit trail without
      // changing math.
      discount_kind: sow.discount_kind ?? null,
      discount_value_bps: sow.discount_value_bps ?? 0,
      discount_amount_cents: sow.discount_amount_cents ?? 0,
      discount_description: sow.discount_description ?? null,
    })
    .select('*')
    .single()

  if (invErr || !invoice) {
    throw new Error(`Invoice insert failed: ${invErr?.message}`)
  }

  if (sow.prospect_id) {
    try {
      const invNumber = await allocateDocNumber({
        doc_type: 'INV',
        prospect_id: sow.prospect_id,
        ref_table: 'invoices',
        ref_id: invoice.id,
      })
      await supabaseAdmin
        .from('invoices')
        .update({ invoice_number: invNumber })
        .eq('id', invoice.id)
      invoice.invoice_number = invNumber
    } catch (numErr) {
      console.warn('[generateInvoiceFromInstallment] number allocation failed:', numErr)
    }
  }

  const lineItem = {
    invoice_id: invoice.id,
    description: installment.description ?? `Payment ${installment.sequence} for ${sow.title}`,
    quantity: 1,
    unit_price_cents: installment.amount_cents,
    subtotal_cents: installment.amount_cents,
    discount_pct: 0,
    discount_cents: 0,
    line_total_cents: installment.amount_cents,
    sort_order: 0,
  }

  const { error: liErr } = await supabaseAdmin.from('invoice_line_items').insert(lineItem)
  if (liErr) {
    await supabaseAdmin.from('invoices').delete().eq('id', invoice.id)
    throw new Error(`Line item insert failed: ${liErr.message}`)
  }

  // Render + upload the PDF so /api/invoices/public/[number]/pdf serves
  // it. Without this, the magic-link Download PDF button returns
  // "PDF not available" (witnessed on INV-DOCK-042926A — first real
  // SOW conversion). Best-effort: PDF render failure shouldn't unwind
  // the invoice creation (admin can hit "Regenerate PDF" later).
  try {
    const { regenerateInvoicePdf } = await import('./invoice-pdf-regenerate')
    const result = await regenerateInvoicePdf(invoice.id)
    if (!result.ok) {
      console.error('[generateInvoiceFromInstallment] PDF render failed:', result.error)
    }
  } catch (e) {
    console.error('[generateInvoiceFromInstallment] PDF render threw:', e instanceof Error ? e.message : e)
  }

  return { invoice }
}

// ── generateInvoiceFromParentInvoiceInstallment ────────────────────
//
// Per-invoice payment plan path (migration 042a). The parent invoice
// is a regular invoice that's been split into installments. Firing an
// installment generates a CHILD invoice for this slice — same prospect,
// same currency, same Stripe enablement; total = installment.amount_cents.
//
// Mirrors generateInvoiceFromInstallment for the SOW path. Differences:
//   - notes reference the parent invoice number, not a SOW number
//   - quote_session_id is null (no quote session backing)
//   - discount fields copy from the parent invoice instead of a SOW
//   - auto_trigger label is `installment_invoice_${trigger_type}` so
//     audit logs distinguish from SOW-derived installments
//
// We DO NOT touch the parent invoice's status here. The parent stays
// as the full-ledger source of truth ("split into a payment plan");
// each child invoice is its own collection unit. Reconciliation happens
// when each child invoice marks paid → the matching installment flips
// status='paid' via markInstallmentPaid (existing flow).
async function generateInvoiceFromParentInvoiceInstallment(
  installment: PaymentInstallment,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parentInvoice: any,
  options: { autoSent?: boolean } = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ invoice: any }> {
  const now = new Date().toISOString()

  const tempInvNumber = `PENDING-${crypto.randomUUID()}`
  const { data: invoice, error: invErr } = await supabaseAdmin
    .from('invoices')
    .insert({
      invoice_number: tempInvNumber,
      kind: 'business',
      prospect_id: parentInvoice.prospect_id,
      quote_session_id: null,
      payment_installment_id: installment.id,
      status: 'sent',
      sent_at: options.autoSent ? now : null,
      sent_via_channel: options.autoSent ? 'manual' : null,
      subtotal_cents: installment.amount_cents,
      discount_cents: 0,
      total_due_cents: installment.amount_cents,
      currency: 'USD',
      auto_generated: true,
      auto_trigger: `installment_invoice_${installment.trigger_type}`,
      auto_sent: options.autoSent ?? false,
      category_hint: parentInvoice.category_hint ?? 'service_revenue',
      notes:
        installment.description
          ? `${installment.description} (installment ${installment.sequence} of plan for ${parentInvoice.invoice_number})`
          : `Installment ${installment.sequence} of payment plan for ${parentInvoice.invoice_number}`,
      // Inherit document-level discount fields from the parent so the
      // child invoice's audit trail reflects the same agreement.
      discount_kind: parentInvoice.discount_kind ?? null,
      discount_value_bps: parentInvoice.discount_value_bps ?? 0,
      discount_amount_cents: parentInvoice.discount_amount_cents ?? 0,
      discount_description: parentInvoice.discount_description ?? null,
    })
    .select('*')
    .single()

  if (invErr || !invoice) {
    throw new Error(`Child invoice insert failed: ${invErr?.message}`)
  }

  if (parentInvoice.prospect_id) {
    try {
      const invNumber = await allocateDocNumber({
        doc_type: 'INV',
        prospect_id: parentInvoice.prospect_id,
        ref_table: 'invoices',
        ref_id: invoice.id,
      })
      await supabaseAdmin
        .from('invoices')
        .update({ invoice_number: invNumber })
        .eq('id', invoice.id)
      invoice.invoice_number = invNumber
    } catch (numErr) {
      console.warn('[generateInvoiceFromParentInvoiceInstallment] number allocation failed:', numErr)
    }
  }

  const lineItem = {
    invoice_id: invoice.id,
    description:
      installment.description ?? `Installment ${installment.sequence} of payment plan`,
    quantity: 1,
    unit_price_cents: installment.amount_cents,
    subtotal_cents: installment.amount_cents,
    discount_pct: 0,
    discount_cents: 0,
    line_total_cents: installment.amount_cents,
    sort_order: 0,
  }

  const { error: liErr } = await supabaseAdmin.from('invoice_line_items').insert(lineItem)
  if (liErr) {
    await supabaseAdmin.from('invoices').delete().eq('id', invoice.id)
    throw new Error(`Line item insert failed: ${liErr.message}`)
  }

  // Render PDF best-effort. Same pattern as the SOW path — magic-link
  // Download PDF won't work without it.
  try {
    const { regenerateInvoicePdf } = await import('./invoice-pdf-regenerate')
    const result = await regenerateInvoicePdf(invoice.id)
    if (!result.ok) {
      console.error('[generateInvoiceFromParentInvoiceInstallment] PDF render failed:', result.error)
    }
  } catch (e) {
    console.error('[generateInvoiceFromParentInvoiceInstallment] PDF render threw:', e instanceof Error ? e.message : e)
  }

  return { invoice }
}

// ── findInstallmentForInvoice ──────────────────────────────────────
export async function findInstallmentForInvoice(
  invoiceId: string,
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('payment_installments')
    .select('id')
    .eq('invoice_id', invoiceId)
    .maybeSingle()
  return data?.id ?? null
}

// ── markInstallmentPaid ────────────────────────────────────────────
export async function markInstallmentPaid(
  installmentId: string,
  amountReceivedCents: number,
): Promise<{ newStatus: 'paid' | 'partially_paid' | 'invoice_issued'; cascadeFired: boolean }> {
  const { data: row } = await supabaseAdmin
    .from('payment_installments')
    .select('id, amount_cents, amount_paid_cents, status, schedule_id')
    .eq('id', installmentId)
    .single()

  if (!row) return { newStatus: 'invoice_issued', cascadeFired: false }
  if (row.status === 'paid') return { newStatus: 'paid', cascadeFired: false }

  const newPaidTotal = row.amount_paid_cents + amountReceivedCents
  const newStatus: 'paid' | 'partially_paid' =
    newPaidTotal >= row.amount_cents ? 'paid' : 'partially_paid'

  await supabaseAdmin
    .from('payment_installments')
    .update({ amount_paid_cents: newPaidTotal, status: newStatus })
    .eq('id', installmentId)

  if (newStatus === 'paid') {
    await supabaseAdmin
      .from('payment_schedules')
      .update({ locked_at: new Date().toISOString() })
      .eq('id', row.schedule_id)
      .is('locked_at', null)
  }

  let cascadeFired = false
  if (newStatus === 'paid') {
    cascadeFired = await cascadeOnPayment(installmentId)
  }

  return { newStatus, cascadeFired }
}

// ── cascadeOnPayment ────────────────────────────────────────────────
export async function cascadeOnPayment(triggerInstallmentId: string): Promise<boolean> {
  const { data: dependents } = await supabaseAdmin
    .from('payment_installments')
    .select('id')
    .eq('trigger_payment_id', triggerInstallmentId)
    .eq('status', 'pending')

  if (!dependents || dependents.length === 0) return false

  for (const dep of dependents) {
    try {
      await firePaymentInstallment(dep.id, { sendInvoice: true })
    } catch (e) {
      console.error('[cascadeOnPayment] failed to fire dependent', dep.id, e)
    }
  }
  return true
}

// ── buildConversionResult ─────────────────────────────────────────
async function buildConversionResult(
  scheduleId: string,
  projectId: string | null,
): Promise<ConvertSowResult> {
  const { data: schedule } = await supabaseAdmin
    .from('payment_schedules')
    .select('id, project_id, sow_document_id')
    .eq('id', scheduleId)
    .single()

  const { data: installments } = await supabaseAdmin
    .from('payment_installments')
    .select('id, sequence, status, invoice_id, invoice:invoices!payment_installments_invoice_id_fkey(invoice_number, public_uuid)')
    .eq('schedule_id', scheduleId)
    .order('sequence', { ascending: true })

  let subs: Array<{ id: string; stripe_subscription_id: string | null; status: string }> = []
  let tradeCreditId: string | null = null

  if (schedule?.sow_document_id) {
    const { data: sowRow } = await supabaseAdmin
      .from('sow_documents')
      .select('prospect_id')
      .eq('id', schedule.sow_document_id)
      .single()

    const { data: tc } = await supabaseAdmin
      .from('trade_credits')
      .select('id')
      .eq('sow_document_id', schedule.sow_document_id)
      .limit(1)
    tradeCreditId = tc?.[0]?.id ?? null

    if (sowRow?.prospect_id) {
      const { data: subRows } = await supabaseAdmin
        .from('subscriptions')
        .select('id, stripe_subscription_id, status')
        .eq('prospect_id', sowRow.prospect_id)
        .order('created_at', { ascending: false })
        .limit(20)
      subs = subRows ?? []
    }
  }

  return {
    project_id: schedule?.project_id ?? projectId ?? '',
    payment_schedule_id: scheduleId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    installments: (installments ?? []).map((row: any) => ({
      id: row.id,
      sequence: row.sequence,
      status: row.status,
      invoice_id: row.invoice_id,
      invoice_number: row.invoice?.invoice_number ?? null,
      public_url: row.invoice?.invoice_number && row.invoice?.public_uuid
        ? `https://demandsignals.co/invoice/${row.invoice.invoice_number}/${row.invoice.public_uuid}`
        : null,
    })),
    subscriptions: subs,
    trade_credit_id: tradeCreditId,
  }
}
