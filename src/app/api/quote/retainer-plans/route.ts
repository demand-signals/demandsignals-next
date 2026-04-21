import { NextResponse } from 'next/server'
import { getRetainerPlans } from '@/lib/retainer'

export const runtime = 'nodejs'

export async function GET() {
  const plans = await getRetainerPlans()
  return NextResponse.json({ plans })
}
