// ── pdf/_shared.ts ───────────────────────────────────────────────────
// Shared brand tokens, escape helpers, HTML partials, and the base HTML
// document shell used by every PDF template. All CSS is inlined.
// Conforms to DSIG PDF Generation Standard v2.

// ── Brand tokens — DSIG PDF Standard v2 exact hex values ─────────────
export const T = {
  // Primary structure
  SLATE:      '#3D4566',   // dark slate — primary dark, table headers, cover bg
  SLATE_MID:  '#4A5578',   // decorative circles (~35% opacity)
  // Accents
  TEAL:       '#52C9A0',   // accent headlines, eyebrow labels
  TEAL_S:     '#3ECFAA',   // alt teal — stat box values, callout borders
  ORANGE:     '#FF6B2B',   // CTA buttons
  ORANGE_S:   '#F26419',   // dividers under H1, alert bg, pill badge
  // Neutrals
  WHITE:      '#FFFFFF',
  OFF_WHITE:  '#F8F9FA',   // alt table rows, light cards
  GRAY:       '#888888',   // captions, eyebrows, footer
  BODY:       '#333333',   // body copy
  BORDER:     '#E2E8F0',   // table grid, card borders
  RULE:       '#DDDDDD',   // header/footer separators
  // Status
  RED:        '#E53935',   // critical badges
  // Callout backgrounds
  VLO:        '#FFF8F5',   // orange callout bg
  VLT:        '#F0FDF8',   // teal callout bg
  // Misc
  CCCC:       '#CCCCCC',   // stat labels, cover subtext
  MUTED:      '#666666',   // copyright
} as const

// Legacy alias kept for any external callers that still reference T.teal etc.
// Remove these once invoice-pdf/sow-pdf legacy files are cleaned up.
export const LEGACY_T = {
  teal:       T.TEAL,
  tealDark:   T.TEAL_S,
  tealSoft:   `rgba(82,201,160,0.08)`,
  orange:     T.ORANGE_S,
  orangeDeep: T.ORANGE,
  dark:       T.SLATE,
  dark2:      '#2D3455',
  slate:      '#5d6780',
  slateSoft:  T.GRAY,
  bgWarm:     T.OFF_WHITE,
  light:      '#F4F6F9',
  rule:       T.BORDER,
  white:      T.WHITE,
}

export const LOGO_URL = 'https://demandsignals.us/assets/logos/dsig_logo_v2b.png'

/** Helvetica/Arial system font stack — per DSIG PDF Standard v2 */
export const FONT_STACK = 'Helvetica, Arial, sans-serif'

/** HTML-escape a plain string for safe embedding */
export function esc(s: string | null | undefined): string {
  if (!s) return ''
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]!))
}

/** Preserve newlines as <br> after escaping */
export function escNl(s: string | null | undefined): string {
  return esc(s).replace(/\n/g, '<br>')
}

// ── Reusable HTML partials ────────────────────────────────────────────

/**
 * Absolute-positioned decorative circles for dark covers.
 * Large circle upper-right, small circle lower-left — per v2 spec.
 */
export function decorativeCircles(): string {
  return `
  <!-- Decorative circle: large upper-right -->
  <div style="
    position:absolute;
    top:-90px;
    right:-90px;
    width:360px;
    height:360px;
    border-radius:50%;
    background:rgba(74,85,120,0.35);
    pointer-events:none;
  "></div>
  <!-- Decorative circle: small lower-left -->
  <div style="
    position:absolute;
    bottom:-60px;
    left:-60px;
    width:240px;
    height:240px;
    border-radius:50%;
    background:rgba(74,85,120,0.35);
    pointer-events:none;
  "></div>`
}

/**
 * Eyebrow label: spaced caps in TEAL (or custom color).
 * 8pt (~11px), letter-spacing 0.35em, uppercase.
 */
export function eyebrow(text: string, color: string = T.TEAL): string {
  return `<p style="
    font-size:11px;
    font-weight:400;
    letter-spacing:0.35em;
    text-transform:uppercase;
    color:${color};
    margin:0 0 10px 0;
    font-family:${FONT_STACK};
  ">${esc(text)}</p>`
}

/**
 * Orange divider: 2pt × 50pt, ORANGE_S — goes directly under H1.
 */
export function oDiv(): string {
  return `<div style="
    width:50pt;
    height:2pt;
    background:${T.ORANGE_S};
    margin:8px 0 16px 0;
  "></div>`
}

/**
 * Interior-page header: gradient bar + logo + section label + separator.
 * Rendered at the top of every interior (non-cover) page.
 * sectionLabel example: "01 — SCOPE"
 */
export function interiorPageHeader(sectionLabel: string): string {
  return `
  <div class="interior-header" style="flex-shrink:0">
    <!-- Gradient bar: 4pt orange→teal -->
    <div style="
      height:5px;
      background:linear-gradient(90deg, ${T.ORANGE_S} 0%, ${T.TEAL} 100%);
      width:100%;
    "></div>
    <!-- Logo row -->
    <div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:10px 54px 8px;
    ">
      <img src="${LOGO_URL}" alt="Demand Signals" style="height:28px;object-fit:contain;">
      <span style="
        font-size:10px;
        font-weight:400;
        letter-spacing:0.25em;
        text-transform:uppercase;
        color:${T.GRAY};
        font-family:${FONT_STACK};
      ">${esc(sectionLabel)}</span>
    </div>
    <!-- Separator -->
    <div style="height:0.5pt;background:${T.RULE};margin:0 54px;"></div>
  </div>`
}

/**
 * Interior-page footer: separator + centered attribution text.
 * Page number omitted — Chromium's @page counter-based numbering is unreliable
 * in inline-HTML mode; Confidential text is sufficient per spec note.
 */
export function interiorPageFooter(): string {
  return `
  <div class="interior-footer" style="flex-shrink:0">
    <div style="height:0.5pt;background:${T.RULE};margin:0 54px;"></div>
    <p style="
      font-size:10px;
      color:${T.GRAY};
      text-align:center;
      padding:10px 54px;
      font-family:${FONT_STACK};
    ">Demand Signals — Confidential &nbsp;|&nbsp; DemandSignals.co</p>
  </div>`
}

/** Wrap a full HTML document. Legal format, Helvetica, zero margins. */
export function docShell(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; }
  body {
    font-family: ${FONT_STACK};
    font-size: 13px;
    line-height: 1.6;
    color: ${T.BODY};
    background: ${T.WHITE};
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  @page { margin: 0; size: Legal; }
</style>
</head>
<body>${body}</body>
</html>`
}
