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

  const canonicalId = process.env.GOOGLE_CLIENT_ID
  const canonicalSecret = process.env.GOOGLE_CLIENT_SECRET
  const legacyId = process.env.GOOGLE_DSIG_MAIN_ID_042826
  const legacySecret = process.env.GOOGLE_DSIG_MAIN_SECRET_042826
  const redirect = process.env.GOOGLE_OAUTH_REDIRECT_URI

  // Precedence MUST mirror google-oauth.ts: dated DSIG_MAIN names win.
  // Reason documented there + in CLAUDE.md §12 (env var collision history).
  const effectiveId = legacyId ?? canonicalId
  const effectiveSecret = legacySecret ?? canonicalSecret
  const expectedClientPrefix = '99529580' // DSIG Main = 995295804425-tm28...

  return NextResponse.json({
    ok: true,
    runtime: {
      effective_client_id: mask(effectiveId),
      effective_client_secret: mask(effectiveSecret),
      redirect_uri: redirect ?? '(unset, falls back to demandsignals.co/api/integrations/google/callback)',
    },
    sources: {
      GOOGLE_CLIENT_ID: mask(canonicalId),
      GOOGLE_CLIENT_SECRET: mask(canonicalSecret),
      GOOGLE_DSIG_MAIN_ID_042826: mask(legacyId),
      GOOGLE_DSIG_MAIN_SECRET_042826: mask(legacySecret),
      GOOGLE_OAUTH_REDIRECT_URI: mask(redirect),
    },
    diagnostics: {
      using_dated_dsig_main: !!legacyId,
      using_generic_fallback: !legacyId && !!canonicalId,
      no_credentials_at_all: !effectiveId,
      client_id_looks_like_dsig_main: effectiveId?.startsWith(expectedClientPrefix) ?? false,
      hint: !effectiveId
        ? 'Neither GOOGLE_DSIG_MAIN_ID_042826 nor GOOGLE_CLIENT_ID is set in Vercel. Calendar will report disconnected.'
        : !effectiveId.startsWith(expectedClientPrefix)
          ? 'Effective client id does NOT match DSIG Main (prefix 995295804425-tm28). Refresh-token redemption will return invalid_client. Set GOOGLE_DSIG_MAIN_ID_042826 to the DSIG Main client id.'
          : 'Effective client id matches DSIG Main. If calendar still reports disconnected, check integrations row revoked_at, then re-run /admin/integrations/google connect flow.',
    },
  })
}
