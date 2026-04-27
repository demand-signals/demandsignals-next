import { NextRequest, NextResponse } from 'next/server'
import { CONTACT_EMAIL } from '@/lib/constants'
import { sendEmail } from '@/lib/email'
import { apiGuard, escapeHtml, isValidEmail, sanitizeField, safeErrorResponse } from '@/lib/api-security'

export async function POST(req: NextRequest) {
  const guard = apiGuard(req)
  if (guard) return guard

  try {
    const body = await req.json()
    const email = sanitizeField(body.email, 254)

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required.' }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 })
    }

    const result = await sendEmail({
      to: CONTACT_EMAIL,
      kind: 'newsletter',
      subject: `New Blog Subscriber: ${escapeHtml(email)}`,
      html: `
        <h2>New Newsletter Subscriber</h2>
        <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
        <p>This subscriber opted in via the blog/newsletter sign-up.</p>
      `,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error ?? 'Send failed' },
        { status: 502 },
      )
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    return safeErrorResponse('subscribe', err)
  }
}
