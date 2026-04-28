import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { revokeIntegration, getActiveCalendarIntegration } from '@/lib/google-oauth'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const integration = await getActiveCalendarIntegration()
  if (!integration) return NextResponse.json({ ok: true, message: 'no active integration' })

  await revokeIntegration(integration.id)
  return NextResponse.json({ ok: true })
}
