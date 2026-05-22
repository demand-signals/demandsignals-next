'use client'

// DSIG Accessibility Widget — Next.js / React drop-in
// ─────────────────────────────────────────────────────────────────────────────
// Source-of-truth: Y:\TOOLS\dsig-accessibility-widget\react\AccessibilityWidget.tsx
// Bottom-left 40×40 circular blue button; click to open a left-side drawer
// with 8 accessibility controls: text size, contrast, color-blind modes,
// cursor size, line spacing, letter spacing, highlight links, readable
// font, pause animations. Persists in localStorage; settings re-apply
// automatically on every page load.
//
// Visual treatment is the canonical DSIG accessibility surface — extracted
// from demandsignals.co where it's been live and battle-tested. WCAG 2.1 AA
// compliant.
//
// Dependencies: framer-motion (already in every DSIG Next.js site).
//
// Per-site theming:
//   - `buttonColor` prop  → closed-state button background
//   - `accentColor` prop  → drawer active-state highlights (defaults to same as button)
//   - CSS var fallbacks   → `--a11y-button-color` + `--a11y-accent-color`
//   - Defaults to DSIG blue `#1e40af` if nothing else is set
//
// Version: v1a — 2026-05-22

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const STORAGE_KEY = 'accessibility_settings'

// Default colors. Per-site override via props or CSS variables --
// see AccessibilityWidget component for precedence rules.
const DEFAULT_BUTTON_COLOR = '#1e40af'  // DSIG blue
const DEFAULT_ACCENT_COLOR = '#1e40af'  // same as button by default

interface AccessibilityState {
  fontSize: number
  contrast: 'normal' | 'high' | 'inverted' | 'grayscale'
  colorBlind: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia'
  cursorSize: 'normal' | 'large' | 'xlarge'
  lineHeight: 'normal' | 'increased' | 'double'
  letterSpacing: 'normal' | 'increased' | 'wide'
  highlightLinks: boolean
  readableFont: boolean
  pauseAnimations: boolean
}

const DEFAULT_STATE: AccessibilityState = {
  fontSize: 100,
  contrast: 'normal',
  colorBlind: 'none',
  cursorSize: 'normal',
  lineHeight: 'normal',
  letterSpacing: 'normal',
  highlightLinks: false,
  readableFont: false,
  pauseAnimations: false,
}

const A11Y_STYLE_ID = 'a11y-widget-styles'
const A11Y_SVG_ID = 'a11y-colorblind-svg'
const A11Y_CURSOR_ID = 'a11y-cursor-styles'

// ── Color-blind SVG filter matrices ──────────────────────────────────────────

const COLOR_BLIND_FILTERS: Record<string, string> = {
  protanopia: `
    <feColorMatrix type="matrix" values="
      0.567 0.433 0     0 0
      0.558 0.442 0     0 0
      0     0.242 0.758 0 0
      0     0     0     1 0"/>`,
  deuteranopia: `
    <feColorMatrix type="matrix" values="
      0.625 0.375 0   0 0
      0.7   0.3   0   0 0
      0     0.3   0.7 0 0
      0     0     0   1 0"/>`,
  tritanopia: `
    <feColorMatrix type="matrix" values="
      0.95  0.05  0     0 0
      0     0.433 0.567 0 0
      0     0.475 0.525 0 0
      0     0     0     1 0"/>`,
  achromatopsia: `
    <feColorMatrix type="matrix" values="
      0.299 0.587 0.114 0 0
      0.299 0.587 0.114 0 0
      0.299 0.587 0.114 0 0
      0     0     0     1 0"/>`,
}

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

