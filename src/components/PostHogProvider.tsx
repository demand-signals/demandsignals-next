'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY!
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

if (typeof window !== 'undefined' && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    ui_host: 'https://us.posthog.com',

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
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  )
}
