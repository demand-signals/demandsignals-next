// ── GET /api/admin/projects/[id]/pdf ─────────────────────────────────
// Render a project (or bug report / customer service) PDF on-demand.
// Always fresh — no caching, no R2 upload. PDF is a snapshot of the
// project at view time, intended for sharing with team members or
// clients.

export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { renderProjectPdf } from '@/lib/pdf/project'
import type { ProjectRow } from '@/lib/invoice-types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .select('*, prospect:prospects(business_name, owner_name, owner_email, city, state)')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const p = (project as { prospect?: { business_name?: string; owner_name?: string | null; owner_email?: string | null; city?: string | null; state?: string | null } }).prospect ?? {}

  // Build a filename slug. Bug reports get BUG- prefix; CS gets CS-;
  // others use the project's name slug.
  const typePrefix =
    project.type === 'bug_report' ? 'BUG' :
    project.type === 'customer_service' ? 'CS' :
    'PROJECT'
  const nameSlug = project.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
  const filename = `${typePrefix}-${nameSlug}.pdf`

  try {
    const pdfBuffer = await renderProjectPdf(project as ProjectRow, {
      business_name: p.business_name ?? 'Unknown',
      owner_name: p.owner_name ?? null,
      owner_email: p.owner_email ?? null,
      city: p.city ?? null,
      state: p.state ?? null,
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
      { error: e instanceof Error ? e.message : 'PDF render failed' },
      { status: 500 },
    )
  }
}
