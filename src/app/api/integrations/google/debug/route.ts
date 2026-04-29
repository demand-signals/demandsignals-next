// Admin-gated diagnostic endpoint for the Google Calendar integration.
//
// Reports which env vars are populated and which OAuth client_id the
// runtime would actually use. We never echo the secret — only its
// length and prefix, enough to confirm "yes, this is the DSIG Main
// client" without leaking it.
//
// Why this exists: the historical "calendar disconnected" error was
// caused by mismatched env var names between code and Vercel. A 30-second
// peek at runtime values is cheaper than rerunning the whole OAuth dance.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

function mask(value: string | undefined): { present: boolean; prefix: string; length: number } {
  if (!value) return { present: false, prefix: '', length: 0 }
  return {
    present: true,
    prefix: value.slice(0, 8),
    length: value.length,
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const datedId = process.env.GOOGLE_DSIG_MAIN_ID_042826
  const datedSecret = process.env.GOOGLE_DSIG_MAIN_SECRET_042826
  const genericId = process.env.GOOGLE_CLIENT_ID
  const genericSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirect = process.env.GOOGLE_OAUTH_REDIRECT_URI

  // Calendar code reads ONLY the dated names. Generic names are reported
  // here for diagnostic completeness but are NOT consulted at runtime.
  const effectiveId = datedId
  const effectiveSecret = datedSecret
  const expectedClientPrefix = '99529580' // DSIG Main = 995295804425-tm28...

  return NextResponse.json({
    ok: true,
    runtime: {
      effective_client_id: mask(effectiveId),
      effective_client_secret: mask(effectiveSecret),
      redirect_uri: redirect ?? '(unset, falls back to demandsignals.co/api/integrations/google/callback)',
    },
    sources: {
      GOOGLE_DSIG_MAIN_ID_042826: mask(datedId),
      GOOGLE_DSIG_MAIN_SECRET_042826: mask(datedSecret),
      GOOGLE_OAUTH_REDIRECT_URI: mask(redirect),
      _generic_not_consulted_at_runtime: {
        GOOGLE_CLIENT_ID: mask(genericId),
        GOOGLE_CLIENT_SECRET: mask(genericSecret),
      },
    },
    diagnostics: {
      no_credentials: !effectiveId,
      client_id_looks_like_dsig_main: effectiveId?.startsWith(expectedClientPrefix) ?? false,
      hint: !effectiveId
        ? 'GOOGLE_DSIG_MAIN_ID_042826 is not set in Vercel. Calendar will report disconnected. The Calendar code reads ONLY this dated name — generic GOOGLE_CLIENT_ID is intentionally ignored.'
        : !effectiveId.startsWith(expectedClientPrefix)
          ? 'GOOGLE_DSIG_MAIN_ID_042826 does NOT match DSIG Main (prefix 995295804425-tm28). Set it to the DSIG Main client id from PROJECT.md §2.'
          : 'GOOGLE_DSIG_MAIN_ID_042826 matches DSIG Main. If calendar still reports disconnected, check integrations row revoked_at, then re-run /admin/integrations/google connect flow.',
    },
  })
}
