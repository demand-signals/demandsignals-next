'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY!
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

// ── Consent gating (CookieStoplight integration) ──────────────────────────
//
// PostHog is init'd at module load (per MEMORY 2026-05-19 — "PostHog Next.js
// App Router: module-load init only, never lazy in useEffect"; lazy init
// cost the DOCK rollout 5 hours of '0 events' debugging). We CANNOT move
// init into a useEffect.
//
// To still respect consent, we use PostHog's first-class
// `opt_out_capturing_by_default: true` flag. PostHog loads, registers,
// preloads its scripts — but does NOT send a single event, NOT record a
// single session replay frame, NOT autocapture a single click, until
// `posthog.opt_in_capturing()` is called explicitly.
//
// The CookieStoplight widget writes `dsig_cookie_consent` to localStorage
// and dispatches a `dsig:consent-changed` window event. The consent map
// (yellow + green allow analytics; red doesn't) is enforced in this file
// at two points:
//
//   1. At module load: read localStorage immediately. If consent is
//      already 'balanced' or 'all', call opt_in_capturing() right after
//      init so returning visitors keep tracking without flicker.
//   2. The ConsentWatcher component (mounted inside the provider) listens
//      for live `dsig:consent-changed` events from the widget. When the
//      visitor picks yellow/green it opts in; when they pick red it opts
//      out. Takes effect within the same session — no page reload needed.

const CONSENT_STORAGE_KEY = 'dsig_cookie_consent'
type ConsentTier = 'essential' | 'balanced' | 'all'

function consentAllowsAnalytics(tier: ConsentTier | null): boolean {
  // Yellow (balanced) + green (all) → analytics on. Red (essential) → off.
  // null/unset → off (visitor hasn't chosen yet; assume the safest default).
  return tier === 'balanced' || tier === 'all'
}

function readStoredConsent(): ConsentTier | null {
  if (typeof window === 'undefined') return null
  try {
    const v = localStorage.getItem(CONSENT_STORAGE_KEY)
    if (v === 'essential' || v === 'balanced' || v === 'all') return v
  } catch {
    // localStorage blocked — fall through to cookie check
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_STORAGE_KEY}=([^;]+)`))
  if (match) {
    const v = decodeURIComponent(match[1])
    if (v === 'essential' || v === 'balanced' || v === 'all') return v
  }
  return null
}

if (typeof window !== 'undefined' && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    ui_host: 'https://us.posthog.com',

    // --- CONSENT GATE (load-bearing) -----------------------------------
    // Library loads but captures nothing until opt_in_capturing() fires.
    // ConsentWatcher (below) calls opt-in/opt-out in response to widget
    // events. Returning visitors with stored consent are opted-in
    // immediately after init in the same module-load tick (see below).
    opt_out_capturing_by_default: true,

    // --- Identity ---
    person_profiles: 'identified_only',  // No person profiles for anonymous visitors (saves events)

    // --- Pageview / Pageleave ---
    capture_pageview: false,   // We capture manually for SPA route changes
    capture_pageleave: true,   // Tracks session duration + exit pages

    // --- Session Replay (5K free recordings/mo) ---
    disable_session_recording: false,
    session_recording: {
      // Mask all text inputs by default for privacy (forms, passwords, etc.)
      maskAllInputs: true,
      maskTextSelector: '[data-ph-mask]',  // Opt-in additional masking via data attribute
      // Record network request/response headers in replay timeline
      recordHeaders: true,
      recordBody: false,  // Don't capture request bodies (privacy)
    },

    // --- Heatmaps (unlimited on free tier) ---
    enable_heatmaps: true,

    // --- Autocapture (clicks, inputs, form submits — counts toward 1M events/mo) ---
    autocapture: true,

    // --- Dead click detection (rage clicks, dead clicks in replays) ---
    capture_dead_clicks: true,

    // --- Performance / Web Vitals ---
    capture_performance: { web_vitals: true, network_timing: true },

    // --- Misc ---
    persistence: 'localStorage+cookie',  // Persist across sessions for accurate funnels
    cross_subdomain_cookie: false,        // We only have one domain
    secure_cookie: true,

    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') {
        ph.debug()
      }
    },
  })

  // Same-tick: if the visitor has already consented in a prior session
  // (returning visitor), opt in immediately so tracking resumes without
  // a perceptible gap. We're still inside the module-load phase, so this
  // satisfies the MEMORY rule "module-load init only" — opt_in is part
  // of the same init phase, not a deferred useEffect.
  const stored = readStoredConsent()
  if (consentAllowsAnalytics(stored)) {
    posthog.opt_in_capturing()
  }
  // (If stored is null, 'essential', or unset, we stay opted out by
  // default — set on the init config above. The ConsentWatcher below
  // handles live changes in this and every subsequent session.)
}

// ── ConsentWatcher ─────────────────────────────────────────────────────────
// Mounted inside PostHogProvider; listens for live consent changes from the
// CookieStoplight widget. Toggling consent mid-session takes effect on the
// very next captured event — no page reload needed.

function ConsentWatcher() {
  useEffect(() => {
    function handle(e: Event) {
      const detail = (e as CustomEvent<{ tier?: ConsentTier }>).detail
      const tier = detail?.tier ?? null
      if (consentAllowsAnalytics(tier)) {
        posthog.opt_in_capturing()
      } else {
        posthog.opt_out_capturing()
      }
    }
    window.addEventListener('dsig:consent-changed', handle)
    return () => window.removeEventListener('dsig:consent-changed', handle)
  }, [])
  return null
}

function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const ph = usePostHog()

  useEffect(() => {
    if (pathname && ph) {
      let url = window.origin + pathname
      const search = searchParams?.toString()
      if (search) url += `?${search}`
      ph.capture('$pageview', { $current_url: url })
    }
  }, [pathname, searchParams, ph])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!POSTHOG_KEY) return <>{children}</>

  return (
    <PHProvider client={posthog}>
      <ConsentWatcher />
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  )
}
