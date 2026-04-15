import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

function parseUserAgent(ua: string) {
  let browser = 'Unknown'
  let os = 'Unknown'
  let deviceType = 'Desktop'

  // Browser (order matters — Edge contains Chrome, Chrome contains Safari)
  if (ua.includes('Edg/')) browser = 'Microsoft Edge'
  else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera'
  else if (ua.includes('Firefox/')) browser = 'Firefox'
  else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Google Chrome'
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari'

  // OS
  if (ua.includes('Windows NT 10')) os = 'Windows 10/11'
  else if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac OS X')) os = 'macOS'
  else if (ua.includes('iPhone')) { os = 'iOS'; deviceType = 'Mobile' }
  else if (ua.includes('iPad')) { os = 'iPadOS'; deviceType = 'Tablet' }
  else if (ua.includes('Android')) { os = 'Android'; deviceType = ua.includes('Mobile') ? 'Mobile' : 'Tablet' }
  else if (ua.includes('CrOS')) os = 'ChromeOS'
  else if (ua.includes('Linux')) os = 'Linux'

  if (ua.includes('Mobile') && deviceType === 'Desktop') deviceType = 'Mobile'

  return { browser, os, deviceType }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No session' }, { status: 401 })
  }

  // Collect server-side details
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'Unknown'
  const city = decodeURIComponent(request.headers.get('x-vercel-ip-city') || '') || 'Unknown'
  const region = request.headers.get('x-vercel-ip-country-region') || 'Unknown'
  const country = request.headers.get('x-vercel-ip-country') || 'Unknown'
  const latitude = request.headers.get('x-vercel-ip-latitude') || null
  const longitude = request.headers.get('x-vercel-ip-longitude') || null
  const userAgent = request.headers.get('user-agent') || 'Unknown'
  const { browser, os, deviceType } = parseUserAgent(userAgent)

  // Google profile from Supabase auth
  const email = user.email || 'Unknown'
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || 'Unknown'
  const avatarUrl = user.user_metadata?.avatar_url || null

  // Client-side details (sent in request body)
  let screenResolution = null
  let timezone = null
  let language = null
  try {
    const body = await request.json()
    screenResolution = body.screenResolution || null
    timezone = body.timezone || null
    language = body.language || null
  } catch {
    // Body may be empty on first call
  }

  // Log to database
  const { error } = await supabaseAdmin.from('unauthorized_access_log').insert({
    user_id: user.id,
    email,
    full_name: fullName,
    avatar_url: avatarUrl,
    ip_address: ip,
    city,
    region,
    country,
    latitude,
    longitude,
    user_agent: userAgent,
    browser,
    os,
    device_type: deviceType,
    screen_resolution: screenResolution,
    timezone,
    language,
  })

  if (error) {
    console.error('[unauthorized-log] Failed to log:', error.message)
  }

  return NextResponse.json({
    email,
    fullName,
    avatarUrl,
    ip,
    city,
    region,
    country,
    latitude,
    longitude,
    browser,
    os,
    deviceType,
    userAgent,
    screenResolution,
    timezone,
    language,
    timestamp: new Date().toISOString(),
  })
}
