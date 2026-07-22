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
// NOTE: accrueHandoffDebit moved to the Approve route (2026-07-23) — handoff
// no longer auto-debits the retainer. Import lives where it's now used:
// src/app/api/admin/projects/[id]/time-entries/[entryId]/approve/route.ts

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
    // Block-time handoffs aggregate a multi-day work window into one entry,
    // so the cap is a full billing period, not a single week. (2026-07-22:
    // the old 1-week cap would silently reject long-session handoffs at
    // validation, same failure class as the hours<=24 DB CHECK.) 1000h in
    // minutes = 60000; matches migration 056's hours<=1000 sanity bound.
    hunter_minutes: z.number().int().min(0).max(60 * 1000).optional(),
    claude_minutes: z.number().int().min(0).max(60 * 1000).optional(),
    // ── Token attribution (migration 053; wired here 2026-07-08) ──
    claude_input_tokens: z.number().int().min(0).optional().nullable(),
    claude_output_tokens: z.number().int().min(0).optional().nullable(),
    claude_cache_read_tokens: z.number().int().min(0).optional().nullable(),
    claude_cache_create_tokens: z.number().int().min(0).optional().nullable(),
    model: z.string().max(64).optional().nullable(),
    // ── LLM token-based billing (migration 055, 2026-07-08) ──
    // Client-billable LLM amount, post-margin. Sent in DOLLARS by the
    // handoff; stored as cents. Cost + rates never cross this boundary.
    llm_billable_usd: z.number().min(0).optional().nullable(),
    // Per-model usage + billable breakdown (usage tokens + billable USD,
    // NO cost/rates). Stored verbatim as jsonb for display + audit.
    llm_billing_by_model: z.record(z.string(), z.unknown()).optional().nullable(),
    billing_model: z.enum(['token', 'time']).optional().nullable(),
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
    llm_billable_cents: number | null
    billing_model: string | null
    logged_at: string
    logged_by: string | null
  } | null
  warning?: string
}

