'use client'

// ── ClientTracker ────────────────────────────────────────────────────
// Drop-in tracker for magic-link pages. Beacons every meaningful
// client-side event back to /api/track/event so the prospect activity
// timeline shows full engagement granularity.
//
// Hunter directive 2026-04-29: catch ALL client traffic — pay clicks,
// PDF downloads, page-leave duration, scroll depth, outbound link
// clicks. UTMs picked up from URL when present.
//
// Events fired:
//   session_start     — once on mount (subject to 1h dedup window via
//                       sessionStorage)
//   pay_button_click  — when an element with data-track="pay-button" is clicked
//   download_pdf_click — when an element with data-track="download-pdf" is clicked
//   cta_click         — generic; element carries data-track-cta="<label>"
//   link_click        — outbound <a> click (off-host)
//   scroll_depth      — at 25/50/75/100% (one row per threshold per session)
//   page_leave        — pagehide / visibilitychange:hidden, carries duration_ms
//
// Implementation: navigator.sendBeacon() for page_leave (only reliable
// way during unload), fetch keepalive for everything else. Failures
// are silent — no user-visible error, no thrown promise.

import { useEffect, useRef } from 'react'

export interface ClientTrackerProps {
  surface: 'invoice' | 'sow' | 'quote_share' | 'receipt'
  surface_uuid: string
  doc_label?: string
}

const ENDPOINT = '/api/track/event'
const SCROLL_THRESHOLDS = [25, 50, 75, 100] as const

export default function ClientTracker({
  surface,
  surface_uuid,
  doc_label,
}: ClientTrackerProps) {
  const sessionStartTime = useRef<number>(Date.now())
  const firedScroll = useRef<Set<number>>(new Set())
  const sessionKey = `dsig_track_${surface}_${surface_uuid}`

  useEffect(() => {
    function send(event: string, data?: Record<string, unknown>) {
      const payload = JSON.stringify({
        event,
        surface,
        surface_uuid,
        doc_label,
        data: data ?? {},
      })
      try {
        // keepalive lets the request survive a navigation transition.
        // For unload events specifically we use sendBeacon (more reliable).
        fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {})
      } catch {
        /* ignore */
      }
    }

    function sendBeacon(event: string, data?: Record<string, unknown>) {
      const payload = JSON.stringify({
        event,
        surface,
        surface_uuid,
        doc_label,
        data: data ?? {},
      })
      try {
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: 'application/json' })
          navigator.sendBeacon(ENDPOINT, blob)
          return
        }
      } catch {
        /* fall through to fetch */
      }
      try {
        fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {})
      } catch {
        /* ignore */
      }
    }

    // ── 1. session_start (deduped per-tab via sessionStorage) ────
    try {
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, String(Date.now()))

        // Capture UTMs from the URL if any. Stored alongside the
        // session_start event so attribution gets a full read.
        const utms: Record<string, string> = {}
        const url = new URL(window.location.href)
        for (const [k, v] of url.searchParams.entries()) {
          if (k.startsWith('utm_') && v) utms[k] = v
        }
        send('session_start', {
          utms: Object.keys(utms).length ? utms : undefined,
          referrer: document.referrer || undefined,
          screen: `${window.screen.width}x${window.screen.height}`,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
        })
      }
    } catch {
      /* sessionStorage may be blocked — ignore */
    }

    // ── 2. Click delegation for tagged elements ───────────────────
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      if (!target) return
      const trackable = target.closest('[data-track]') as HTMLElement | null
      if (trackable) {
        const kind = trackable.dataset.track
        if (kind === 'pay-button') {
          send('pay_button_click', { href: (trackable as HTMLAnchorElement).href || undefined })
          return
        }
        if (kind === 'download-pdf') {
          send('download_pdf_click', { href: (trackable as HTMLAnchorElement).href || undefined })
          return
        }
      }
      const cta = target.closest('[data-track-cta]') as HTMLElement | null
      if (cta) {
        const label = cta.dataset.trackCta ?? 'unknown'
        send('cta_click', { cta: label })
        return
      }
      // Generic outbound link tracking — anchor tags pointing off-host.
      const anchor = target.closest('a[href]') as HTMLAnchorElement | null
      if (anchor && anchor.href) {
        try {
          const a = new URL(anchor.href, window.location.href)
          if (a.origin !== window.location.origin) {
            send('link_click', { url: anchor.href })
          }
        } catch {
          /* invalid URL — ignore */
        }
      }
    }

    // ── 3. Scroll depth thresholds ────────────────────────────────
    function onScroll() {
      const doc = document.documentElement
      const total = doc.scrollHeight - window.innerHeight
      if (total <= 0) return
      const pct = Math.round(((window.scrollY || doc.scrollTop) / total) * 100)
      for (const threshold of SCROLL_THRESHOLDS) {
        if (pct >= threshold && !firedScroll.current.has(threshold)) {
          firedScroll.current.add(threshold)
          send('scroll_depth', { percent: threshold })
        }
      }
    }

    // ── 4. Page leave — duration on page ──────────────────────────
    function onLeave() {
      const ms = Date.now() - sessionStartTime.current
      sendBeacon('page_leave', { duration_ms: ms })
    }

    document.addEventListener('click', onClick, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pagehide', onLeave)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') onLeave()
    })

    return () => {
      document.removeEventListener('click', onClick)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pagehide', onLeave)
    }
  }, [surface, surface_uuid, doc_label, sessionKey])

  return null
}
