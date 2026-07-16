// ── retainer-types.ts ─────────────────────────────────────────────────────
// Types for the retainer ledger ("bill like attorneys"). One prepaid balance
// per client (prospect); work draws it down via admin-approved debits.
//
// Schema: supabase/migrations/059_retainer_ledger.sql
// Spec:   docs/superpowers/specs/2026-07-16-retainer-ledger-design.md
//
// Currency = integer cents throughout. Hours are reporting-only.

export type RetainerLedgerStatus = 'active' | 'closed'

export interface RetainerLedger {
  id: string
  prospect_id: string
  currency: string
  /** CACHE of SUM(approved credits) − SUM(approved debits). Recomputed on posting. */
  balance_cents: number
  lifetime_credited_cents: number
  lifetime_debited_cents: number
  /** Per-client hourly rate override (cents). Null → platform default. */
  hourly_rate_cents: number | null
  /** Percent DEPLETED at which the client is notified (no invoice). Default 75. */
  notify_pct: number
  /** Percent DEPLETED at which a re-up invoice is auto-DRAFTED. Default 90. */
  reup_pct: number
  /** When false, no auto re-up drafts (e.g. project wrapping up). */
  auto_reup_enabled: boolean
  /** Amount the re-up draft requests. Null → reuse last credit amount. */
  reup_target_cents: number | null
  last_notified_at: string | null
  last_reup_drafted_at: string | null
  status: RetainerLedgerStatus
  notes: string | null
  created_at: string
  updated_at: string
}

// ── Rate card ──────────────────────────────────────────────────────────────
// Single source of truth for human role rates + disclosed markup tiers.
// LLM raw cost basis is NOT here — it stays internal (llm-rates.json).

export interface RateCardRole {
  id: string
  key: string
  name: string
  hourly_rate_cents: number
  when_applied: string | null
  sort_order: number
  active: boolean
  no_discounts: boolean
  created_at: string
  updated_at: string
}

export interface RateCardMarkup {
  id: string
  key: string
  name: string
  markup_bps: number
  description: string | null
  sort_order: number
  active: boolean
  created_at: string
  updated_at: string
}

export type RetainerTxDirection = 'credit' | 'debit'

// pending  — accrued, awaiting admin action. Does NOT affect balance.
// approved — posted. AFFECTS balance.
// waived   — real work absorbed by DSIG ("on our dime"). Logged, does NOT affect balance.
// void     — wrong/duplicate entry. Does NOT affect balance.
export type RetainerTxStatus = 'pending' | 'approved' | 'waived' | 'void'

export type RetainerTxSource =
  | 'replenish_invoice' // credit when a replenish invoice is paid
  | 'handoff'           // debit accrued from a /handoff time entry
  | 'manual_debit'      // admin-entered debit
  | 'manual_credit'     // admin-entered credit (check/wire on the books)
  | 'adjustment'        // corrections

export interface RetainerTransaction {
  id: string
  ledger_id: string
  prospect_id: string
  /** Reporting only — which project this work belongs to. No earmark/cap. */
  project_id: string | null
  direction: RetainerTxDirection
  status: RetainerTxStatus
  amount_cents: number
  source: RetainerTxSource
  /** Role billed (rate_card_roles.key). Null until admin sets it at approval. */
  role: string | null
  time_entry_id: string | null
  invoice_id: string | null
  description: string
  /** Reporting/NTE framing only; dollars are authoritative. */
  hours: number | null
  approved_by: string | null
  approved_at: string | null
  waived_by: string | null
  waived_at: string | null
  waive_reason: string | null
  voided_by: string | null
  voided_at: string | null
  void_reason: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/** A client's live balance plus its pending approval queue and history. */
export interface RetainerSummary {
  ledger: RetainerLedger
  /** Debits awaiting admin approve/waive/void. */
  pending: RetainerTransaction[]
  /** Recent posted history (approved + waived + void), newest first. */
  history: RetainerTransaction[]
  /** Percent depleted right now (0–100+), for threshold display. */
  pct_depleted: number
}

/** Which threshold (if any) the ledger has crossed after a posting. */
export type ThresholdState = 'ok' | 'notify' | 'reup'
