// ── retainer-automation.ts ────────────────────────────────────────────────
// Depletion lifecycle for retainer ledgers:
//   • ≥ notify_pct depleted  → notify the client (email, no invoice)
//   • ≥ reup_pct depleted    → auto-DRAFT a replenish invoice + alert admin
//                              (admin reviews + sends; never auto-sent)
//   • balance restored on paid replenish → thresholds reset for the new cycle
//
// Depletion is measured against the CURRENT CYCLE's high-water mark, not
// lifetime totals — so a client who has re-upped several times reads their
// current-pool depletion, not cumulative. High-water = current balance +
// approved debits since the most recent approved credit.
//
// Runs from a cron (evaluateAllLedgers) and can also be called after a single
// posting. Honors the quote_config['retainer_automation_enabled'] kill switch.
//
// Spec: docs/superpowers/specs/2026-07-16-retainer-ledger-design.md §5

import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { notify } from '@/lib/system-alerts'
import { allocateDocNumber } from '@/lib/doc-numbering'
import type { RetainerLedger } from './retainer-types'

async function automationEnabled(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('quote_config')
    .select('value')
    .eq('key', 'retainer_automation_enabled')
    .maybeSingle()
  return data?.value === true || data?.value === 'true'
}

/**
 * Current-cycle depletion percent (0–100+). High-water = current balance +
 * approved debits since the most recent approved credit. Returns 0 when the
 * pool has never been funded.
 */
