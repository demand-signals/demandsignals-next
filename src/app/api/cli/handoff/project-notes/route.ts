import { NextRequest, NextResponse } from 'next/server'
import { authenticateCliRequest } from '@/lib/cli-auth'
import {
  NoteAndTimeInputSchema,
  createNoteAndTimeEntry,
} from '@/lib/notes-and-time'

// POST /api/cli/handoff/project-notes
// Bearer-authenticated CLI endpoint for /handoff Step 11.D.
//
// Auth: Authorization: Bearer dsigcli_...  (token from cli_tokens)
// Scope: this is the ONLY CLI endpoint in v1. Adding more CLI routes
// requires spec amendment. The auth helper does not authorize paths
// — each route opts in by calling authenticateCliRequest().
//
// Body: see NoteAndTimeInputSchema. Either project_id (uuid) OR
// client_code (4-letter) is required. visibility 'internal' is
// rejected — CLI is only for client-visible handoff notes.
//
// Spec: docs/superpowers/specs/2026-05-08-cli-tokens-design.md §components-cli-endpoint
// Plan: docs/superpowers/plans/2026-05-08-cli-tokens-plan.md Task 5

const PATH = '/api/cli/handoff/project-notes'

export async function POST(request: NextRequest) {
  const auth = await authenticateCliRequest(request, {
    method: 'POST',
    path: PATH,
  })

  if (!auth.ok) {
    const status = auth.reason === 'rate_limited' ? 429 : 401
    const headers: HeadersInit = {}
    if (auth.reason === 'rate_limited' && auth.retryAfterSeconds) {
      headers['Retry-After'] = String(auth.retryAfterSeconds)
    }
    return NextResponse.json(
      { error: 'Unauthorized', reason: auth.reason },
      { status, headers },
    )
  }

  // Parse body
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400 },
    )
  }
  const parsed = NoteAndTimeInputSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  // CLI is only for client-visible handoff notes. Internal notes are
  // an admin-UI-only path.
  if (parsed.data.visibility === 'internal') {
    return NextResponse.json(
      { error: 'CLI cannot create internal notes — use /admin/projects/[id] directly' },
      { status: 400 },
    )
  }

  const outcome = await createNoteAndTimeEntry(parsed.data, {
    source: 'cli',
    actor_id: auth.createdBy,             // admin who issued the token
    actor_label: `cli:${auth.tokenName}`, // distinguishes from real admin in logged_by
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
