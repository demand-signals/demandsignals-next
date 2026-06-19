'use client'

// dsig-stoplight-version: v1e
// DSIG Accessibility Widget — Next.js / React drop-in
// ─────────────────────────────────────────────────────────────────────────────
// Source-of-truth: Y:\SKILLS\dsig-cookie-stoplight\components\AccessibilityWidget.tsx
// Install / update via: /stoplight slash command.
//
// Bottom-left 40×40 circular button, sits to the LEFT of the cookie
// stoplight when both are mounted (a11y at left:20, cookie at left:70).
// Click opens a left-side drawer with personal display preferences.
//
// IMPORTANT — what this widget IS and IS NOT
// ───────────────────────────────────────────
// IS:  A user-controlled set of personal display preferences (text size,
//      contrast, spacing, link highlighting, animation pause, large
//      cursor). Honors prefers-reduced-motion and prefers-contrast: more
//      OS signals on boot.
// IS NOT: A site accessibility certification. WCAG conformance is a
//      property of the site's HTML/ARIA/contrast/keyboard handling — not
//      something an overlay can provide. The drawer's footer links to
//      the site's /accessibility statement page where actual conformance
//      claims (always aspirational, never absolute) live.
//
// Why the badge was removed (was in v1a/v1b):
// "WCAG 2.1 AA Compliant" badges inside overlays are the central exhibit
// in accessibility-overlay litigation (accessiBe, UserWay, AudioEye FTC
// settlement 2024). The badge claims conformance the widget can't
// actually deliver; plaintiff testers run page scans, find any failure,
// and the badge becomes Exhibit A of false advertising on top of the
// underlying ADA Title III claim. Defensible replacement: a "personal
// preferences" footer with a link to the site's accessibility statement.
//
// Why color-blind simulation filters were removed (were in v1a/v1b):
// Filters that re-tint the whole page to simulate protanopia/etc. are
// designer demos, not aids. A user with protanopia does not want to see
// "what protanopia looks like" — that's their normal vision. Multiple
// accessibility audits flag these as actively harmful.
//
// Dependencies: framer-motion (already in every DSIG Next.js site).

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const STORAGE_KEY = 'accessibility_settings'

const DEFAULT_BUTTON_COLOR = '#1e40af'  // DSIG blue
const DEFAULT_ACCENT_COLOR = '#1e40af'

interface AccessibilityState {
  fontSize: number
  contrast: 'normal' | 'high' | 'inverted' | 'grayscale'
  cursorSize: 'normal' | 'large' | 'xlarge'
  lineHeight: 'normal' | 'increased' | 'double'
  letterSpacing: 'normal' | 'increased' | 'wide'
  highlightLinks: boolean
  readableFont: boolean
}

const DEFAULT_STATE: AccessibilityState = {
  fontSize: 100,
  contrast: 'normal',
  cursorSize: 'normal',
  lineHeight: 'normal',
  letterSpacing: 'normal',
  highlightLinks: false,
  readableFont: false,
}

const A11Y_STYLE_ID = 'a11y-widget-styles'
const A11Y_CURSOR_ID = 'a11y-cursor-styles'

// ── DOM application helpers ───────────────────────────────────────────────────

function applyFontSize(value: number) {
  document.documentElement.style.fontSize = `${value}%`
}

function applyContrast(value: AccessibilityState['contrast']) {
  const filters: Record<typeof value, string> = {
    normal: 'none',
    high: 'contrast(1.5)',
    inverted: 'invert(1)',
    grayscale: 'grayscale(1)',
  }
  document.documentElement.style.filter = filters[value]
}

function applyCursorSize(value: AccessibilityState['cursorSize']) {
  document.getElementById(A11Y_CURSOR_ID)?.remove()
  if (value === 'normal') return

  const sizes: Record<string, string> = {
    large: '32px',
    xlarge: '48px',
  }
  const size = sizes[value]
  const style = document.createElement('style')
  style.id = A11Y_CURSOR_ID
  style.textContent = `* { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 24 24'%3E%3Cpath fill='black' stroke='white' stroke-width='1' d='M4 0 L4 18 L8 14 L12 22 L14 21 L10 13 L16 13 Z'/%3E%3C/svg%3E") 0 0, auto !important; }`
  document.head.appendChild(style)
}

