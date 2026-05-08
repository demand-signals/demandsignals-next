import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import {
  signMagicLinkToken,
  checkLoginRateLimit,
  recordLoginAttempt,
} from '@/lib/portal-auth'

// POST /api/portal/login/magic-link
// Body: { email }
// Always returns 200 { sent: true } regardless of match — prevents
// email enumeration. Side-effect (email send) only fires when the
// email resolves to prospects.is_client=true AND the rate limit
// allows it. Every attempt logs a row in client_portal_login_attempts.
//
// Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §5
// Plan: docs/superpowers/plans/2026-05-07-client-portal-v1-plan.md Task 6.1

const BodySchema = z.object({
  email: z.string().email().max(254),
})

const MAGIC_LINK_BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://demandsignals.co'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }
  const email = parsed.data.email.toLowerCase().trim()

  // Rate-limit check first — 5/hr/email regardless of match.
  const rate = await checkLoginRateLimit(email)
  if (!rate.ok) {
    await recordLoginAttempt({
      email,
      matched: false,
      method: 'magic_link_request',
      succeeded: false,
      failureReason: 'rate_limited',
      request,
    })
    return NextResponse.json({ sent: true })
  }

  // Lookup client by owner_email
  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('id, owner_name, business_name, owner_email, is_client')
    .ilike('owner_email', email)
    .eq('is_client', true)
    .maybeSingle()

  if (!prospect || !prospect.is_client) {
    await recordLoginAttempt({
      email,
      matched: false,
      method: 'magic_link_request',
      succeeded: false,
      failureReason: 'email_not_client',
      request,
    })
    return NextResponse.json({ sent: true })
  }

  // Sign + dispatch
  const { token } = await signMagicLinkToken({
    prospectId: prospect.id,
    email,
  })
  const link = `${MAGIC_LINK_BASE_URL}/api/portal/login/magic-link/verify?token=${encodeURIComponent(token)}`

  const html = renderMagicLinkEmail({
    ownerName: prospect.owner_name ?? null,
    businessName: prospect.business_name ?? 'your account',
    link,
  })
  const text =
    `Sign in to your Demand Signals portal:\n\n${link}\n\n` +
    `This link expires in 15 minutes. If you didn't request this, ignore this email — no action needed.`

  const result = await sendEmail({
    to: email,
    kind: 'portal_signin',
    subject: 'Sign in to your Demand Signals portal',
    html,
    text,
    link: { prospect_id: prospect.id },
  })

  await recordLoginAttempt({
    email,
    prospectId: prospect.id,
    matched: true,
    method: 'magic_link_request',
    succeeded: result.success,
    failureReason: result.success ? undefined : 'oauth_error',
    request,
  })

  return NextResponse.json({ sent: true })
}

function renderMagicLinkEmail(args: {
  ownerName: string | null
  businessName: string
  link: string
}): string {
  const greeting = args.ownerName ? `Hi ${escapeHtml(args.ownerName)},` : 'Hi,'
  const link = escapeHtml(args.link)
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Helvetica,Arial,sans-serif;color:#3D4566;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px 32px 24px 32px;border-bottom:3px solid #52C9A0;">
          <div style="font-size:22px;font-weight:700;color:#3D4566;letter-spacing:-0.5px;">Demand Signals</div>
          <div style="font-size:12px;color:#5d6780;text-transform:uppercase;letter-spacing:0.6px;margin-top:4px;">Client portal</div>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;color:#3D4566;">${greeting}</p>
          <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#3D4566;">
            Click the button below to sign in to your client portal. This link expires in <strong>15 minutes</strong>.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${link}" style="display:inline-block;background:#52C9A0;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">
              Sign in to portal
            </a>
          </div>
          <p style="margin:24px 0 0 0;font-size:13px;line-height:1.5;color:#5d6780;">
            Or copy this URL into your browser:<br>
            <span style="word-break:break-all;color:#3D4566;">${link}</span>
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px;background:#f4f6f9;border-top:1px solid #e5e7eb;font-size:12px;color:#5d6780;line-height:1.5;">
          If you didn't request this, ignore this email — no action needed.<br>
          Demand Signals · El Dorado Hills, CA
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
