import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { cancelBooking } from '@/lib/bookings'

interface Params { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const reason = typeof body?.reason === 'string' ? body.reason : undefined
  const result = await cancelBooking({ booking_id: id, reason, cancelled_by: 'admin' })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
