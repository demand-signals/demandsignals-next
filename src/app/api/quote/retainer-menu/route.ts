import { NextResponse } from 'next/server'
import { getRetainerMenu } from '@/lib/retainer'

export const runtime = 'nodejs'

export async function GET() {
  const menu = await getRetainerMenu()
  return NextResponse.json({ menu })
}
