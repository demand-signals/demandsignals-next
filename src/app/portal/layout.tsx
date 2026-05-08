import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { PortalNav } from '@/components/portal/PortalNav'

// Server component layout for /portal/*. Middleware sets
// x-dsig-portal-prospect-id; we look up the prospect's display
// info here for the nav. Login pages render WITHOUT this layout
// because they're at /portal/login (different segment) or Next will
// fall through to a child layout route group (we don't, so login
// pages opt out via their own layout reset — see login/layout.tsx).
//
// Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §4
// Plan: docs/superpowers/plans/2026-05-07-client-portal-v1-plan.md Task 8.1

export const dynamic = 'force-dynamic'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const h = await headers()
  const prospectId = h.get('x-dsig-portal-prospect-id')

  let businessName: string | null = null
  let ownerName: string | null = null
  if (prospectId) {
    const { data } = await supabaseAdmin
      .from('prospects')
      .select('business_name, owner_name')
      .eq('id', prospectId)
      .maybeSingle()
    businessName = data?.business_name ?? null
    ownerName = data?.owner_name ?? null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalNav businessName={businessName} ownerName={ownerName} />
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
