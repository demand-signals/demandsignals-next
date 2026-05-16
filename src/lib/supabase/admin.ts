// Service-role Supabase client. Lazy-initialized via Proxy so module
// import never throws when env vars are absent — important for Vercel
// preview builds where `collectPageData` introspects every route at
// build time. The real client is created on first property access
// (i.e., the first time any route actually calls a Supabase method),
// at which point env vars MUST be set or the request 500s with a
// clear message. This trades a build-time crash for a runtime crash,
// which is the correct shape: the build succeeds even when an
// environment is partially configured, and any actual request gives
// the operator a clear error to fix.
//
// Existing import surface preserved: `import { supabaseAdmin } from
// '@/lib/supabase/admin'` works unchanged across 160+ call sites.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (cached) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Supabase admin client not configured: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in this environment. (Likely cause: env vars are scoped to "production" only in Vercel — add them to "preview" too.)',
    )
  }
  cached = createClient(url, key)
  return cached
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver)
  },
})