function applyA11yStyles(state: AccessibilityState) {
  document.getElementById(A11Y_STYLE_ID)?.remove()

  const lineHeights: Record<string, string> = {
    normal: '1.5',
    increased: '1.9',
    double: '2.4',
  }
  const letterSpacings: Record<string, string> = {
    normal: 'normal',
    increased: '0.05em',
    wide: '0.12em',
  }

  const rules: string[] = []

  if (state.lineHeight !== 'normal') {
    rules.push(`* { line-height: ${lineHeights[state.lineHeight]} !important; }`)
  }
  if (state.letterSpacing !== 'normal') {
    rules.push(`* { letter-spacing: ${letterSpacings[state.letterSpacing]} !important; }`)
  }
  if (state.highlightLinks) {
    rules.push(`a { background: #fef08a !important; color: #111 !important; text-decoration: underline !important; }`)
  }
  if (state.readableFont) {
    rules.push(`body, body * { font-family: Arial, Helvetica, sans-serif !important; }`)
  }
  // NOTE (v1d): pauseAnimations toggle removed. The boot-time
  // prefers-reduced-motion detection still applies — users who have
  // set their OS preference get reduced motion via the site's own
  // CSS @media (prefers-reduced-motion) rules, not via a global
  // animation-play-state override. The previous * { animation-play-state }
  // implementation was a sledgehammer that broke well-designed animations
  // and was redundant with OS-level signaling.

  if (rules.length === 0) return

  const style = document.createElement('style')
  style.id = A11Y_STYLE_ID
  style.textContent = rules.join('\n')
  document.head.appendChild(style)
}

// ── OS-level preference detection ──
// Honor prefers-contrast: more at boot. Users who have asserted this OS
// preference should not have to discover and click the widget — the site
// should already match their needs.
//
// prefers-reduced-motion is NOT mirrored to a widget toggle (v1d). The
// site's own CSS @media (prefers-reduced-motion) rules are the correct
// place to handle this — overriding every animation via a JS
// !important sledgehammer breaks well-designed motion and produces
// worse outcomes than a proper CSS-level response.
function detectOSPreferences(): Partial<AccessibilityState> {
  if (typeof window === 'undefined' || !window.matchMedia) return {}
  const overrides: Partial<AccessibilityState> = {}
  if (window.matchMedia('(prefers-contrast: more)').matches) {
    overrides.contrast = 'high'
  }
  return overrides
}

// ── Sub-components ────────────────────────────────────────────────────────────

const AccessIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="16" cy="4" r="1" />
    <path d="m18 19 1-7-6 1" />
    <path d="m5 8 3-3 5.5 3-2.36 3.5" />
    <path d="M4.24 14.5a5 5 0 0 0 6.88 6" />
    <path d="M13.76 17.5a5 5 0 0 0-6.88-6" />
  </svg>
)

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: '#9ca3af',
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  )
}

function OptionButton({
  active,
  onClick,
  children,
  accentColor,
  ariaLabel,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  accentColor: string
  ariaLabel?: string
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      style={{
        padding: '5px 10px',
        borderRadius: 6,
        border: active ? `1.5px solid ${accentColor}` : '1.5px solid #e5e7eb',
        background: active
          ? `color-mix(in srgb, ${accentColor} 8%, white)`
          : '#fff',
        color: active ? accentColor : '#374151',
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
        outlineOffset: 2,
      }}
    >
      {children}
    </button>
  )
}

function TogglePill({
  active,
  onClick,
  children,
  accentColor,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  accentColor: string
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: '6px 12px',
        borderRadius: 20,
        border: active ? `1.5px solid ${accentColor}` : '1.5px solid #e5e7eb',
        background: active ? accentColor : '#fff',
        color: active ? '#fff' : '#374151',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.15s',
        outlineOffset: 2,
      }}
    >
      {children}
    </button>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '16px 20px',
        borderBottom: '1px solid #f3f4f6',
      }}
    >
      {children}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export interface AccessibilityWidgetProps {
  buttonColor?: string
  accentColor?: string
  /**
   * Email to surface in the "Report an accessibility issue" link.
   * Defaults to `accessibility@<site-host>` if not provided. Pass
   * your own to override (e.g. mailto:hello@yourdomain.com).
   */
  reportEmail?: string
  /**
   * Path to the site's accessibility statement page. Defaults to
   * `/accessibility`. The drawer footer links here as the canonical
   * source for conformance claims.
   */
  statementPath?: string
}

