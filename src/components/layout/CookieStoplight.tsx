'use client'

// dsig-stoplight-version: v1b
// DSIG Cookie Stoplight — Next.js / React drop-in
// ─────────────────────────────────────────────────────────────────────────────
// Source-of-truth: Y:\SKILLS\dsig-cookie-stoplight\components\CookieStoplight.tsx
// Install / update via: /stoplight slash command (Y:\.claude\commands\stoplight.md)
//
// Behavior:
//   1. First visit, no consent stored → three colored circles open in the
//      bottom-left, labeled red/yellow/green. Visitor must pick.
//   2. Honors Global Privacy Control: if `navigator.globalPrivacyControl`
//      is true, auto-records Red without showing the panel (CCPA/CPRA
//      regulations require treating GPC as a valid opt-out signal).
//   3. Visitor's choice persists to localStorage AND a cookie named
//      `dsig_cookie_consent`. A `dsig:consent-changed` window event
//      fires for downstream analytics (PostHog, beacons) to consume.
//   4. After choice, a confirmation toast fades in for 3 seconds.
//   5. Circles collapse into a single cookie-icon button. Clicking it
//      anytime reopens the three circles so the visitor can change.
//   6. The companion FooterPrivacyChoices link fires a
//      `dsig:open-consent-panel` event that pops the panel open from
//      anywhere on the page — CCPA-compliant "Your Privacy Choices."
//
// Dependencies: framer-motion (already in every DSIG Next.js site).

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ── CONFIG ──────────────────────────────────────────────────────────────────

const CONFIG = {
  storageKey: 'dsig_cookie_consent',
  cookieMaxAgeDays: 365,
  defaultButtonColor: '#52C9A0',  // DSIG teal
  buttonShadow: '0 2px 8px rgba(0,0,0,0.18)',
  position: {
    bottom: 20,
    left: 70,  // sits to the right of AccessibilityWidget if present
  },
  zIndex: 90,
  toastDurationMs: 3000,
  tiers: [
    {
      id: 'essential' as const,
      label: 'Essential only',
      color: '#dc2626',
      description: 'Site-function cookies only (auth, session, security). No analytics. No session recording. No marketing.',
    },
    {
      id: 'balanced' as const,
      label: 'Balanced',
      color: '#eab308',
      description: 'Adds pageview counts via third-party analytics (e.g. PostHog). No session recording. No click or form recording. No heatmaps. No marketing.',
    },
    {
      id: 'all' as const,
      label: 'All cookies',
      color: '#16a34a',
      description: 'Adds session recording, click capture, and heatmaps via third-party analytics. Reserved for marketing pixels.',
    },
  ],
}

export type ConsentTier = 'essential' | 'balanced' | 'all'

// ── Cookie helpers ──────────────────────────────────────────────────────────

function setConsentCookie(value: ConsentTier) {
  const maxAge = CONFIG.cookieMaxAgeDays * 24 * 60 * 60
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:'
  document.cookie =
    `${CONFIG.storageKey}=${value}; path=/; max-age=${maxAge}; SameSite=Lax${secure ? '; Secure' : ''}`
}

