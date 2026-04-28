import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { listAvailableSlots } from '@/lib/bookings'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const url = new URL(request.url)
  const count = Math.max(1, Math.min(20, Number(url.searchParams.get('count') ?? 6)))
  try {
    const slots = await listAvailableSlots({ count })
    return NextResponse.json({ ok: true, slots })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