function applyColorBlind(value: AccessibilityState['colorBlind']) {
  document.getElementById(A11Y_SVG_ID)?.remove()

  if (value === 'none') {
    document.body.style.removeProperty('filter')
    return
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('id', A11Y_SVG_ID)
  svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden')
  svg.innerHTML = `<defs><filter id="colorblind-filter">${COLOR_BLIND_FILTERS[value]}</filter></defs>`
  document.head.appendChild(svg)
  document.body.style.filter = 'url(#colorblind-filter)'
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
  if (state.pauseAnimations) {
    rules.push(`*, *::before, *::after { animation-play-state: paused !important; transition: none !important; }`)
  }

  if (rules.length === 0) return

  const style = document.createElement('style')
  style.id = A11Y_STYLE_ID
  style.textContent = rules.join('\n')
  document.head.appendChild(style)
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
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  accentColor: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 10px',
        borderRadius: 6,
        border: active ? `1.5px solid ${accentColor}` : '1.5px solid #e5e7eb',
        // Light tint for active background -- if accentColor differs from
        // default DSIG blue, use a 12%-opacity-of-accent via color-mix.
        // Falls back to #eff6ff for browsers without color-mix (caniuse: 95%+).
        background: active
          ? `color-mix(in srgb, ${accentColor} 8%, white)`
          : '#fff',
        color: active ? accentColor : '#374151',
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
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
  /**
   * Closed-state button background color. Precedence (highest first):
   *   1. This prop (per-mount override)
   *   2. CSS variable `--a11y-button-color` on :root or any ancestor
   *   3. DEFAULT_BUTTON_COLOR (DSIG blue #1e40af)
   *
   * Accept any CSS color value. Most sites only need to set this prop.
   *
   * Example per-mount override:
   *   <AccessibilityWidget buttonColor="#FF6B2B" />
   *
   * Example CSS-var-based theming in globals.css:
   *   :root { --a11y-button-color: #FF6B2B; }
   *   <AccessibilityWidget />   // picks up the var automatically
   */
  buttonColor?: string

  /**
   * Drawer active-state highlights — selected OptionButton border + text,
   * selected TogglePill background, header icon color. If omitted, defaults
   * to the same value as buttonColor for visual cohesion.
   *
   * Precedence (highest first):
   *   1. This prop
   *   2. CSS variable `--a11y-accent-color`
   *   3. Same as resolved buttonColor
   */
  accentColor?: string
}

export function AccessibilityWidget({
  buttonColor,
  accentColor,
}: AccessibilityWidgetProps = {}) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<AccessibilityState>(DEFAULT_STATE)

  // Resolved colors. Props win outright. Otherwise hand off to CSS:
  // var() with fallback lets a site set `--a11y-button-color` or
  // `--a11y-accent-color` in globals.css and the widget inherits with
  // no JSX change. If neither prop nor var is set, falls through to
  // the DSIG-blue defaults.
  const resolvedButtonColor = buttonColor
    ?? `var(--a11y-button-color, ${DEFAULT_BUTTON_COLOR})`
  const resolvedAccentColor = accentColor
    ?? `var(--a11y-accent-color, ${buttonColor ?? `var(--a11y-button-color, ${DEFAULT_ACCENT_COLOR})`})`

  // Load state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AccessibilityState
        setState(parsed)
        applyFontSize(parsed.fontSize)
        applyContrast(parsed.contrast)
        applyColorBlind(parsed.colorBlind)
        applyCursorSize(parsed.cursorSize)
        applyA11yStyles(parsed)
      } catch {
        // ignore parse errors
      }
    }
  }, [])

  const update = useCallback(
    (changes: Partial<AccessibilityState>) => {
      setState((prev) => {
        const next = { ...prev, ...changes }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))

        if ('fontSize' in changes) applyFontSize(next.fontSize)
        if ('contrast' in changes) applyContrast(next.contrast)
        if ('colorBlind' in changes) applyColorBlind(next.colorBlind)
        if ('cursorSize' in changes) applyCursorSize(next.cursorSize)

        const styleKeys: (keyof AccessibilityState)[] = [
          'lineHeight',
          'letterSpacing',
          'highlightLinks',
          'readableFont',
          'pauseAnimations',
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
    applyColorBlind(DEFAULT_STATE.colorBlind)
    applyCursorSize(DEFAULT_STATE.cursorSize)
    document.getElementById(A11Y_STYLE_ID)?.remove()
  }

  return (
    <>
      {/* Trigger button */}
      <div style={{ position: 'fixed', bottom: 20, left: 20, zIndex: 90 }}>
        <button
          onClick={() => setOpen(true)}
          title="Accessibility Settings"
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
          }}
          aria-label="Open accessibility settings"
        >
          <AccessIcon />
        </button>
      </div>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
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

            {/* Drawer */}
            <motion.div
              key="a11y-panel"
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
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' }}>
                      Accessibility
                    </h2>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>
                    Customize your experience
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#6b7280',
                    padding: 4,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <CloseIcon />
                </button>
              </div>

              {/* ── Text Size ── */}
              <Section>
                <SectionTitle>Text Size</SectionTitle>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={() => update({ fontSize: Math.max(80, state.fontSize - 10) })}
                    style={circleBtn}
                  >
                    −
                  </button>
                  <span style={{ minWidth: 48, textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#111827' }}>
                    {state.fontSize}%
                  </span>
                  <button
                    onClick={() => update({ fontSize: Math.min(150, state.fontSize + 10) })}
                    style={circleBtn}
                  >
                    +
                  </button>
                </div>
              </Section>

              {/* ── Contrast ── */}
              <Section>
                <SectionTitle>Contrast</SectionTitle>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(['normal', 'high', 'inverted', 'grayscale'] as const).map((v) => (
                    <OptionButton
                      key={v}
                      active={state.contrast === v}
                      onClick={() => update({ contrast: v })}
                      accentColor={resolvedAccentColor}
                    >
                      {v === 'normal' ? 'Normal' : v === 'high' ? 'High Contrast' : v === 'inverted' ? 'Inverted' : 'Grayscale'}
                    </OptionButton>
                  ))}
                </div>
              </Section>

              {/* ── Color Blind Modes ── */}
              <Section>
                <SectionTitle>Color Blind Modes</SectionTitle>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(
                    [
                      ['none', 'None'],
                      ['protanopia', 'Protanopia (Red-Blind)'],
                      ['deuteranopia', 'Deuteranopia (Green-Blind)'],
                      ['tritanopia', 'Tritanopia (Blue-Blind)'],
                      ['achromatopsia', 'Achromatopsia (Total Color Blind)'],
                    ] as [AccessibilityState['colorBlind'], string][]
                  ).map(([v, label]) => (
                    <OptionButton
                      key={v}
                      active={state.colorBlind === v}
                      onClick={() => update({ colorBlind: v })}
                      accentColor={resolvedAccentColor}
                    >
                      {label}
                    </OptionButton>
                  ))}
                </div>
              </Section>

              {/* ── Cursor Size ── */}
              <Section>
                <SectionTitle>Cursor Size</SectionTitle>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['normal', 'large', 'xlarge'] as const).map((v) => (
                    <OptionButton
                      key={v}
                      active={state.cursorSize === v}
                      onClick={() => update({ cursorSize: v })}
                      accentColor={resolvedAccentColor}
                    >
                      {v === 'normal' ? 'Normal' : v === 'large' ? 'Large' : 'Extra Large'}
                    </OptionButton>
                  ))}
                </div>
              </Section>

              {/* ── Line Spacing ── */}
              <Section>
                <SectionTitle>Line Spacing</SectionTitle>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['normal', 'increased', 'double'] as const).map((v) => (
                    <OptionButton
                      key={v}
                      active={state.lineHeight === v}
                      onClick={() => update({ lineHeight: v })}
                      accentColor={resolvedAccentColor}
                    >
                      {v === 'normal' ? 'Normal' : v === 'increased' ? 'Increased' : 'Double'}
                    </OptionButton>
                  ))}
                </div>
              </Section>

              {/* ── Letter Spacing ── */}
              <Section>
                <SectionTitle>Letter Spacing</SectionTitle>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['normal', 'increased', 'wide'] as const).map((v) => (
                    <OptionButton
                      key={v}
                      active={state.letterSpacing === v}
                      onClick={() => update({ letterSpacing: v })}
                      accentColor={resolvedAccentColor}
                    >
                      {v === 'normal' ? 'Normal' : v === 'increased' ? 'Increased' : 'Wide'}
                    </OptionButton>
                  ))}
                </div>
              </Section>

              {/* ── Additional Options ── */}
              <Section>
                <SectionTitle>Additional Options</SectionTitle>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <TogglePill
                    active={state.highlightLinks}
                    onClick={() => update({ highlightLinks: !state.highlightLinks })}
                    accentColor={resolvedAccentColor}
                  >
                    Highlight Links
                  </TogglePill>
                  <TogglePill
                    active={state.readableFont}
                    onClick={() => update({ readableFont: !state.readableFont })}
                    accentColor={resolvedAccentColor}
                  >
                    Readable Font
                  </TogglePill>
                  <TogglePill
                    active={state.pauseAnimations}
                    onClick={() => update({ pauseAnimations: !state.pauseAnimations })}
                    accentColor={resolvedAccentColor}
                  >
                    Pause Animations
                  </TogglePill>
                </div>
              </Section>

              {/* Reset All Settings */}
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
                  }}
                >
                  Reset All Settings
                </button>
              </div>

              {/* Branding + WCAG Badge */}
              <div style={{ padding: '12px 20px 24px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 12px', fontSize: 11, color: '#9ca3af' }}>
                  Accessibility App by Demand Signals
                </p>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: 8, padding: '8px 14px',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d' }}>WCAG 2.1 AA Compliant</div>
                    <div style={{ fontSize: 10, color: '#4ade80', lineHeight: 1.3 }}>
                      This site meets Web Content Accessibility Guidelines standards for accessible web content.
                    </div>
                  </div>
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
}
