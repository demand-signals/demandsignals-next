import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-auth'
import {
  NoteAndTimeInputSchema,
  createNoteAndTimeEntry,
} from '@/lib/notes-and-time'

// /api/admin/project-notes
//   POST  → create a note + (optionally) a project_time_entry
//   GET   → list notes for a project (?project_id=X)
//
// POST delegates to createNoteAndTimeEntry() (shared with the CLI
// endpoint /api/cli/handoff/project-notes). Audit context is "admin"
// — actor_id = auth.admin.id, actor_label = auth.user.email.
//
// Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §11
// + docs/superpowers/specs/2026-05-08-cli-tokens-design.md §components-extract

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = NoteAndTimeInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const outcome = await createNoteAndTimeEntry(parsed.data, {
    source: 'admin',
    actor_id: auth.admin.id,
    actor_label: auth.user?.email ?? 'admin',
  })

  if (!outcome.ok) {
    const status =
      outcome.error.code === 'project_not_found' ||
      outcome.error.code === 'client_not_found' ||
      outcome.error.code === 'no_active_project'
        ? 404
        : 500
    return NextResponse.json(
      { error: outcome.error.message, code: outcome.error.code },
      { status },
    )
  }

  return NextResponse.json({
    note: outcome.result.note,
    time_entry: outcome.result.time_entry,
    warning: outcome.result.warning,
  })
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
