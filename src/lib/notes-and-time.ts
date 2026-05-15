// ── notes-and-time.ts ──────────────────────────────────────────────
// Shared helper for creating a project_notes row + linked
// project_time_entries row in one operation. Used by:
//   - /api/admin/project-notes (admin browser session, paste-handoff)
//   - /api/cli/handoff/project-notes (CLI bearer-token /handoff)
//
// The two callers differ in:
//   - WHO is acting (admin Supabase user vs CLI token's creator)
//   - HOW project is identified (always project_id; CLI may pass
//     client_code which this helper resolves to the most-recently-
//     updated active project for that prospect)
//
// Spec: docs/superpowers/specs/2026-05-08-cli-tokens-design.md §components-extract
// Plan: docs/superpowers/plans/2026-05-08-cli-tokens-plan.md Task 4

import { z } from 'zod'
import { supabaseAdmin } from './supabase/admin'

// ── Input schema ───────────────────────────────────────────────────

export const NoteAndTimeInputSchema = z
  .object({
    project_id: z.string().uuid().optional(),
    client_code: z.string().min(2).max(8).optional(),
    // Body cap raised 2026-05-15 from 20k → 100k. Multi-day MEMORY-style
    // backfill entries legitimately exceed 20k (witnessed: Dockside edit
    // path 400'd as "Invalid input" on real engineering log content).
    // Postgres `text` is unbounded; 100k is comfortable headroom while
    // still bounding pathological pastes.
    body: z.string().min(1).max(100_000),
    title: z.string().max(200).optional().nullable(),
    visibility: z.enum(['internal', 'client']).default('client'),
    source: z.enum(['handoff', 'manual', 'import']).default('manual'),
    phase_id: z.string().uuid().optional().nullable(),
    deliverable_id: z.string().uuid().optional().nullable(),
    // { offset: true } so non-Z timestamps from the TimeEntriesPanel
    // parser ("2026-05-05T10:30:00-07:00") are accepted. Default Zod
    // .datetime() requires Z suffix and rejected the panel's input,
    // causing 400s that the frontend surfaced as "Invalid input."
    session_started_at: z.string().datetime({ offset: true }).optional().nullable(),
    session_ended_at: z.string().datetime({ offset: true }).optional().nullable(),
    hunter_minutes: z.number().int().min(0).max(60 * 24 * 7).optional(),
    claude_minutes: z.number().int().min(0).max(60 * 24 * 7).optional(),
  })
  .refine((d) => d.project_id || d.client_code, {
    message: 'Either project_id or client_code is required',
    path: ['project_id'],
  })

export type NoteAndTimeInput = z.infer<typeof NoteAndTimeInputSchema>

// ── Audit context ──────────────────────────────────────────────────

export interface NoteAndTimeAudit {
  /** Where the call came from. Drives created_by + logged_by. */
  source: 'admin' | 'cli'
  /**
   * UUID of the actor:
   *   - admin: admin_users.id of the signed-in admin
   *   - cli:   admin_users.id of the CLI token's creator
   * Stored on project_notes.created_by AND project_time_entries.created_by.
   */
  actor_id: string
  /**
   * Display label for project_time_entries.logged_by:
   *   - admin: the admin's email
   *   - cli:   "cli:<token-name>"
   */
  actor_label: string
}

// ── Result ─────────────────────────────────────────────────────────

export interface NoteAndTimeResult {
  note: {
    id: string
    project_id: string
    prospect_id: string
    title: string | null
    body: string
    visibility: string
    source: string
    phase_id: string | null
    deliverable_id: string | null
    session_started_at: string | null
    session_ended_at: string | null
    client_sent_at: string | null
    suppressed: boolean
    created_at: string
  }
  time_entry: {
    id: string
    hours: number | null
    hunter_minutes: number
    claude_minutes: number
    logged_at: string
    logged_by: string | null
  } | null
  warning?: string
}

export type NoteAndTimeError =
  | { code: 'project_not_found'; message: string }
  | { code: 'client_not_found'; message: string }
  | { code: 'no_active_project'; message: string }
  | { code: 'note_insert_failed'; message: string }

export type NoteAndTimeOutcome =
  | { ok: true; result: NoteAndTimeResult }
  | { ok: false; error: NoteAndTimeError }

// ── Main entry point ───────────────────────────────────────────────

/**
 * Create a project_notes row and (when time-tracking is provided OR
 * source is 'handoff') a linked project_time_entries row in one
 * operation. Hours decimal is auto-mirrored from the minute split.
 *
 * Resolves client_code → project_id by picking the most-recently-
 * updated active project for the matched prospect.
 */