export function AccessibilityWidget({
  buttonColor,
  accentColor,
  reportEmail,
  statementPath = '/accessibility',
}: AccessibilityWidgetProps = {}) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<AccessibilityState>(DEFAULT_STATE)
  const drawerRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  const resolvedButtonColor = buttonColor
    ?? `var(--a11y-button-color, ${DEFAULT_BUTTON_COLOR})`
  const resolvedAccentColor = accentColor
    ?? `var(--a11y-accent-color, ${buttonColor ?? `var(--a11y-button-color, ${DEFAULT_ACCENT_COLOR})`})`

  // Load on mount: stored state wins; fall through to OS preferences.
  useEffect(() => {
    const osDefaults = detectOSPreferences()
    let initial: AccessibilityState = { ...DEFAULT_STATE, ...osDefaults }

    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AccessibilityState
        // Stored choice fully overrides OS — visitor's explicit pick wins.
        initial = parsed
      } catch { /* ignore parse errors */ }
    }

    setState(initial)
    applyFontSize(initial.fontSize)
    applyContrast(initial.contrast)
    applyCursorSize(initial.cursorSize)
    applyA11yStyles(initial)
  }, [])

  // Focus trap + Escape handling on drawer open.
  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    // Move focus into the drawer after open animation settles.
    const focusTimer = setTimeout(() => {
      const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      firstFocusable?.focus()
    }, 50)

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        return
      }
      if (e.key !== 'Tab' || !drawerRef.current) return
      const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKey)
      previouslyFocused?.focus?.()
    }
  }, [open])

  const update = useCallback(
    (changes: Partial<AccessibilityState>) => {
      setState((prev) => {
        const next = { ...prev, ...changes }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))

        if ('fontSize' in changes) applyFontSize(next.fontSize)
        if ('contrast' in changes) applyContrast(next.contrast)
        if ('cursorSize' in changes) applyCursorSize(next.cursorSize)

        const styleKeys: (keyof AccessibilityState)[] = [
          'lineHeight',
          'letterSpacing',
          'highlightLinks',
          'readableFont',
        ]
        if (styleKeys.some((k) => k in changes)) applyA11yStyles(next)

        return next
      })
    },
    []
  )

  const resetAll = () => {
    setState(DEFAULT_STATE)
    localStorage.removeItem(STORAGE_KEY)
    applyFontSize(DEFAULT_STATE.fontSize)
    applyContrast(DEFAULT_STATE.contrast)
    applyCursorSize(DEFAULT_STATE.cursorSize)
    document.getElementById(A11Y_STYLE_ID)?.remove()
  }

  // Compute defensible mailto link. Falls through to a generic
  // accessibility@<host> if no override is provided.
  const computedReportEmail = reportEmail
    ?? (typeof window !== 'undefined'
        ? `mailto:accessibility@${window.location.hostname.replace(/^www\./, '')}`
        : 'mailto:accessibility@example.com')

  return (
    <>
      {/* Trigger button */}
      <div style={{ position: 'fixed', bottom: 20, left: 20, zIndex: 90 }}>
        <button
          ref={triggerRef}
          onClick={() => setOpen(true)}
          title="Display preferences"
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
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            transition: 'transform 0.2s',
            outlineOffset: 2,
          }}
          aria-label="Open display preferences"
        >
          <AccessIcon />
        </button>
      </div>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="a11y-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.2)',
                zIndex: 95,
              }}
            />

            <motion.div
              key="a11y-panel"
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="a11y-drawer-title"
              initial={{ x: -400 }}
              animate={{ x: 0 }}
              exit={{ x: -400 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: 'min(400px, 100vw)',
                height: '100%',
                background: '#fff',
                zIndex: 96,
                boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '18px 20px 14px',
                  borderBottom: '1px solid #e5e7eb',
                  position: 'sticky',
                  top: 0,
                  background: '#fff',
                  zIndex: 1,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ color: resolvedAccentColor }}>
                      <AccessIcon />
                    </span>
                    <h2 id="a11y-drawer-title" style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' }}>
                      Display preferences
                    </h2>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>
                    Personal adjustments for this site
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close display preferences"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#6b7280',
                    padding: 4,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    outlineOffset: 2,
                  }}
                >
                  <CloseIcon />
                </button>
              </div>

              {/* Text Size */}
              <Section>
                <SectionTitle>Text size</SectionTitle>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={() => update({ fontSize: Math.max(80, state.fontSize - 10) })}
                    aria-label="Decrease text size"
                    style={circleBtn}
                  >
                    −
                  </button>
                  <span aria-live="polite" style={{ minWidth: 48, textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#111827' }}>
                    {state.fontSize}%
                  </span>
                  <button
                    onClick={() => update({ fontSize: Math.min(150, state.fontSize + 10) })}
                    aria-label="Increase text size"
                    style={circleBtn}
                  >
                    +
                  </button>
                </div>
              </Section>

              {/* Contrast */}
              <Section>
                <SectionTitle>Contrast</SectionTitle>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(['normal', 'high', 'inverted', 'grayscale'] as const).map((v) => (
                    <OptionButton
                      key={v}
                      active={state.contrast === v}
                      onClick={() => update({ contrast: v })}
                      accentColor={resolvedAccentColor}
                      ariaLabel={`Contrast: ${v}`}
                    >
                      {v === 'normal' ? 'Normal' : v === 'high' ? 'High contrast' : v === 'inverted' ? 'Inverted' : 'Grayscale'}
                    </OptionButton>
                  ))}
                </div>
              </Section>

              {/* Cursor Size */}
              <Section>
                <SectionTitle>Cursor size</SectionTitle>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['normal', 'large', 'xlarge'] as const).map((v) => (
                    <OptionButton
                      key={v}
                      active={state.cursorSize === v}
                      onClick={() => update({ cursorSize: v })}
                      accentColor={resolvedAccentColor}
                      ariaLabel={`Cursor size: ${v}`}
                    >
                      {v === 'normal' ? 'Normal' : v === 'large' ? 'Large' : 'Extra large'}
                    </OptionButton>
                  ))}
                </div>
              </Section>

              {/* Line Spacing */}
              <Section>
                <SectionTitle>Line spacing</SectionTitle>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['normal', 'increased', 'double'] as const).map((v) => (
                    <OptionButton
                      key={v}
                      active={state.lineHeight === v}
                      onClick={() => update({ lineHeight: v })}
                      accentColor={resolvedAccentColor}
                      ariaLabel={`Line spacing: ${v}`}
                    >
                      {v === 'normal' ? 'Normal' : v === 'increased' ? 'Increased' : 'Double'}
                    </OptionButton>
                  ))}
                </div>
              </Section>

              {/* Letter Spacing */}
              <Section>
                <SectionTitle>Letter spacing</SectionTitle>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['normal', 'increased', 'wide'] as const).map((v) => (
                    <OptionButton
                      key={v}
                      active={state.letterSpacing === v}
                      onClick={() => update({ letterSpacing: v })}
                      accentColor={resolvedAccentColor}
                      ariaLabel={`Letter spacing: ${v}`}
                    >
                      {v === 'normal' ? 'Normal' : v === 'increased' ? 'Increased' : 'Wide'}
                    </OptionButton>
                  ))}
                </div>
              </Section>

              {/* Additional Options */}
              <Section>
                <SectionTitle>Additional options</SectionTitle>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <TogglePill
                    active={state.highlightLinks}
                    onClick={() => update({ highlightLinks: !state.highlightLinks })}
                    accentColor={resolvedAccentColor}
                  >
                    Highlight links
                  </TogglePill>
                  <TogglePill
                    active={state.readableFont}
                    onClick={() => update({ readableFont: !state.readableFont })}
                    accentColor={resolvedAccentColor}
                  >
                    Readable font
                  </TogglePill>
                </div>
              </Section>

              {/* Reset */}
              <div style={{ padding: '16px 20px' }}>
                <button
                  onClick={resetAll}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 8,
                    border: '1.5px solid #e5e7eb',
                    background: '#fff',
                    color: '#374151',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    outlineOffset: 2,
                  }}
                >
                  Reset all preferences
                </button>
              </div>

              {/* Defensible footer — replaces the old "WCAG 2.1 AA Compliant"
                  badge. The conformance claim, if any, lives on the
                  /accessibility statement page where it can be qualified
                  ("aspirational," "actively working toward," dated). */}
              <div style={{
                padding: '14px 20px 24px',
                background: '#f9fafb',
                borderTop: '1px solid #f3f4f6',
              }}>
                <p style={{
                  margin: '0 0 10px',
                  fontSize: 11,
                  color: '#6b7280',
                  lineHeight: 1.5,
                }}>
                  These are personal display preferences. They do not certify the site&rsquo;s accessibility.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <a
                    href={statementPath}
                    style={{ fontSize: 11, color: resolvedAccentColor as string, textDecoration: 'underline' }}
                  >
                    Read our accessibility statement
                  </a>
                  <a
                    href={computedReportEmail}
                    style={{ fontSize: 11, color: resolvedAccentColor as string, textDecoration: 'underline' }}
                  >
                    Report an accessibility issue
                  </a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

const circleBtn: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: '50%',
  border: '1.5px solid #e5e7eb',
  background: '#fff',
  cursor: 'pointer',
  fontSize: 18,
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#374151',
  outlineOffset: 2,
}
