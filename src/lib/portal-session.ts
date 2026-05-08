// ── portal-session.ts ──────────────────────────────────────────────
// Unified session helper. Both /admin/* and /portal/* run on the
// SAME Supabase Auth session — there is one Google OAuth flow at
// /login that mints a Supabase session for everyone (admin,
// client, or both). This helper resolves the role from the session.
//
// Identity resolution from the Supabase user.email:
//   - admin_users WHERE user_id = auth.id AND is_active   → admin
//   - prospects WHERE owner_email ILIKE email AND is_client → client
//   - both → both flags true; UI decides default landing page
//   - neither → access denied
//
// Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §2 (rev)
// Plan: docs/superpowers/plans/2026-05-07-client-portal-v1-plan.md (Task 4 rewrite)

import { supabaseAdmin } from './supabase/admin'
import { createClient } from './supabase/server'

export interface PortalSessionRoles {
  isAdmin: boolean
  isClient: boolean
  /** prospect_id when isClient — the client this user IS (their own record) */
  prospectId: string | null
  /** admin_users.id when isAdmin */
  adminId: string | null
  /** auth user id (canonical) */
  userId: string
  email: string
}

/**
 * Resolve the current user's roles. Returns null when no Supabase
 * session is present at all.
 */
export async function getPortalSessionRoles(): Promise<PortalSessionRoles | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return null

  const email = user.email.toLowerCase()

  // Resolve admin + client in parallel
  const [adminRes, clientRes] = await Promise.all([
    supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle(),
    supabaseAdmin
      .from('prospects')
      .select('id')
      .ilike('owner_email', email)
      .eq('is_client', true)
      .maybeSingle(),
  ])

  return {
    isAdmin: !!adminRes.data,
    isClient: !!clientRes.data,
    prospectId: clientRes.data?.id ?? null,
    adminId: adminRes.data?.id ?? null,
    userId: user.id,
    email,
  }
}

/**
 * Resolve the prospect_id this request should view in the portal.
 *
 *   - Client viewing their own portal → their prospect_id
 *   - Admin "view as" via /admin/clients/[id]/portal-preview → that prospect_id
 *     (only when isAdmin and the override targets an existing client)
 *   - Admin viewing /portal directly without override → returns admin's own
 *     prospect_id IF they're flagged is_client; otherwise null (which the
 *     portal pages treat as "not a client — go pick one to view as")
 *
 * Returns { prospectId, viewingAs?: { adminId } } so pages can render a
 * "Viewing as <client>" banner when applicable.
 */
export interface ResolvedPortalContext {
  prospectId: string
  viewingAsAdmin: boolean
  roles: PortalSessionRoles
}

export async function resolvePortalContext(
  overrideProspectId?: string | null,
): Promise<ResolvedPortalContext | null> {
  const roles = await getPortalSessionRoles()
  if (!roles) return null

  // Admin "view as" override — only honored for admins
  if (overrideProspectId && roles.isAdmin) {
    const { data } = await supabaseAdmin
      .from('prospects')
      .select('id')
      .eq('id', overrideProspectId)
      .eq('is_client', true)
      .maybeSingle()
    if (data) {
      return { prospectId: data.id, viewingAsAdmin: true, roles }
    }
  }

  // Client viewing their own portal
  if (roles.isClient && roles.prospectId) {
    return { prospectId: roles.prospectId, viewingAsAdmin: false, roles }
  }

  return null
}
