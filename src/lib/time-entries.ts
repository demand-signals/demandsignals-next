// ── time-entries.ts ───────────────────────────────────────────────────
// Project time tracking helpers. The `project_time_entries` table is
// admin-only (RLS service_role) and is queried via service-role from
// admin API routes.

import { supabaseAdmin } from '@/lib/supabase/admin'

export interface TimeEntry {
  id: string
  project_id: string
  phase_id: string | null
  deliverable_id: string | null
  hours: number
  description: string | null
  billable: boolean
  hourly_rate_cents: number | null
  logged_at: string  // YYYY-MM-DD
  logged_by: string | null
  created_at: string
  updated_at: string
}

export interface TimeRollup {
  total_hours: number
  billable_hours: number
  non_billable_hours: number
  by_phase: Record<string, number>
  entry_count: number
  /** Most recent logged_at timestamp (ISO date). */
  last_entry_date: string | null
}

export async function listProjectTimeEntries(projectId: string): Promise<TimeEntry[]> {
  const { data } = await supabaseAdmin
    .from('project_time_entries')
    .select('*')
    .eq('project_id', projectId)
    .order('logged_at', { ascending: false })
    .order('created_at', { ascending: false })
  return (data as TimeEntry[]) ?? []
}

export function rollupTimeEntries(entries: TimeEntry[]): TimeRollup {
  let total = 0
  let billable = 0
  const byPhase: Record<string, number> = {}
  let last: string | null = null
  for (const e of entries) {
    const h = Number(e.hours)
    total += h
    if (e.billable) billable += h
    if (e.phase_id) byPhase[e.phase_id] = (byPhase[e.phase_id] ?? 0) + h
    if (!last || e.logged_at > last) last = e.logged_at
  }
  return {
    total_hours: round2(total),
    billable_hours: round2(billable),
    non_billable_hours: round2(total - billable),
    by_phase: Object.fromEntries(Object.entries(byPhase).map(([k, v]) => [k, round2(v)])),
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
  hourly_rate_cents?: number | null
  logged_at?: string  // YYYY-MM-DD; defaults to today
  logged_by?: string | null
}

export async function createTimeEntry(input: CreateTimeEntryInput): Promise<TimeEntry> {
  const { data, error } = await supabaseAdmin
    .from('project_time_entries')
    .insert({
      project_id:        input.project_id,
      phase_id:          input.phase_id ?? null,
      deliverable_id:    input.deliverable_id ?? null,
      hours:             input.hours,
      description:       input.description ?? null,
      billable:          input.billable ?? true,
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
