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
    const name = sanitizeField(body.name, 200)
    const email = sanitizeField(body.email, 254)
    const business = sanitizeField(body.business, 200)
    const phone = sanitizeField(body.phone, 30)
    const report_type = sanitizeField(body.report_type, 100)
    const industry = sanitizeField(body.industry, 100)
    const question = sanitizeField(body.question, 5000)

    if (!name || !email || !business || !report_type) {
      return NextResponse.json(
        { success: false, error: 'Name, email, business, and report type are required.' },
        { status: 400 }
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 })
    }

    const html = `
      <h2>Free Report Request</h2>
      <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;width:100%;max-width:600px;">
        <tr><td><strong>Name</strong></td><td>${escapeHtml(name)}</td></tr>
        <tr><td><strong>Email</strong></td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
        <tr><td><strong>Business</strong></td><td>${escapeHtml(business)}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${escapeHtml(phone || '—')}</td></tr>
        <tr><td><strong>Report Type</strong></td><td>${escapeHtml(report_type)}</td></tr>
        <tr><td><strong>Industry</strong></td><td>${escapeHtml(industry || '—')}</td></tr>
        <tr><td><strong>Marketing Challenge</strong></td><td style="white-space:pre-wrap;">${escapeHtml(question || '—')}</td></tr>
      </table>
    `

    await transporter.sendMail({
      from: `"Demand Signals Reports" <${process.env.SMTP_USER}>`,
      to: CONTACT_EMAIL,
      subject: `FREE REPORT REQUEST: ${sanitizeField(body.report_type, 100)} — ${sanitizeField(body.business, 100)}`,
      html,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return safeErrorResponse('report-request', err)
  }
}
