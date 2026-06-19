'use client'

// DSIG Cookie Stoplight — Next.js / React drop-in
// ─────────────────────────────────────────────────────────────────────────────
// Source-of-truth: Y:\TOOLS\dsig-cookie-stoplight\react\CookieStoplight.tsx
// Visual treatment matched to AccessibilityWidget.tsx (same project, same
// 40×40 circular button, same shadow, same bottom-left convention). When
// both are installed, the cookie widget sits to the right of the
// accessibility button so the two stack horizontally.
//
// Behavior:
//   1. First visit, no consent stored → three colored circles animate UP
//      from the bottom-left, labeled red/yellow/green.
//   2. Visitor clicks one → choice persists to localStorage AND a cookie
//      named `dsig_cookie_consent`. A `dsig:consent-changed` window event
//      fires for analytics scripts to consume.
//   3. Circles animate DOWN, collapse into a single cookie-icon button.
//   4. Clicking the button anytime reopens the three circles so the
//      visitor can change their choice.
//
// Dependencies: framer-motion (already in every DSIG Next.js site).
//
// Version: v1a — 2026-05-21

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ── CONFIG ──────────────────────────────────────────────────────────────────
// Tweak these values to rebrand per-site. `buttonColor` is the closed-state
// button background — also overridable per-mount via the `buttonColor` prop
// or per-site via the `--cookie-button-color` CSS variable (see CookieStoplight
// component for precedence). Stoplight circle colors stay universal because
// red/yellow/green carry semantic meaning across all sites.

const CONFIG = {
  storageKey: 'dsig_cookie_consent',
  cookieMaxAgeDays: 365,
  defaultButtonColor: '#52C9A0',  // DSIG teal — default if no prop + no CSS var
  buttonShadow: '0 2px 8px rgba(0,0,0,0.18)',  // matches AccessibilityWidget
  position: {
    bottom: 20,
    left: 70,  // sits to the right of AccessibilityWidget at left:20 (40w + 10gap = 70)
  },
  zIndex: 90,  // same as AccessibilityWidget
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
      description: 'Adds pageview counts via PostHog (third-party analytics). No session recording. No click or form recording. No heatmaps. No marketing.',
    },
    {
      id: 'all' as const,
      label: 'All cookies',
      color: '#16a34a',
      description: 'Adds session recording, click capture, and heatmaps via PostHog. Reserved for future marketing pixels. Most tailored experience.',
    },
  ],
}

type ConsentTier = 'essential' | 'balanced' | 'all'

// ── Cookie helper (no jsCookie dependency) ──────────────────────────────────

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
  } catch {
    // localStorage blocked by privacy mode -- fall back to cookie
  }
  // Cookie fallback (in case localStorage was cleared but cookie survives)
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONFIG.storageKey}=([^;]+)`))
  if (match) {
    const v = decodeURIComponent(match[1])
    if (v === 'essential' || v === 'balanced' || v === 'all') return v
  }
  return null
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

// ── Main component ──────────────────────────────────────────────────────────

export interface CookieStoplightProps {
  /**
   * Closed-state button background color. Precedence (highest first):
   *   1. This prop (per-mount override)
   *   2. CSS variable `--cookie-button-color` set on the page (per-site)
   *   3. CONFIG.defaultButtonColor (DSIG teal)
   *
   * Accept any CSS color value (hex, rgb, hsl, color name, even
   * `var(--my-brand)` if a site wants to chain through their own token).
   *
   * Example per-mount override:
   *   <CookieStoplight buttonColor="#FF6B2B" />
   *
   * Example CSS-var-based theming in globals.css:
   *   :root { --cookie-button-color: #FF6B2B; }
   *   <CookieStoplight />   // picks up the var automatically
   */
  buttonColor?: string
}

export function CookieStoplight({ buttonColor }: CookieStoplightProps = {}) {
  // null = not yet checked localStorage (first render, before hydration);
  // ConsentTier = consent has been given;
  // 'unset' = checked, no consent yet (show panel immediately).
  const [consent, setConsent] = useState<ConsentTier | 'unset' | null>(null)
  // Which tier the visitor is currently hovering/focusing — drives the
  // inline description text below the icons. Falls back to `consent` if
  // already chosen, otherwise to balanced (yellow) so something is
  // always visible.
  const [hoveredTier, setHoveredTier] = useState<ConsentTier | null>(null)

  // Resolved button color. If the prop is provided, use it directly.
  // Otherwise hand off to CSS: var() with a fallback to the default
  // means a site can set `--cookie-button-color` in globals.css and
  // the button picks it up automatically without any JSX change. If
  // neither is set, falls through to the DSIG teal default.
  const resolvedButtonColor = buttonColor ?? `var(--cookie-button-color, ${CONFIG.defaultButtonColor})`
  const [panelOpen, setPanelOpen] = useState(false)

  useEffect(() => {
    const existing = readConsent()
    if (existing) {
      setConsent(existing)
      setPanelOpen(false)
    } else {
      setConsent('unset')
      setPanelOpen(true)  // first visit -- show stoplight immediately
    }
  }, [])

  const choose = useCallback((tier: ConsentTier) => {
    setConsent(tier)
    setPanelOpen(false)
    try {
      localStorage.setItem(CONFIG.storageKey, tier)
    } catch {
      // localStorage blocked -- cookie still persists choice
    }
    setConsentCookie(tier)
    // Notify analytics/marketing scripts listening for consent changes
    window.dispatchEvent(new CustomEvent('dsig:consent-changed', { detail: { tier } }))
  }, [])

  // Hide entirely until we've checked storage (prevents flash of stoplight
  // for returning visitors who already chose).
  if (consent === null) return null

  return (
    <>
      {/* Trigger button -- visible whenever the panel is closed */}
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

      {/* Stoplight panel -- visible while choosing */}
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
              width: 'min(320px, calc(100vw - 32px))',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
            role="dialog"
            aria-label="Cookie preferences"
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>
                Cookie preferences
              </h2>
              {/* Close X is intentionally only shown if a choice already exists.
                  On first visit, the visitor must pick a tier (can't dismiss). */}
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

            {/* The three circles -- the "stoplight" */}
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

            {/* Tier descriptions rendered inline. CIPA defensibility:
                consent must be informed at the moment of choice, and
                `title=` tooltips don't display on touch devices — so
                phone visitors never saw the disclosure before tapping.
                Description list expands as the visitor hovers/focuses
                a tier; the currently-selected (or hovered) tier's text
                shows below. Falls back to the middle tier when nothing
                is hovered so there's always something to read. */}
            <CookieDescriptions
              tiers={CONFIG.tiers}
              activeTier={hoveredTier ?? (consent !== 'unset' && consent ? consent : 'balanced')}
            />

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

// ── Inline tier description (always visible) ───────────────────────────────
// Renders the description for the currently-hovered/focused tier (or the
// already-chosen tier on subsequent opens, or balanced as default). Touch
// visitors get the text by tapping a tier circle once — the description
// updates without committing the choice.
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
