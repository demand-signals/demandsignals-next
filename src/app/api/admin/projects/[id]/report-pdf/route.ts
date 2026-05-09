// ── GET /api/admin/projects/[id]/report-pdf ──────────────────────────
// Project ACTIVITY report — wraps notes + time entries into a
// DSIG-branded PDF deliverable. Different from /pdf which is a project
// brief (scope/phases/deliverables).
//
// Query:
//   ?from=YYYY-MM-DD       — period start (default: all activity ever)
//   ?to=YYYY-MM-DD         — period end   (default: through today)
//   ?includeInternal=1     — include internal notes (default: client-only)
//
// Always fresh — no caching. Snapshot at view time.

export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { renderProjectReportPdf } from '@/lib/pdf/project-report'
import { listProjectTimeEntries, rollupTimeEntries } from '@/lib/time-entries'
import type { ProjectRow } from '@/lib/invoice-types'

function parseDateParam(s: string | null): string | null {
  if (!s) return null
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const url = new URL(request.url)
  const fromDate = parseDateParam(url.searchParams.get('from'))
  const toDate = parseDateParam(url.searchParams.get('to'))
  const includeInternal = url.searchParams.get('includeInternal') === '1'

  // Project + prospect
  const { data: project, error: projErr } = await supabaseAdmin
    .from('projects')
    .select('*, prospect:prospects(business_name, owner_name, owner_email, city, state)')
    .eq('id', id)
    .maybeSingle()
  if (projErr) return NextResponse.json({ error: projErr.message }, { status: 500 })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const p =
    (project as { prospect?: { business_name?: string; owner_name?: string | null; owner_email?: string | null; city?: string | null; state?: string | null } })
      .prospect ?? {}

  // Time entries — server-side range filter via session_ended_at OR
  // logged_at fallback. We fetch all then filter in JS to keep the
  // logic identical to what TimeEntriesPanel shows.
  const allEntries = await listProjectTimeEntries(id)
  const entries = allEntries.filter((e) => {
    const date = e.logged_at
    if (fromDate && date < fromDate) return false
    if (toDate && date > toDate) return false
    return true
  })
  const rollup = rollupTimeEntries(entries)

  // Notes — same date filter, on created_at.
  let notesQuery = supabaseAdmin
    .from('project_notes')
    .select('id, title, body, visibility, source, client_sent_at, hunter_minutes, claude_minutes, created_at')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
  if (fromDate) notesQuery = notesQuery.gte('created_at', `${fromDate}T00:00:00Z`)
  if (toDate) notesQuery = notesQuery.lte('created_at', `${toDate}T23:59:59Z`)
  const { data: notesRaw } = await notesQuery
  const notes = (notesRaw ?? []).map((n) => ({
    id: n.id as string,
    title: (n.title as string | null) ?? null,
    body: n.body as string,
    visibility: n.visibility as 'internal' | 'client',
    source: n.source as string,
    client_sent_at: (n.client_sent_at as string | null) ?? null,
    hunter_minutes: (n.hunter_minutes as number | null) ?? 0,
    claude_minutes: (n.claude_minutes as number | null) ?? 0,
    created_at: n.created_at as string,
  }))

  const nameSlug = (project as ProjectRow).name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
  const dateTag = fromDate && toDate
    ? `${fromDate}_to_${toDate}`
    : fromDate
    ? `since_${fromDate}`
    : new Date().toISOString().slice(0, 10)
  const filename = `REPORT-${nameSlug}-${dateTag}.pdf`

  try {
    const pdfBuffer = await renderProjectReportPdf({
      project: project as ProjectRow,
      prospect: {
        business_name: p.business_name ?? 'Unknown',
        owner_name: p.owner_name ?? null,
        owner_email: p.owner_email ?? null,
        city: p.city ?? null,
        state: p.state ?? null,
      },
      notes,
      entries,
      rollup,
      fromDate,
      toDate,
      includeInternal,
    })
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Render failed' },
      { status: 500 },
    )
  }
}
