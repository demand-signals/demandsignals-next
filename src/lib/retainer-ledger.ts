// ── retainer-ledger.ts ────────────────────────────────────────────────────
// Core retainer ledger operations ("bill like attorneys"). One prepaid
// balance per client; work draws it down via admin-approved debits.
//
// Schema: supabase/migrations/059_retainer_ledger.sql
// Spec:   docs/superpowers/specs/2026-07-16-retainer-ledger-design.md
// Types:  retainer-types.ts
//
// INVARIANT (enforced by recomputeBalance): the authoritative balance is
//   SUM(approved credits) − SUM(approved debits).
// balance_cents on the ledger row is a CACHE, rewritten on every posting.
// pending / waived / void transactions NEVER affect the balance.
//
// Retainer is OPT-IN: getLedger() returns null when the client has no ledger,
// and callers (e.g. the handoff hook) must no-op in that case so non-retainer
// clients keep today's behavior.

import { supabaseAdmin } from '@/lib/supabase/admin'
import type {
  RetainerLedger,
  RetainerTransaction,
  RetainerTxDirection,
  RetainerTxSource,
  RetainerSummary,
  ThresholdState,
  RateCardRole,
} from './retainer-types'

// Select '*' (a string LITERAL) rather than a concatenated column list —
// Supabase's typegen can only infer the row shape from a literal, and a
// runtime-built string collapses `data` to GenericStringError, breaking the
// `as RetainerLedger` cast (caught by Vercel's strict build, not local
// tsc --skipLibCheck). All ledger columns are wanted anyway.
const LEDGER_COLS = '*'

const DEFAULT_HOURLY_RATE_CENTS = 20000 // fallback if quote_config unreadable

// ── Rate card ──────────────────────────────────────────────────────────────

/** All active roles, ordered for display. Source of truth for human rates. */
export async function getRateCardRoles(): Promise<RateCardRole[]> {
  const { data, error } = await supabaseAdmin
    .from('rate_card_roles')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(`getRateCardRoles: ${error.message}`)
  return (data as RateCardRole[]) ?? []
}

/** Resolve a role key → its hourly rate in cents. Null if unknown/inactive. */
export async function rateForRole(roleKey: string): Promise<number | null> {
  const { data } = await supabaseAdmin
    .from('rate_card_roles')
    .select('hourly_rate_cents')
    .eq('key', roleKey)
    .eq('active', true)
    .maybeSingle()
  return data?.hourly_rate_cents ?? null
}

/**
 * Fallback hourly rate when NO role is chosen: per-client ledger override,
 * else the platform default in quote_config, else a hard fallback. This is
 * only used for manual/legacy paths — the primary flow resolves the rate
 * from the role the admin picks at approval (rateForRole).
 */
export async function resolveHourlyRateCents(ledger: RetainerLedger): Promise<number> {
  if (ledger.hourly_rate_cents != null) return ledger.hourly_rate_cents
  const { data } = await supabaseAdmin
    .from('quote_config')
    .select('value')
    .eq('key', 'retainer_default_hourly_rate_cents')
    .maybeSingle()
  // JSONB numeric may deserialize as number or numeric-string — tolerate both.
  const v = data?.value
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_HOURLY_RATE_CENTS
}

// ── Ledger lookup / creation ──────────────────────────────────────────────

/** Fetch a client's ledger, or null if they have no retainer (opt-in). */
export async function getLedger(prospectId: string): Promise<RetainerLedger | null> {
  const { data, error } = await supabaseAdmin
    .from('retainer_ledgers')
    .select(LEDGER_COLS)
    .eq('prospect_id', prospectId)
    .maybeSingle()
  if (error) throw new Error(`getLedger: ${error.message}`)
  return (data as RetainerLedger) ?? null
}

/**
 * Get the client's ledger, creating it if absent. Use this at the point a
 * retainer engagement begins (SOW accept, admin "open retainer"). Do NOT
 * call it from the handoff hook — that path must remain opt-in via getLedger.
 */
