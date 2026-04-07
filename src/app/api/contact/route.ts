import nodemailer from 'nodemailer'
import { NextRequest, NextResponse } from 'next/server'
import { CONTACT_EMAIL } from '@/lib/constants'
import { apiGuard, escapeHtml, isValidEmail, sanitizeField, safeErrorResponse } from '@/lib/api-security'
import { trackGA4Event, getGA4Context } from '@/lib/ga4'

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
    const name = sanitizeField(body.name, 200)
    const email = sanitizeField(body.email, 254)
    const business = sanitizeField(body.business, 200)
    const phone = sanitizeField(body.phone, 30)
    const service = sanitizeField(body.service, 100)
    const message = sanitizeField(body.message, 5000)

    if (!name || !email) {
      return NextResponse.json({ success: false, error: 'Name and email are required.' }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 })
    }

    const html = `
      <h2>New Contact Form Submission</h2>
      <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;width:100%;max-width:600px;">
        <tr><td><strong>Name</strong></td><td>${escapeHtml(name)}</td></tr>
        <tr><td><strong>Email</strong></td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
        <tr><td><strong>Business</strong></td><td>${escapeHtml(business || '—')}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${escapeHtml(phone || '—')}</td></tr>
        <tr><td><strong>Service Interest</strong></td><td>${escapeHtml(service || '—')}</td></tr>
        <tr><td><strong>Message</strong></td><td style="white-space:pre-wrap;">${escapeHtml(message || '—')}</td></tr>
      </table>
    `

    await transporter.sendMail({
      from: `"Demand Signals Contact" <${process.env.SMTP_USER}>`,
      to: CONTACT_EMAIL,
      subject: `New Contact: ${sanitizeField(body.name, 100)} — ${sanitizeField(body.business, 100) || 'No business listed'}`,
      html,
    })

    // Fire server-side GA4 conversion event (non-blocking)
    trackGA4Event({
      name: 'generate_lead',
      params: {
        event_category: 'contact_form',
        service_interest: service || 'not_specified',
        has_business: business ? 'yes' : 'no',
        has_phone: phone ? 'yes' : 'no',
      },
    }, getGA4Context(req)).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (err) {
    return safeErrorResponse('contact', err)
  }
}
