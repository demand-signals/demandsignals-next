import nodemailer from 'nodemailer'
import { NextRequest, NextResponse } from 'next/server'
import { CONTACT_EMAIL } from '@/lib/constants'
import { apiGuard, escapeHtml, isValidEmail, sanitizeField, safeErrorResponse } from '@/lib/api-security'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

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

    await transporter.sendMail({
      from: `"Demand Signals" <${process.env.SMTP_USER}>`,
      to: CONTACT_EMAIL,
      subject: `New Blog Subscriber: ${escapeHtml(email)}`,
      html: `
        <h2>New Newsletter Subscriber</h2>
        <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
        <p>This subscriber opted in via the blog/newsletter sign-up.</p>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return safeErrorResponse('subscribe', err)
  }
}