export async function cycleDepletion(ledger: RetainerLedger): Promise<{
  pct: number
  peak_cents: number
  since_credit_debits: number
}> {
  // Most recent approved credit timestamp.
  const { data: lastCredit } = await supabaseAdmin
    .from('retainer_transactions')
    .select('approved_at')
    .eq('ledger_id', ledger.id)
    .eq('direction', 'credit')
    .eq('status', 'approved')
    .order('approved_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Approved debits since that credit (or all-time if never credited).
  let q = supabaseAdmin
    .from('retainer_transactions')
    .select('amount_cents')
    .eq('ledger_id', ledger.id)
    .eq('direction', 'debit')
    .eq('status', 'approved')
  if (lastCredit?.approved_at) q = q.gt('approved_at', lastCredit.approved_at)
  const { data: debits } = await q
  const sinceCreditDebits = (debits ?? []).reduce((s, d) => s + (d.amount_cents ?? 0), 0)

  const peak = ledger.balance_cents + sinceCreditDebits
  const pct = peak > 0 ? Math.min(100, Math.round((sinceCreditDebits / peak) * 100)) : 0
  return { pct, peak_cents: peak, since_credit_debits: sinceCreditDebits }
}

interface EvalResult {
  prospect_id: string
  pct: number
  action: 'none' | 'notified' | 'reup_drafted' | 'skipped_dedup'
  detail?: string
}

/**
 * Evaluate one ledger and fire the appropriate threshold action. Idempotent
 * within a cycle: last_notified_at / last_reup_drafted_at are stamped so a
 * repeated run does not re-notify or re-draft until the next credit resets them.
 */
export async function evaluateLedger(ledger: RetainerLedger): Promise<EvalResult> {
  if (ledger.status !== 'active') return { prospect_id: ledger.prospect_id, pct: 0, action: 'none' }

  const { pct } = await cycleDepletion(ledger)

  // ── Re-up threshold (higher) takes precedence ──
  if (pct >= ledger.reup_pct && ledger.auto_reup_enabled) {
    if (ledger.last_reup_drafted_at) {
      return { prospect_id: ledger.prospect_id, pct, action: 'skipped_dedup', detail: 'reup already drafted this cycle' }
    }
    const detail = await draftReupInvoice(ledger, pct)
    return { prospect_id: ledger.prospect_id, pct, action: 'reup_drafted', detail }
  }

  // ── Notify threshold ──
  if (pct >= ledger.notify_pct) {
    if (ledger.last_notified_at) {
      return { prospect_id: ledger.prospect_id, pct, action: 'skipped_dedup', detail: 'already notified this cycle' }
    }
    await notifyClientLowBalance(ledger, pct)
    return { prospect_id: ledger.prospect_id, pct, action: 'notified' }
  }

  return { prospect_id: ledger.prospect_id, pct, action: 'none' }
}

/** Sweep all active ledgers (cron entry point). */
export async function evaluateAllLedgers(): Promise<{ enabled: boolean; results: EvalResult[] }> {
  if (!(await automationEnabled())) return { enabled: false, results: [] }
  const { data: ledgers } = await supabaseAdmin
    .from('retainer_ledgers')
    .select('*')
    .eq('status', 'active')
  const results: EvalResult[] = []
  for (const l of (ledgers ?? []) as RetainerLedger[]) {
    try {
      results.push(await evaluateLedger(l))
    } catch (e) {
      results.push({
        prospect_id: l.prospect_id,
        pct: 0,
        action: 'none',
        detail: `error: ${e instanceof Error ? e.message : 'unknown'}`,
      })
    }
  }
  return { enabled: true, results }
}

// ── Actions ────────────────────────────────────────────────────────────────

async function notifyClientLowBalance(ledger: RetainerLedger, pct: number): Promise<void> {
  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('business_name, email, contact_name')
    .eq('id', ledger.prospect_id)
    .maybeSingle()

  const balance = (ledger.balance_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

  if (prospect?.email) {
    const greeting = prospect.contact_name || prospect.business_name || 'there'
    await sendEmail({
      to: prospect.email,
      kind: 'system_alert',
      subject: `Your Demand Signals retainer is running low`,
      html:
        `<p>Hi ${greeting},</p>` +
        `<p>A quick heads-up: your retainer balance is at <strong>${balance}</strong> (${pct}% used this cycle). ` +
        `To keep work moving without interruption, we'll send a replenishment invoice as the ` +
        `balance approaches empty. No action is needed right now.</p>` +
        `<p>— Demand Signals</p>`,
      text:
        `Hi ${greeting},\n\n` +
        `A quick heads-up: your retainer balance is at ${balance} (${pct}% used this cycle). ` +
        `To keep work moving without interruption, we'll send a replenishment invoice as the ` +
        `balance approaches empty. No action is needed right now.\n\n` +
        `— Demand Signals`,
    }).catch((e) => {
      // best-effort — a notify failure must not block the cron sweep
      void notify({
        severity: 'warning',
        source: 'retainer',
        title: 'retainer low-balance notify email failed',
        body: `prospect ${ledger.prospect_id}: ${e?.message ?? e}`,
      })
    })
  }

  await supabaseAdmin
    .from('retainer_ledgers')
    .update({ last_notified_at: new Date().toISOString() })
    .eq('id', ledger.id)
}

async function draftReupInvoice(ledger: RetainerLedger, pct: number): Promise<string> {
  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('business_name, client_code')
    .eq('id', ledger.prospect_id)
    .maybeSingle()

  // Amount: explicit target, else the size of the most recent credit, else a
  // sensible default of the peak cycle amount.
  let amount = ledger.reup_target_cents ?? 0
  if (!amount) {
    const { data: lastCredit } = await supabaseAdmin
      .from('retainer_transactions')
      .select('amount_cents')
      .eq('ledger_id', ledger.id)
      .eq('direction', 'credit')
      .eq('status', 'approved')
      .order('approved_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    amount = lastCredit?.amount_cents ?? 0
  }
  // Always stamp the dedup flag so a failure/no-amount case doesn't re-loop.
  const stampDedup = () =>
    supabaseAdmin
      .from('retainer_ledgers')
      .update({ last_reup_drafted_at: new Date().toISOString() })
      .eq('id', ledger.id)

  if (amount <= 0) {
    await stampDedup()
    await notify({
      severity: 'warning',
      source: 'retainer',
      title: 'retainer re-up has no amount',
      body: `${prospect?.business_name ?? ledger.prospect_id} hit ${pct}% but has no re-up amount (set reup_target_cents or fund once).`,
    })
    return 'no re-up amount configured — admin alerted'
  }

  // Create a DRAFT invoice first (never auto-sent), then allocate its INV
  // number with the row id as ref_id (allocateDocNumber requires ref_id).
  // invoice_number is NOT NULL with no column default — insert a temp
  // placeholder (mirrors the invoice-create route), then overwrite below.
  const tempNumber = `PENDING-${crypto.randomUUID()}`
  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .insert({
      invoice_number: tempNumber,
      kind: 'business',
      prospect_id: ledger.prospect_id,
      status: 'draft',
      subtotal_cents: amount,
      total_due_cents: amount,
      currency: 'USD',
      category_hint: 'service_revenue',
      auto_generated: true,
      auto_trigger: 'retainer_reup',
      notes: `Retainer replenishment — balance hit ${pct}% depletion.`,
    })
    .select('id, invoice_number')
    .single()

  await stampDedup()

  if (error || !invoice) {
    await notify({
      severity: 'error',
      source: 'retainer',
      title: 'retainer re-up invoice draft failed',
      body: `${ledger.prospect_id}: ${error?.message ?? 'insert returned no row'}`,
    })
    return `draft failed: ${error?.message ?? 'no row'}`
  }

  // Allocate a proper INV-CLIENT-MMDDYY number now that the row exists.
  let invNumber = invoice.invoice_number as string | null
  if (prospect?.client_code) {
    try {
      invNumber = await allocateDocNumber({
        doc_type: 'INV',
        prospect_id: ledger.prospect_id,
        ref_table: 'invoices',
        ref_id: invoice.id,
      })
      await supabaseAdmin.from('invoices').update({ invoice_number: invNumber }).eq('id', invoice.id)
    } catch {
      // legacy generate_invoice_number fallback already ran on insert; keep it
    }
  }

  await notify({
    severity: 'info',
    source: 'retainer',
    title: 'retainer re-up invoice drafted',
    body: `Draft replenishment invoice ${invNumber ?? invoice.id} created for ${prospect?.business_name ?? ledger.prospect_id} ($${(amount / 100).toFixed(0)}, ${pct}% depleted). Review + send in the admin invoices list.`,
  })
  return `drafted ${invNumber ?? invoice.id}`
}

/**
 * Called when a replenish invoice is PAID → post an approved credit to the
 * ledger and reset the cycle thresholds. Wired from the invoice mark-paid path.
 * Idempotent: skips if a credit for this invoice already exists.
 */
export async function creditFromPaidReupInvoice(invoiceId: string): Promise<boolean> {
  const { data: invoice } = await supabaseAdmin
    .from('invoices')
    .select('id, prospect_id, total_due_cents, auto_trigger, invoice_number')
    .eq('id', invoiceId)
    .maybeSingle()
  if (!invoice || invoice.auto_trigger !== 'retainer_reup') return false

  const { data: ledger } = await supabaseAdmin
    .from('retainer_ledgers')
    .select('id')
    .eq('prospect_id', invoice.prospect_id)
    .maybeSingle()
  if (!ledger) return false

  // Idempotency: one credit per invoice.
  const { data: existing } = await supabaseAdmin
    .from('retainer_transactions')
    .select('id')
    .eq('invoice_id', invoiceId)
    .eq('direction', 'credit')
    .maybeSingle()
  if (existing) return false

  const now = new Date().toISOString()
  await supabaseAdmin.from('retainer_transactions').insert({
    ledger_id: ledger.id,
    prospect_id: invoice.prospect_id,
    direction: 'credit',
    status: 'approved',
    amount_cents: invoice.total_due_cents,
    source: 'replenish_invoice',
    invoice_id: invoiceId,
    description: `Retainer replenishment (${invoice.invoice_number})`,
    approved_by: 'system',
    approved_at: now,
  })

  // Reset cycle thresholds so notify/re-up can fire again next cycle.
  await supabaseAdmin
    .from('retainer_ledgers')
    .update({ last_notified_at: null, last_reup_drafted_at: null })
    .eq('id', ledger.id)

  return true
}
