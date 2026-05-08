import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolvePortalContext } from '@/lib/portal-session'
import { PortalNav } from '@/components/portal/PortalNav'

// Server component layout for /portal/*. Auth is the unified Supabase
// session set by /auth/callback after Google OAuth at /login.
// Role resolution happens in resolvePortalContext():
//   - client → views their own prospect_id
//   - admin with ?as=<prospect_id> cookie → views as that client
//   - admin without override + their email matches a client → their own
//   - otherwise → bounce to /admin (admin lacks a client to view)
//
// Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §2 (rev)

export const dynamic = 'force-dynamic'

const VIEW_AS_COOKIE = 'dsig_portal_view_as'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const overrideProspectId = cookieStore.get(VIEW_AS_COOKIE)?.value ?? null

  const ctx = await resolvePortalContext(overrideProspectId)
  if (!ctx) {
    // No client identity for this user. If admin, bounce to /admin/clients
    // (where they can pick a client to view as). Otherwise unauthorized.
    redirect('/admin/clients?msg=pick_client_to_view')
  }

  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('business_name, owner_name')
    .eq('id', ctx.prospectId)
    .maybeSingle()
  const businessName = prospect?.business_name ?? null
  const ownerName = prospect?.owner_name ?? null

  return (
    <div className="min-h-screen bg-slate-50">
      {ctx.viewingAsAdmin && (
        <div className="bg-amber-100 border-b border-amber-300 text-amber-900 text-sm">
          <div className="max-w-6xl mx-auto px-6 py-2 flex items-center justify-between gap-4">
            <span>
              <strong>Viewing as client:</strong> {businessName ?? 'Unknown'} (admin preview)
            </span>
            <a
              href="/api/admin/portal-view-as/clear"
              className="text-amber-900 underline hover:text-amber-700"
            >
              Stop viewing as
            </a>
          </div>
        </div>
      )}
      <PortalNav businessName={businessName} ownerName={ownerName} />
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
