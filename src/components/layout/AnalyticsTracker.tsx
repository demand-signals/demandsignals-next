'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Lightweight analytics tracker — first-party only, consent-gated.
 *
 * Behavior by CookieStoplight tier:
 *   - Red (essential) / unset → no beacon at all
 *   - Yellow (balanced) / Green (all) → beacon with path + UTMs +
 *     referrer + screen dimensions
 *
 * The pre-consent silence is the load-bearing CIPA hygiene change:
 * even though this is a first-party beacon, fingerprint-adjacent
 * fields (referrer + screen size) shouldn't fire before the visitor
 * has had a chance to choose.
 */
const CONSENT_STORAGE_KEY = 'dsig_cookie_consent'
type ConsentTier = 'essential' | 'balanced' | 'all'

function readConsent(): ConsentTier | null {
  if (typeof window === 'undefined') return null
  try {
    const v = localStorage.getItem(CONSENT_STORAGE_KEY)
    if (v === 'essential' || v === 'balanced' || v === 'all') return v
  } catch { /* fall through */ }
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_STORAGE_KEY}=([^;]+)`))
  if (match) {
    const v = decodeURIComponent(match[1])
    if (v === 'essential' || v === 'balanced' || v === 'all') return v
  }
  return null
}

function consentAllowsAnalytics(tier: ConsentTier | null): boolean {
  return tier === 'balanced' || tier === 'all'
}

export function AnalyticsTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const sent = useRef<string>('')
  const [tier, setTier] = useState<ConsentTier | null>(() => readConsent())

  // Live-update on consent change so a visitor who picks yellow mid-session
  // starts being counted from their next navigation.
  useEffect(() => {
    function handle(e: Event) {
      const detail = (e as CustomEvent<{ tier?: ConsentTier }>).detail
      setTier(detail?.tier ?? null)
    }
    window.addEventListener('dsig:consent-changed', handle)
    return () => window.removeEventListener('dsig:consent-changed', handle)
  }, [])

  useEffect(() => {
    if (!consentAllowsAnalytics(tier)) return

    const key = `${pathname}?${searchParams.toString()}`
    if (sent.current === key) return
    sent.current = key

    const data: Record<string, string | number> = {
      p: pathname,
      r: document.referrer || '',
      sw: window.screen.width,
      sh: window.screen.height,
    }

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

    const payload = JSON.stringify(data)
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/collect', payload)
    } else {
      fetch('/api/analytics/collect', {
        method: 'POST',
        body: payload,
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {})
    }
  }, [pathname, searchParams, tier])

  return null
}