export type NoteAndTimeError =
  | { code: 'body_client_mismatch'; message: string }
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
    // "Active" here means "currently being worked on" — NOT the literal
    // status string 'active'. The projects table has two naming
    // conventions in circulation: NewProjectModal defaults to 'active',
    // but the detail page + most older records use 'planning' /
    // 'in_progress' / 'on_hold'. Exclude only the truly-finished states
    // so this resolver matches operator intent ("the project I'm
    // working on right now") rather than a brittle literal.
    // See Y:\PROJECTS\dockside-next 2026-05-19 handoff: DOCK was
    // status='in_progress' and got 'no_active_project' under the old
    // `eq('status', 'active')` filter.
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('prospect_id', prospect.id)
      .not('status', 'in', '(completed,cancelled)')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!project) {
      return {
        ok: false,
        error: {
          code: 'no_active_project',
          message: `No in-progress project for client_code ${code} (all projects are completed or cancelled). Pick a specific project_id instead.`,
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

  // Body/prospect coherence check (locked 2026-07-01 after DOCK
  // project_notes.4aae44f6 forensic: a DOCK handoff POSTed with a
  // DOCK-appropriate title but a body that was verbatim leftover from a
  // 2026-06-15 SMMA session, because the /handoff slash-command spec used a
  // shared /tmp/handoff-body.txt buffer with no session-scoping or rotation).
  // The /handoff spec now uses a session-scoped path plus a client-side
  // brand-token abort gate; this server check is the second line of defense
  // that catches any client bypassing those.
  //
  // Gated on `source='handoff'` — manual/import notes are admin-authored and
  // may legitimately quote other clients. Only strong brand tokens are
  // checked so a passing mention deep in the body ("unlike Southside MMA")
  // doesn't false-positive; only the first 500 chars (session-focus header)
  // are scanned.
  if (input.source === 'handoff') {
    const { data: prospectRow } = await supabaseAdmin
      .from('prospects')
      .select('client_code, business_name')
      .eq('id', project.prospect_id)
      .maybeSingle()
    const clientCode = (prospectRow?.client_code || '').toUpperCase()
    const bodyHead = (input.body || '').toLowerCase().slice(0, 500)
    const BRAND_TOKENS: Array<{ code: string; pattern: RegExp }> = [
      { code: 'SSMM', pattern: /(southside mma|smma\b)/ },
      { code: 'SMMA', pattern: /(southside mma|smma\b)/ },
      { code: 'DOCK', pattern: /(dockside|dock fuel|weekly fuel alert)/ },
      { code: 'HANG', pattern: /(hangtown|placerville)/ },
      { code: 'FRN9', pattern: /(front 9|front9|back9)/ },
      { code: 'GRNP', pattern: /(greenroom partners|jon hill)/ },
      { code: 'HEAD', pattern: /(headline talent)/ },
    ]
    for (const t of BRAND_TOKENS) {
      if (t.pattern.test(bodyHead) && clientCode && clientCode !== t.code) {
        // SSMM ⇔ SMMA are the same client under two code eras — never a mismatch.
        if (
          (clientCode === 'SSMM' && t.code === 'SMMA') ||
          (clientCode === 'SMMA' && t.code === 'SSMM')
        ) continue
        return {
          ok: false,
          error: {
            code: 'body_client_mismatch',
            message: `Body contains ${t.code} brand tokens in the first 500 characters, but the resolved project belongs to ${clientCode}. This is almost certainly a stale-body leak from a prior session's /tmp/handoff-body file. Refusing the write. Rebuild the body from the current session's CLIENT UPDATE artifact and retry.`,
          },
        }
      }
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
      // Handoff CAPTURES only (2026-07-23). Entry stays 'captured' until a
      // human reviews + approves in-project, which then forks to retainer
      // debit or invoice. Only 'approved' entries reach either money surface.
      approval_status: 'captured',
      hunter_minutes: input.hunter_minutes ?? 0,
      claude_minutes: input.claude_minutes ?? 0,
      session_started_at: input.session_started_at ?? null,
      session_ended_at: input.session_ended_at ?? null,
      description: input.title ?? null,
      source: input.source === 'import' ? 'manual' : input.source,
      // Token attribution (migration 053).
      claude_input_tokens: input.claude_input_tokens ?? null,
      claude_output_tokens: input.claude_output_tokens ?? null,
      claude_cache_read_tokens: input.claude_cache_read_tokens ?? null,
      claude_cache_create_tokens: input.claude_cache_create_tokens ?? null,
      model: input.model ?? null,
      // LLM token-based billing (migration 055). Dollars → cents. We store
      // the post-margin billable ONLY; DSIG cost/rates never reach the DB.
      llm_billable_cents:
        input.llm_billable_usd != null
          ? Math.round(input.llm_billable_usd * 100)
          : null,
      llm_billing_by_model: input.llm_billing_by_model ?? null,
      billing_model:
        input.billing_model ??
        (input.llm_billable_usd != null ? 'token' : null),
    })
    .select(
      'id, hours, hunter_minutes, claude_minutes, llm_billable_cents, billing_model, logged_at, logged_by',
    )
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

  // ── Retainer accrual: REMOVED at handoff time (2026-07-23) ─────────
  // The handoff no longer auto-accrues a retainer debit. Hours captured by
  // the handoff are often wrong, so auto-debiting mis-charged client money.
  // New model: handoff CAPTURES (approval_status='captured'); a human
  // reviews + edits hours/role/rate/tokens in-project and clicks Approve,
  // which THEN forks — retainer clients get a debit with the verified
  // numbers; non-retainer clients' approved entries flow into New Invoice.
  // See Y:\SKILLS\dsig-handoff\specs\2026-07-23-handoff-rewrite-plan-v2a-amended.md
  // Approve API: POST /api/admin/projects/[id]/time-entries/[entryId]/approve
  //
  // (accrueHandoffDebit is still imported + used by the Approve route, not here.)

  return {
    ok: true,
    result: { note, time_entry: timeEntry },
  }
}
