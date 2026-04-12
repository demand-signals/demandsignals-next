'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Lightweight analytics tracker — no cookies, no third-party JS.
 *
 * Sends a single beacon on each page navigation to our own API.
 * Uses navigator.sendBeacon for zero performance impact.
 * ~300 bytes of client JS after minification.
 */
export function AnalyticsTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const sent = useRef<string>('')

  useEffect(() => {
    // Deduplicate — don't fire twice for the same path + params combo
    const key = `${pathname}?${searchParams.toString()}`
    if (sent.current === key) return
    sent.current = key

    // Build payload
    const data: Record<string, string | number> = {
      p: pathname,
      r: document.referrer || '',
      sw: window.screen.width,
      sh: window.screen.height,
    }

    // Capture UTM params if present
    const utm_source = searchParams.get('utm_source')
    const utm_medium = searchParams.get('utm_medium')
    const utm_campaign = searchParams.get('utm_campaign')
    const utm_term = searchParams.get('utm_term')
    const utm_content = searchParams.get('utm_content')
    if (utm_source) data.us = utm_source
    if (utm_medium) data.um = utm_medium
    if (utm_campaign) data.uc = utm_campaign
    if (utm_term) data.ut = utm_term
    if (utm_content) data.ux = utm_content

    // Send via beacon (non-blocking, survives page unload)
    const payload = JSON.stringify(data)

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/collect', payload)
    } else {
      // Fallback for very old browsers
      fetch('/api/analytics/collect', {
        method: 'POST',
        body: payload,
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {})
    }
  }, [pathname, searchParams])

  return null
}
