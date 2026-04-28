import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { rescheduleBooking } from '@/lib/bookings'

interface Params { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const new_slot_id = typeof body?.slot_id === 'string' ? body.slot_id : ''
  if (!new_slot_id) {
    return NextResponse.json({ error: 'slot_id required' }, { status: 400 })
  }
  const result = await rescheduleBooking({ booking_id: id, new_slot_id })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true, new_start_at: result.new_start_at })
}
