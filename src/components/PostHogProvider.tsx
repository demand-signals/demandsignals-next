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

// Green-only PostHog features. Yellow opts into PostHog but DOES NOT get
// session replay, heatmaps, autocapture, dead-click recording, or network
// timing — only pageviews + UTM attribution + web vitals. This is what
// makes Yellow's "privacy-preserving analytics" label honest under CIPA.
function consentAllowsRichCapture(tier: ConsentTier | null): boolean {
  return tier === 'all'
}

function applyRichCaptureForTier(tier: ConsentTier | null) {
  // Runtime toggle so tier changes mid-session take effect without reload.
  // Same set of features that get disabled in the init config when the
  // visitor lands on Yellow first.
  if (typeof window === 'undefined') return
  const rich = consentAllowsRichCapture(tier)
  if (rich) {
    posthog.startSessionRecording?.()
  } else {
    posthog.stopSessionRecording?.()
  }
  posthog.set_config({
    autocapture: rich,
    capture_dead_clicks: rich,
    enable_heatmaps: rich,
    capture_performance: rich
      ? { web_vitals: true, network_timing: true }
      : { web_vitals: true, network_timing: false },
  })
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
    // Initialized OFF. Only Green (all) consent turns it on via
    // applyRichCaptureForTier() after init. Yellow (balanced) gets
    // pageviews + autocapture-off; Red (essential) is opted out entirely.
    disable_session_recording: true,
    session_recording: {
      // Defensive: even if recording is enabled later, mask all inputs.
      maskAllInputs: true,
      maskTextSelector: '[data-ph-mask]',
      recordHeaders: true,
      recordBody: false,
    },

    // --- Heatmaps (unlimited on free tier) — GREEN only ---
    enable_heatmaps: false,

    // --- Autocapture — GREEN only ---
    // Yellow opts into PostHog with pageviews + UTMs only. Autocapture
    // (every click target + form submit) is what plaintiff bar cites as
    // "interception"; staying off until Green is the load-bearing
    // CIPA hygiene move.
    autocapture: false,

    // --- Dead click detection — GREEN only ---
    capture_dead_clicks: false,

    // --- Performance / Web Vitals ---
    // web_vitals is fine pre-consent (no PII). network_timing is GREEN-only.
    capture_performance: { web_vitals: true, network_timing: false },

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
    // Green-only feature set is layered on AFTER opt-in so the toggles
    // land on a captured session. Yellow stays at the restrictive init
    // defaults (no replay, no autocapture, no heatmaps, no dead clicks,
    // no network timing).
    applyRichCaptureForTier(stored)
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
        applyRichCaptureForTier(tier)
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
