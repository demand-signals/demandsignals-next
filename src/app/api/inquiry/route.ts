import { NextRequest, NextResponse } from 'next/server'
import { recordInquiry } from '@/lib/inquiry'
import { apiGuard, isValidEmail, sanitizeField, safeErrorResponse } from '@/lib/api-security'

export async function POST(req: NextRequest) {
  const guard = apiGuard(req)
  if (guard) return guard

  try {
    const body = await req.json()

    // Honeypot: if filled, return 200 OK with no DB write to defeat bot loops.
    const honeypot = sanitizeField(body.website, 200)
    if (honeypot) {
      return NextResponse.json({ success: true })
    }

    const name = sanitizeField(body.name, 200)
    const email = sanitizeField(body.email, 254)
    const phone = sanitizeField(body.phone, 30)
    const message = sanitizeField(body.message, 1000)
    const business = sanitizeField(body.business, 200)
    const service_interest = sanitizeField(body.service, 100)
    const page_url = sanitizeField(body.page_url, 500) || '/'
    const source = body.source === 'contact_form' ? 'contact_form' : 'quick_form'

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
      source,
      name,
      email,
      phone: phone || undefined,
      business: business || undefined,
      service_interest: service_interest || undefined,
      message: message || undefined,
      page_url,
    })

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error ?? 'Could not record inquiry.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return safeErrorResponse('inquiry', err)
  }
}