export async function getOrCreateLedger(
  prospectId: string,
  opts?: { notify_pct?: number; reup_pct?: number },
): Promise<RetainerLedger> {
  const existing = await getLedger(prospectId)
  if (existing) return existing

  const { data, error } = await supabaseAdmin
    .from('retainer_ledgers')
    .insert({
      prospect_id: prospectId,
      notify_pct: opts?.notify_pct ?? 75,
      reup_pct: opts?.reup_pct ?? 90,
    })
    .select(LEDGER_COLS)
    .single()
  // Handle the race where two callers insert at once (UNIQUE prospect_id):
  // re-read rather than fail.
  if (error) {
    const again = await getLedger(prospectId)
    if (again) return again
    throw new Error(`getOrCreateLedger: ${error.message}`)
  }
  return data as RetainerLedger
}

// ── Balance recompute (the invariant) ─────────────────────────────────────

/**
 * Recompute balance_cents + lifetime_* from the authoritative transaction set
 * (approved rows only) and write the cache. Returns the fresh ledger.
 * Every posting/approval/waive/void MUST call this so the cache never drifts.
 */
export async function recomputeBalance(ledgerId: string): Promise<RetainerLedger> {
  const { data: txns, error } = await supabaseAdmin
    .from('retainer_transactions')
    .select('direction, status, amount_cents')
    .eq('ledger_id', ledgerId)
  if (error) throw new Error(`recomputeBalance: ${error.message}`)

  let credited = 0
  let debited = 0
  for (const t of txns ?? []) {
    if (t.status !== 'approved') continue // pending / waived / void never count
    if (t.direction === 'credit') credited += t.amount_cents
    else debited += t.amount_cents
  }

  const { data: updated, error: uErr } = await supabaseAdmin
    .from('retainer_ledgers')
    .update({
      balance_cents: credited - debited,
      lifetime_credited_cents: credited,
      lifetime_debited_cents: debited,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ledgerId)
    .select(LEDGER_COLS)
    .single()
  if (uErr) throw new Error(`recomputeBalance update: ${uErr.message}`)
  return updated as RetainerLedger
}

// ── Posting transactions ──────────────────────────────────────────────────

export interface PostTxInput {
  ledger_id: string
  prospect_id: string
  project_id?: string | null
  direction: RetainerTxDirection
  amount_cents: number
  source: RetainerTxSource
  description: string
  hours?: number | null
  role?: string | null
  time_entry_id?: string | null
  invoice_id?: string | null
  /** Post directly as approved (credits from paid money). Default: pending. */
  approved?: boolean
  actor?: string | null // email of the admin / 'system'
}

/**
 * Insert a transaction. Debits default to 'pending' (admin must approve).
 * Credits from real money (paid replenish invoice, manual check) pass
 * approved=true. Recomputes the balance when the row lands approved.
 *
 * Idempotency: the partial unique index on time_entry_id (WHERE status<>'void')
 * means a duplicate handoff debit throws — caught here and returned as the
 * existing row instead of erroring, so handoff sync is safe to re-run.
 */
export async function postTransaction(input: PostTxInput): Promise<RetainerTransaction> {
  const now = new Date().toISOString()
  const approved = input.approved === true
  const row: Record<string, unknown> = {
    ledger_id: input.ledger_id,
    prospect_id: input.prospect_id,
    project_id: input.project_id ?? null,
    direction: input.direction,
    status: approved ? 'approved' : 'pending',
    amount_cents: input.amount_cents,
    source: input.source,
    description: input.description,
    hours: input.hours ?? null,
    role: input.role ?? null,
    time_entry_id: input.time_entry_id ?? null,
    invoice_id: input.invoice_id ?? null,
    created_by: input.actor ?? null,
  }
  if (approved) {
    row.approved_by = input.actor ?? 'system'
    row.approved_at = now
  }

  const { data, error } = await supabaseAdmin
    .from('retainer_transactions')
    .insert(row)
    .select('*')
    .single()

  if (error) {
    // Idempotent handoff: a live debit already exists for this time entry.
    // 23505 = unique_violation (the uniq_retainer_tx_time_entry_live index).
    // Match on the Postgres code — message text is not stable. Mirrors the
    // convention in email-engagement.ts.
    if (input.time_entry_id && error.code === '23505') {
      const { data: existing } = await supabaseAdmin
        .from('retainer_transactions')
        .select('*')
        .eq('time_entry_id', input.time_entry_id)
        .neq('status', 'void')
        .maybeSingle()
      if (existing) return existing as RetainerTransaction
    }
    throw new Error(`postTransaction: ${error.message}`)
  }

  if (approved) await recomputeBalance(input.ledger_id)
  return data as RetainerTransaction
}

// ── Admin actions on a pending debit ──────────────────────────────────────

async function transitionTx(
  txId: string,
  patch: Record<string, unknown>,
  requireFromPending = true,
): Promise<RetainerTransaction> {
  const { data: tx, error: fErr } = await supabaseAdmin
    .from('retainer_transactions')
    .select('*')
    .eq('id', txId)
    .single()
  if (fErr || !tx) throw new Error(`transitionTx: transaction ${txId} not found`)
  if (requireFromPending && tx.status !== 'pending') {
    throw new Error(`transitionTx: expected pending, got '${tx.status}'`)
  }

  const { data: updated, error: uErr } = await supabaseAdmin
    .from('retainer_transactions')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', txId)
    .select('*')
    .single()
  if (uErr) throw new Error(`transitionTx update: ${uErr.message}`)

  // Any status change touching approved-ness must recompute.
  await recomputeBalance(tx.ledger_id)
  return updated as RetainerTransaction
}

/**
 * Approve a pending debit → it draws down the balance.
 *
 * Role pricing: when a `role` is provided (the normal handoff path), the human
 * portion is (re)priced from the rate card at approval time:
 *     amount = round(hours × rate_card_roles[role].rate) + llm_baseline_cents
 * where llm_baseline_cents is the LLM-only amount captured at accrual (stored
 * as amount_cents while the row was role-less). If the admin passes an explicit
 * amount_cents, that wins (manual override). If no role and no override, the
 * existing amount stands (e.g. manual debits already priced).
 */
export async function approveTransaction(
  txId: string,
  actor: string,
  edits?: {
    amount_cents?: number
    hours?: number | null
    description?: string
    role?: string | null
    /** LLM-only baseline to add on top of human hours × rate. Defaults to the
     *  row's current amount_cents when the row is still role-less. */
    llm_baseline_cents?: number
  },
): Promise<RetainerTransaction> {
  const { data: tx } = await supabaseAdmin
    .from('retainer_transactions')
    .select('amount_cents, hours, role, direction')
    .eq('id', txId)
    .single()

  const patch: Record<string, unknown> = {
    status: 'approved',
    approved_by: actor,
    approved_at: new Date().toISOString(),
  }
  if (edits?.description != null) patch.description = edits.description
  if (edits?.hours !== undefined) patch.hours = edits.hours

  const hours = edits?.hours !== undefined ? Number(edits.hours ?? 0) : Number(tx?.hours ?? 0)

  if (edits?.amount_cents != null) {
    // Explicit manual override wins.
    patch.amount_cents = Math.round(edits.amount_cents)
    if (edits.role !== undefined) patch.role = edits.role
  } else if (edits?.role) {
    // Price human hours from the rate card + add the LLM baseline.
    const rate = await rateForRole(edits.role)
    if (rate == null) throw new Error(`approveTransaction: unknown role '${edits.role}'`)
    // If the row was role-less, its amount_cents IS the LLM-only baseline.
    const llmBaseline =
      edits.llm_baseline_cents ?? (tx?.role == null ? Number(tx?.amount_cents ?? 0) : 0)
    patch.role = edits.role
    patch.amount_cents = Math.round(hours * rate) + llmBaseline
  }
  // else: no role, no override → keep existing amount_cents.

  if (patch.amount_cents != null && (patch.amount_cents as number) <= 0) {
    throw new Error('approveTransaction: approved amount must be > 0 (set a role or amount)')
  }

  return transitionTx(txId, patch)
}

/** Waive a pending debit ("on our dime") → logged, never charged. */
export async function waiveTransaction(
  txId: string,
  actor: string,
  reason: string,
): Promise<RetainerTransaction> {
  return transitionTx(txId, {
    status: 'waived',
    waived_by: actor,
    waived_at: new Date().toISOString(),
    waive_reason: reason,
  })
}

/**
 * Void a transaction (wrong/duplicate entry). Allowed from any status — voiding
 * an already-approved debit restores the balance (recompute handles it).
 */
export async function voidTransaction(
  txId: string,
  actor: string,
  reason: string,
): Promise<RetainerTransaction> {
  return transitionTx(
    txId,
    {
      status: 'void',
      voided_by: actor,
      voided_at: new Date().toISOString(),
      void_reason: reason,
    },
    false, // any status → void
  )
}

// ── Threshold evaluation ──────────────────────────────────────────────────

/**
 * Percent depleted of the current retainer size. "Size" = the high-water mark
 * for this cycle = balance + debited-since-last-credit-cycle. We approximate
 * cleanly as lifetime_credited − (lifetime_credited − lifetime_debited)... but
 * the simplest robust measure the UI wants is: how much of what's been funded
 * is now spent. We use funded = lifetime_credited_cents; spent = lifetime_debited_cents.
 * pct = spent / funded. When nothing funded yet, 0.
 */
export function pctDepleted(ledger: RetainerLedger): number {
  if (ledger.lifetime_credited_cents <= 0) return 0
  return Math.min(
    100,
    Math.round((ledger.lifetime_debited_cents / ledger.lifetime_credited_cents) * 100),
  )
}

/** Which threshold the ledger currently sits at. */
export function thresholdState(ledger: RetainerLedger): ThresholdState {
  const pct = pctDepleted(ledger)
  if (pct >= ledger.reup_pct) return 'reup'
  if (pct >= ledger.notify_pct) return 'notify'
  return 'ok'
}

// ── Read model for admin UI ───────────────────────────────────────────────

export async function getRetainerSummary(prospectId: string): Promise<RetainerSummary | null> {
  const ledger = await getLedger(prospectId)
  if (!ledger) return null

  const { data: pending } = await supabaseAdmin
    .from('retainer_transactions')
    .select('*')
    .eq('ledger_id', ledger.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const { data: history } = await supabaseAdmin
    .from('retainer_transactions')
    .select('*')
    .eq('ledger_id', ledger.id)
    .neq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(200)

  return {
    ledger,
    pending: (pending as RetainerTransaction[]) ?? [],
    history: (history as RetainerTransaction[]) ?? [],
    pct_depleted: pctDepleted(ledger),
  }
}

// ── Handoff accrual hook (opt-in, best-effort) ────────────────────────────

export interface AccrueHandoffInput {
  prospect_id: string
  project_id: string | null
  time_entry_id: string
  /** Hunter session hours (decimal). Priced at approval via the chosen role. */
  hunter_hours: number
  /** LLM billable (post-margin cents, migration 055). The accrual baseline. */
  llm_billable_cents: number | null
  /** Label for the pending debit row (usually the note/session title). */
  description: string
}

/**
 * Accrue a role-LESS PENDING debit from a handoff time entry — ONLY if the
 * client has a retainer ledger (opt-in). No ledger → returns null; non-retainer
 * clients are untouched. Best-effort at the call site: a failure here must
 * never fail the handoff (the time entry already wrote).
 *
 * The handoff does NOT pick a role (zero change to the working handoff flow).
 * We accrue with:
 *   - hours captured (priced later),
 *   - amount_cents = LLM baseline only (human portion added at approval when
 *     the admin picks the role → rate).
 * The row is created even when amount is $0 (hours present but LLM-free), so it
 * still surfaces in the approval queue for pricing. Only when BOTH hours and
 * LLM are zero is there nothing to accrue.
 *
 * Idempotent via the partial unique index on time_entry_id.
 */
export async function accrueHandoffDebit(
  input: AccrueHandoffInput,
): Promise<RetainerTransaction | null> {
  const ledger = await getLedger(input.prospect_id)
  if (!ledger || ledger.status !== 'active') return null // opt-in: no retainer → no-op

  const llmBaseline = input.llm_billable_cents ?? 0
  if (input.hunter_hours <= 0 && llmBaseline <= 0) return null // nothing to bill

  return postTransaction({
    ledger_id: ledger.id,
    prospect_id: input.prospect_id,
    project_id: input.project_id,
    direction: 'debit',
    amount_cents: llmBaseline, // human hours priced at approval via role
    source: 'handoff',
    description: input.description,
    hours: input.hunter_hours,
    role: null, // admin sets it at approval
    time_entry_id: input.time_entry_id,
    // pending: admin picks role → rate → final amount, then approves
  })
}

/** Per-project drawdown rollup (no earmark table; query-time only). */
export async function getProjectRetainerBurn(projectId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('retainer_transactions')
    .select('amount_cents')
    .eq('project_id', projectId)
    .eq('status', 'approved')
    .eq('direction', 'debit')
  return (data ?? []).reduce((s, r) => s + (r.amount_cents ?? 0), 0)
}
