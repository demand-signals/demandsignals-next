import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-auth'

// /api/admin/project-notes
//   POST  → create a note + (optionally) a project_time_entry
//   GET   → list notes for a project (?project_id=X)
//
// Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §11
// Plan: docs/superpowers/plans/2026-05-07-client-portal-v1-plan.md Task 10.1–10.2

const CreateBodySchema = z.object({
  project_id: z.string().uuid(),
  body: z.string().min(1).max(20_000),
  title: z.string().max(200).optional().nullable(),
  visibility: z.enum(['internal', 'client']).default('client'),
  source: z.enum(['handoff', 'manual', 'import']).default('manual'),
  phase_id: z.string().uuid().optional().nullable(),
  deliverable_id: z.string().uuid().optional().nullable(),
  session_started_at: z.string().datetime().optional().nullable(),
  session_ended_at: z.string().datetime().optional().nullable(),
  hunter_minutes: z.number().int().min(0).max(60 * 24 * 7).optional(),
  claude_minutes: z.number().int().min(0).max(60 * 24 * 7).optional(),
})

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = CreateBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.issues },
      { status: 400 },
    )
  }
  const input = parsed.data

  // Look up prospect_id from project_id
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id, prospect_id, name')
    .eq('id', input.project_id)
    .maybeSingle()
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

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
      created_by: auth.admin.id,
    })
    .select(
      'id, project_id, prospect_id, title, body, visibility, source, phase_id, deliverable_id, session_started_at, session_ended_at, client_sent_at, suppressed, created_at',
    )
    .single()

  if (noteErr || !note) {
    return NextResponse.json(
      { error: noteErr?.message ?? 'Failed to create note' },
      { status: 500 },
    )
  }

  // If time tracking is provided, create a linked project_time_entries row.
  if (
    (input.hunter_minutes ?? 0) > 0 ||
    (input.claude_minutes ?? 0) > 0 ||
    input.source === 'handoff'
  ) {
    // Also populate `hours` (decimal) so the legacy timekeeping UIs
    // (/admin/timekeeping + /admin/projects/[id] TimeEntriesPanel)
    // can display handoff-sourced entries. hours = (hunter+claude)/60.
    const totalMinutes = (input.hunter_minutes ?? 0) + (input.claude_minutes ?? 0)
    const hoursDecimal = totalMinutes > 0
      ? Math.round((totalMinutes / 60) * 100) / 100
      : null
    // logged_at = session_ended_at's calendar date if available, else today.
    const loggedAt = input.session_ended_at
      ? new Date(input.session_ended_at).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)

    const { error: teErr } = await supabaseAdmin.from('project_time_entries').insert({
      project_id: project.id,
      prospect_id: project.prospect_id,
      project_note_id: note.id,
      hours: hoursDecimal,
      logged_at: loggedAt,
      logged_by: auth.user?.email ?? null,
      billable: true,
      hunter_minutes: input.hunter_minutes ?? 0,
      claude_minutes: input.claude_minutes ?? 0,
      session_started_at: input.session_started_at ?? null,
      session_ended_at: input.session_ended_at ?? null,
      description: input.title ?? null,
      source: input.source === 'import' ? 'manual' : input.source,
      created_by: auth.admin.id,
    })
    if (teErr) {
      // Non-fatal: note already wrote. Surface a warning.
      return NextResponse.json({
        note,
        warning: `time entry insert failed: ${teErr.message}`,
      })
    }
  }

  return NextResponse.json({ note })
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const projectId = request.nextUrl.searchParams.get('project_id')
  if (!projectId) {
    return NextResponse.json({ error: 'project_id required' }, { status: 400 })
  }

  const { data: notes, error } = await supabaseAdmin
    .from('project_notes')
    .select(
      'id, project_id, prospect_id, title, body, visibility, source, phase_id, deliverable_id, session_started_at, session_ended_at, client_sent_at, suppressed, suppressed_reason, created_at, created_by',
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Pull joined time entries (one query, in-memory join)
  const noteIds = (notes ?? []).map((n) => n.id)
  let timeMap = new Map<string, { hunter_minutes: number; claude_minutes: number }>()
  if (noteIds.length > 0) {
    const { data: times } = await supabaseAdmin
      .from('project_time_entries')
      .select('project_note_id, hunter_minutes, claude_minutes')
      .in('project_note_id', noteIds)
    timeMap = new Map(
      (times ?? []).map((t) => [
        t.project_note_id,
        {
          hunter_minutes: t.hunter_minutes ?? 0,
          claude_minutes: t.claude_minutes ?? 0,
        },
      ]),
    )
  }

  return NextResponse.json({
    notes: (notes ?? []).map((n) => ({
      ...n,
      hunter_minutes: timeMap.get(n.id)?.hunter_minutes ?? 0,
      claude_minutes: timeMap.get(n.id)?.claude_minutes ?? 0,
    })),
  })
}
