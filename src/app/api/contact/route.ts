import { NextRequest, NextResponse } from 'next/server'
import { recordInquiry } from '@/lib/inquiry'
import { apiGuard, isValidEmail, sanitizeField, safeErrorResponse } from '@/lib/api-security'

export async function POST(req: NextRequest) {
  const guard = apiGuard(req)
  if (guard) return guard

  try {
    const body = await req.json()

    // Honeypot defense (same field name as /api/inquiry for consistency)
    const honeypot = sanitizeField(body.website, 200)
    if (honeypot) {
      return NextResponse.json({ success: true })
    }

    const name = sanitizeField(body.name, 200)
    const email = sanitizeField(body.email, 254)
    const business = sanitizeField(body.business, 200)
    const phone = sanitizeField(body.phone, 30)
    const service = sanitizeField(body.service, 100)
    const message = sanitizeField(body.message, 5000)

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required.' },
        { status: 400 },
      )
    }
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 },
      )
    }

    const result = await recordInquiry({
      source: 'contact_form',
      name,
      email,
      phone: phone || undefined,
      business: business || undefined,
      service_interest: service || undefined,
      message: message || undefined,
      page_url: '/contact',
    })

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error ?? 'Send failed' },
        { status: 502 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return safeErrorResponse('contact', err)
  }
}
