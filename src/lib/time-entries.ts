// ── time-entries.ts ───────────────────────────────────────────────────
// Project time tracking helpers. The `project_time_entries` table is
// admin-only (RLS service_role) and is queried via service-role from
// admin API routes.

import { supabaseAdmin } from '@/lib/supabase/admin'

export type TimeEntryCategory =
  | 'billable'
  | 'non_billable'
  | 'bulk_payment'
  | 'services_contract'
  | 'internal'

export const TIME_ENTRY_CATEGORIES: ReadonlyArray<TimeEntryCategory> = [
  'billable',
  'non_billable',
  'bulk_payment',
  'services_contract',
  'internal',
]

/** Display label per category. UI uses this; DB stores the snake_case key. */
export const TIME_ENTRY_CATEGORY_LABEL: Record<TimeEntryCategory, string> = {
  billable: 'Billable',
  non_billable: 'Non-billable',
  bulk_payment: 'Bulk payment',
  services_contract: 'Services contract',
  internal: 'Internal',
}

export interface TimeEntry {
  id: string
  project_id: string
  phase_id: string | null
  deliverable_id: string | null
  hours: number | null              // null on handoff-sourced rows; populated by route on insert
  description: string | null
  billable: boolean
  category: TimeEntryCategory
  covered_by_invoice_id: string | null
  covered_by_subscription_id: string | null
  hourly_rate_cents: number | null
  logged_at: string  // YYYY-MM-DD
  logged_by: string | null
  created_at: string
  updated_at: string
  // Migration 048 additions for /handoff-sourced entries
  hunter_minutes: number | null
  claude_minutes: number | null
  session_started_at: string | null
  session_ended_at: string | null
  source: 'handoff' | 'manual' | null
  project_note_id: string | null
  // Migration 055: LLM token-based billing. Client-billable amount only
  // (post-margin); DSIG cost + rates never reach this surface.
  llm_billable_cents: number | null
  approval_status: 'captured' | 'approved' | null
  approved_at: string | null
  retainer_debit_id: string | null
  llm_billing_by_model: Record<string, unknown> | null
  billing_model: 'token' | 'time' | null
}

export interface TimeRollup {
  total_hours: number
  billable_hours: number
  non_billable_hours: number
  by_phase: Record<string, number>
  by_category: Record<TimeEntryCategory, number>
  entry_count: number
  /** Most recent logged_at timestamp (ISO date). */
  last_entry_date: string | null
}

export async function listProjectTimeEntries(projectId: string): Promise<TimeEntry[]> {
  // Order by session_ended_at when present (handoff entries), else logged_at,
  // then created_at as the tiebreaker.
  const { data } = await supabaseAdmin
    .from('project_time_entries')
    .select('*')
    .eq('project_id', projectId)
    .order('logged_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  return (data as TimeEntry[]) ?? []
}

export function rollupTimeEntries(entries: TimeEntry[]): TimeRollup {
  let total = 0
  let billable = 0
  const byPhase: Record<string, number> = {}
  const byCategory: Record<TimeEntryCategory, number> = {
    billable: 0,
    non_billable: 0,
    bulk_payment: 0,
    services_contract: 0,
    internal: 0,
  }
  let last: string | null = null
  for (const e of entries) {
    // Prefer `hours` if present (manual entries + handoff entries written
    // by /api/admin/project-notes which mirrors hunter+claude minutes).
    // Fall back to computing from minute split for any handoff rows that
    // pre-date the mirror.
    let h: number
    if (e.hours != null) {
      h = Number(e.hours)
    } else if ((e.hunter_minutes ?? 0) + (e.claude_minutes ?? 0) > 0) {
      h = ((e.hunter_minutes ?? 0) + (e.claude_minutes ?? 0)) / 60
    } else {
      h = 0
    }
    total += h
    if (e.billable) billable += h
    if (e.phase_id) byPhase[e.phase_id] = (byPhase[e.phase_id] ?? 0) + h
    const cat = (e.category ?? 'billable') as TimeEntryCategory
    byCategory[cat] = (byCategory[cat] ?? 0) + h
    if (!last || e.logged_at > last) last = e.logged_at
  }
  return {
    total_hours: round2(total),
    billable_hours: round2(billable),
    non_billable_hours: round2(total - billable),
    by_phase: Object.fromEntries(Object.entries(byPhase).map(([k, v]) => [k, round2(v)])),
    by_category: {
      billable: round2(byCategory.billable),
      non_billable: round2(byCategory.non_billable),
      bulk_payment: round2(byCategory.bulk_payment),
      services_contract: round2(byCategory.services_contract),
      internal: round2(byCategory.internal),
    },
    entry_count: entries.length,
    last_entry_date: last,
  }
}

export interface CreateTimeEntryInput {
  project_id: string
  phase_id?: string | null
  deliverable_id?: string | null
  hours: number
  description?: string | null
  billable?: boolean
  category?: TimeEntryCategory
  covered_by_invoice_id?: string | null
  covered_by_subscription_id?: string | null
  hourly_rate_cents?: number | null
  logged_at?: string  // YYYY-MM-DD; defaults to today
  logged_by?: string | null
}

export async function createTimeEntry(input: CreateTimeEntryInput): Promise<TimeEntry> {
  // Derive category from legacy `billable` boolean when not explicitly set.
  // Keep both columns in sync for back-compat with code paths that still
  // read .billable directly.
  const category: TimeEntryCategory =
    input.category ?? (input.billable === false ? 'non_billable' : 'billable')
  const billable = category === 'billable'

  const { data, error } = await supabaseAdmin
    .from('project_time_entries')
    .insert({
      project_id:        input.project_id,
      phase_id:          input.phase_id ?? null,
      deliverable_id:    input.deliverable_id ?? null,
      hours:             input.hours,
      description:       input.description ?? null,
      billable,
      category,
      covered_by_invoice_id:
        category === 'bulk_payment' ? (input.covered_by_invoice_id ?? null) : null,
      covered_by_subscription_id:
        category === 'services_contract' ? (input.covered_by_subscription_id ?? null) : null,
      hourly_rate_cents: input.hourly_rate_cents ?? null,
      logged_at:         input.logged_at ?? new Date().toISOString().slice(0, 10),
      logged_by:         input.logged_by ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(`createTimeEntry: ${error.message}`)
  return data as TimeEntry
}

export async function deleteTimeEntry(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from('project_time_entries').delete().eq('id', id)
  if (error) throw new Error(`deleteTimeEntry: ${error.message}`)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