export async function createNoteAndTimeEntry(
  input: NoteAndTimeInput,
  audit: NoteAndTimeAudit,
): Promise<NoteAndTimeOutcome> {
  // Resolve project_id (either passed directly or via client_code).
  let projectId = input.project_id ?? null

  if (!projectId && input.client_code) {
    const code = input.client_code.toUpperCase()
    const { data: prospect } = await supabaseAdmin
      .from('prospects')
      .select('id')
      .eq('client_code', code)
      .maybeSingle()
    if (!prospect) {
      return {
        ok: false,
        error: { code: 'client_not_found', message: `No prospect with client_code ${code}` },
      }
    }
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('prospect_id', prospect.id)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!project) {
      return {
        ok: false,
        error: {
          code: 'no_active_project',
          message: `No active project for client_code ${code}. Pick a specific project_id instead.`,
        },
      }
    }
    projectId = project.id
  }

  if (!projectId) {
    return {
      ok: false,
      error: { code: 'project_not_found', message: 'project_id or client_code is required' },
    }
  }

  // Look up prospect_id from project_id
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id, prospect_id, name')
    .eq('id', projectId)
    .maybeSingle()
  if (!project) {
    return {
      ok: false,
      error: { code: 'project_not_found', message: 'Project not found' },
    }
  }

  // Insert the note
  const { data: note, error: noteErr } = await supabaseAdmin
    .from('project_notes')
    .insert({
      project_id: project.id,
      prospect_id: project.prospect_id,
      title: input.title ?? null,
      body: input.body,
      visibility: input.visibility,
      source: input.source,
      phase_id: input.phase_id ?? null,
      deliverable_id: input.deliverable_id ?? null,
      session_started_at: input.session_started_at ?? null,
      session_ended_at: input.session_ended_at ?? null,
      created_by: audit.actor_id,
    })
    .select(
      'id, project_id, prospect_id, title, body, visibility, source, phase_id, deliverable_id, session_started_at, session_ended_at, client_sent_at, suppressed, created_at',
    )
    .single()

  if (noteErr || !note) {
    return {
      ok: false,
      error: {
        code: 'note_insert_failed',
        message: noteErr?.message ?? 'Failed to insert note',
      },
    }
  }

  // Decide whether to create a time entry
  const hasTimeData =
    (input.hunter_minutes ?? 0) > 0 ||
    (input.claude_minutes ?? 0) > 0 ||
    input.source === 'handoff'

  if (!hasTimeData) {
    return {
      ok: true,
      result: { note, time_entry: null },
    }
  }

  // hours decimal mirror so legacy timekeeping UIs see the entry
  const totalMinutes = (input.hunter_minutes ?? 0) + (input.claude_minutes ?? 0)
  const hoursDecimal = totalMinutes > 0
    ? Math.round((totalMinutes / 60) * 100) / 100
    : null

  // logged_at = session_ended_at's calendar date if available, else today
  const loggedAt = input.session_ended_at
    ? new Date(input.session_ended_at).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10)

  // project_time_entries has no created_by column — admin attribution
  // for time entries lives on logged_by (email or actor label). Past
  // versions of this helper sent created_by; PostgREST silently rejected
  // the insert and the warning never surfaced to the frontend, leading
  // to "Save handoff" appearing successful while the time entry never
  // wrote. See migrations 030 + 048 for the actual column set.
  const { data: timeEntry, error: teErr } = await supabaseAdmin
    .from('project_time_entries')
    .insert({
      project_id: project.id,
      prospect_id: project.prospect_id,
      project_note_id: note.id,
      hours: hoursDecimal,
      logged_at: loggedAt,
      logged_by: audit.actor_label,
      billable: true,
      hunter_minutes: input.hunter_minutes ?? 0,
      claude_minutes: input.claude_minutes ?? 0,
      session_started_at: input.session_started_at ?? null,
      session_ended_at: input.session_ended_at ?? null,
      description: input.title ?? null,
      source: input.source === 'import' ? 'manual' : input.source,
    })
    .select('id, hours, hunter_minutes, claude_minutes, logged_at, logged_by')
    .single()

  if (teErr || !timeEntry) {
    // Non-fatal: note already wrote. Surface a warning.
    return {
      ok: true,
      result: {
        note,
        time_entry: null,
        warning: `time entry insert failed: ${teErr?.message ?? 'unknown'}`,
      },
    }
  }

  return {
    ok: true,
    result: { note, time_entry: timeEntry },
  }
}