function readConsent(): ConsentTier | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(CONFIG.storageKey)
    if (stored === 'essential' || stored === 'balanced' || stored === 'all') return stored
  } catch { /* localStorage blocked — fall through */ }
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONFIG.storageKey}=([^;]+)`))
  if (match) {
    const v = decodeURIComponent(match[1])
    if (v === 'essential' || v === 'balanced' || v === 'all') return v
  }
  return null
}

// Global Privacy Control browser signal. Required by California regulations
// (Sephora $1.2M, AG enforcement actions Mar-2025 through Mar-2026 all
// included GPC handling). Returns true when the visitor's browser asserts
// the opt-out signal.
function hasGPCSignal(): boolean {
  if (typeof navigator === 'undefined') return false
  // @ts-expect-error globalPrivacyControl is a runtime browser property
  // not yet in the TS lib.dom types.
  return navigator.globalPrivacyControl === true
}

// ── Icons ───────────────────────────────────────────────────────────────────

const CookieIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/>
    <circle cx="8.5" cy="8.5" r=".5" fill="currentColor"/>
    <circle cx="15.5" cy="15.5" r=".5" fill="currentColor"/>
    <circle cx="15.5" cy="8.5" r=".5" fill="currentColor"/>
    <circle cx="8.5" cy="15.5" r=".5" fill="currentColor"/>
    <circle cx="12" cy="12" r=".5" fill="currentColor"/>
  </svg>
)

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

// ── Main component ──────────────────────────────────────────────────────────

export interface CookieStoplightProps {
  buttonColor?: string
}

export function CookieStoplight({ buttonColor }: CookieStoplightProps = {}) {
  // null = not yet checked storage; 'unset' = checked, no consent yet.
  const [consent, setConsent] = useState<ConsentTier | 'unset' | null>(null)
  const [hoveredTier, setHoveredTier] = useState<ConsentTier | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [toast, setToast] = useState<{ tier: ConsentTier; reason: 'choice' | 'gpc' } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resolvedButtonColor = buttonColor ?? `var(--cookie-button-color, ${CONFIG.defaultButtonColor})`

  // ── Boot-time consent resolution ──
  // Priority: stored consent > GPC > unset (show panel).
  // GPC special case: if browser asserts GPC and visitor previously chose
  // Yellow/Green, we DOWNGRADE to Red and surface a toast. CA regulations
  // treat GPC as a continuing opt-out signal that supersedes prior choice.
  useEffect(() => {
    const existing = readConsent()
    const gpc = hasGPCSignal()

    if (gpc) {
      // Browser-level opt-out. Force essential, persist, and notify
      // downstream scripts. Skip the panel entirely.
      const downgrade = existing && existing !== 'essential'
      try { localStorage.setItem(CONFIG.storageKey, 'essential') } catch { /* noop */ }
      setConsentCookie('essential')
      window.dispatchEvent(new CustomEvent('dsig:consent-changed', { detail: { tier: 'essential', source: 'gpc' } }))
      setConsent('essential')
      setPanelOpen(false)
      if (downgrade) {
        // Visitor previously chose more permissive; tell them GPC overrode.
        setToast({ tier: 'essential', reason: 'gpc' })
      }
      return
    }

    if (existing) {
      setConsent(existing)
      setPanelOpen(false)
    } else {
      setConsent('unset')
      setPanelOpen(true)
    }
  }, [])

  // ── Listen for external open requests (Your Privacy Choices link) ──
  useEffect(() => {
    function open() { setPanelOpen(true) }
    window.addEventListener('dsig:open-consent-panel', open)
    return () => window.removeEventListener('dsig:open-consent-panel', open)
  }, [])

  // ── Toast auto-dismiss ──
  useEffect(() => {
    if (!toast) return
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), CONFIG.toastDurationMs)
    return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current) }
  }, [toast])

  const choose = useCallback((tier: ConsentTier) => {
    setConsent(tier)
    setPanelOpen(false)
    try { localStorage.setItem(CONFIG.storageKey, tier) } catch { /* cookie still persists */ }
    setConsentCookie(tier)
    window.dispatchEvent(new CustomEvent('dsig:consent-changed', { detail: { tier, source: 'user' } }))
    setToast({ tier, reason: 'choice' })
  }, [])

  if (consent === null) return null

  return (
    <>
      {/* Trigger button — visible whenever the panel is closed */}
      <AnimatePresence>
        {!panelOpen && (
          <motion.div
            key="cookie-trigger"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              bottom: CONFIG.position.bottom,
              left: CONFIG.position.left,
              zIndex: CONFIG.zIndex,
            }}
          >
            <button
              onClick={() => setPanelOpen(true)}
              title="Cookie preferences"
              aria-label="Open cookie preferences"
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: resolvedButtonColor,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: CONFIG.buttonShadow,
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
            >
              <CookieIcon />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation toast — fades in after a choice or GPC override */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="cookie-toast"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
            role="status"
            aria-live="polite"
            style={{
              position: 'fixed',
              bottom: CONFIG.position.bottom + 52,
              left: CONFIG.position.left,
              zIndex: CONFIG.zIndex + 2,
              background: '#111827',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              padding: '8px 12px 8px 10px',
              borderRadius: 8,
              boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              maxWidth: 'min(320px, calc(100vw - 32px))',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            <CheckIcon />
            <span>
              {toast.reason === 'gpc'
                ? 'Your browser’s Global Privacy Control is on — opted out of analytics.'
                : `Saved — ${CONFIG.tiers.find(t => t.id === toast.tier)?.label}.`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stoplight panel */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            key="cookie-panel"
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            style={{
              position: 'fixed',
              bottom: CONFIG.position.bottom,
              left: CONFIG.position.left,
              zIndex: CONFIG.zIndex + 1,
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 10px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12)',
              padding: '18px 18px 14px',
              width: 'min(340px, calc(100vw - 32px))',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
            role="dialog"
            aria-label="Cookie preferences"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>
                Cookie preferences
              </h2>
              {consent !== 'unset' && (
                <button
                  onClick={() => setPanelOpen(false)}
                  aria-label="Close"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#9ca3af', padding: 2, display: 'flex', alignItems: 'center',
                  }}
                >
                  <CloseIcon />
                </button>
              )}
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
              We use cookies to make this site work. Pick what you&apos;re comfortable with.
            </p>

            {/* Stoplight circles */}
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
              {CONFIG.tiers.map((tier) => {
                const isCurrent = consent === tier.id
                return (
                  <button
                    key={tier.id}
                    onClick={() => choose(tier.id)}
                    aria-label={tier.label}
                    aria-describedby="cookie-stoplight-desc"
                    style={{
                      flex: 1,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 2px',
                      borderRadius: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb'
                      setHoveredTier(tier.id)
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                      setHoveredTier(null)
                    }}
                    onFocus={() => setHoveredTier(tier.id)}
                    onBlur={() => setHoveredTier(null)}
                  >
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: CONFIG.tiers.indexOf(tier) * 0.05 + 0.05 }}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: tier.color,
                        boxShadow: isCurrent
                          ? `0 0 0 3px #fff, 0 0 0 5px ${tier.color}, 0 2px 8px rgba(0,0,0,0.18)`
                          : '0 2px 8px rgba(0,0,0,0.18)',
                      }}
                    />
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: isCurrent ? tier.color : '#374151',
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}>
                      {tier.label}
                    </span>
                  </button>
                )
              })}
            </div>

            <CookieDescriptions
              tiers={CONFIG.tiers}
              activeTier={hoveredTier ?? (consent !== 'unset' && consent ? consent : 'balanced')}
            />

            {/* CCPA-residents notice */}
            <p style={{
              margin: '10px 0 0',
              fontSize: 10.5,
              color: '#6b7280',
              lineHeight: 1.45,
              background: '#fef3c7',
              borderRadius: 6,
              padding: '6px 8px',
            }}>
              <strong style={{ color: '#92400e' }}>California residents:</strong>{' '}
              Yellow and Green include third-party analytics. Red opts out of all non-essential cookies. We also honor the Global Privacy Control browser signal.
            </p>

            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6', textAlign: 'center' }}>
              <a
                href="/privacy"
                style={{ fontSize: 11, color: '#9ca3af', textDecoration: 'underline' }}
              >
                Read our full privacy policy
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ── Inline tier description ─────────────────────────────────────────────────

function CookieDescriptions({
  tiers,
  activeTier,
}: {
  tiers: ReadonlyArray<{ id: ConsentTier; label: string; description: string; color: string }>
  activeTier: ConsentTier
}) {
  const active = tiers.find((t) => t.id === activeTier) ?? tiers[1]
  return (
    <div
      id="cookie-stoplight-desc"
      role="status"
      aria-live="polite"
      style={{
        marginTop: 4,
        padding: '10px 12px',
        background: '#f9fafb',
        borderRadius: 8,
        borderLeft: `3px solid ${active.color}`,
        minHeight: 56,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 4 }}>
        {active.label}
      </div>
      <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.45 }}>
        {active.description}
      </div>
    </div>
  )
}
