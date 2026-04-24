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
 * Eyebrow label: sentence-case in ORANGE_S (or custom color).
 * 12px semibold, normal letter/word spacing, no uppercase transform.
 * NOTE: text is embedded raw (no esc()) — callers must pass literal/safe strings.
 * This avoids double-escaping when callers pass hardcoded labels.
 */
export function eyebrow(text: string, color: string = T.ORANGE_S): string {
  return `<p style="
    font-size:12px;
    font-weight:600;
    letter-spacing:normal;
    word-spacing:normal;
    text-transform:none;
    color:${color};
    margin:0 0 10px 0;
    font-family:${FONT_STACK};
  ">${text}</p>`
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
        font-size:11px;
        font-weight:600;
        letter-spacing:normal;
        word-spacing:normal;
        text-transform:none;
        color:${T.ORANGE_S};
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

// ── Dark cover shared chrome ──────────────────────────────────────────
// These three helpers render the identical top strip, meta band, and footer
// strip used on both the front cover and rear cover of SOW/invoice PDFs.

/**
 * Dark cover top strip: logo left + PROPOSAL pill right.
 * Identical on front and back cover — extracted to avoid duplication.
 */
export function darkCoverTopStrip(): string {
  return `
  <div style="
    position:relative;
    z-index:1;
    display:flex;
    justify-content:space-between;
    align-items:center;
    padding:54px 56px 0;
    flex-shrink:0;
  ">
    <img src="${LOGO_URL}" alt="Demand Signals" style="height:36px;object-fit:contain;">
    <span style="
      background:${T.ORANGE_S};
      color:${T.WHITE};
      font-size:9px;
      font-weight:700;
      letter-spacing:0.2em;
      text-transform:uppercase;
      padding:5px 16px;
      border-radius:17px;
    ">PROPOSAL</span>
  </div>`
}

/**
 * Dark cover meta band: 3-column PREPARED FOR | PREPARED BY | DATE.
 * Semi-transparent dark overlay over the SLATE background.
 */
export function darkCoverMetaBand(
  preparedFor: string,
  preparedBy: string,
  issueDate: string,
): string {
  function metaCol(label: string, value: string, isLast = false): string {
    return `
    <div style="
      flex:1;
      padding:0 28px;
      ${!isLast ? `border-right:1px solid rgba(255,255,255,0.12);` : ''}
    ">
      <p style="
        font-size:8px;
        font-weight:400;
        letter-spacing:0.1em;
        word-spacing:normal;
        text-transform:uppercase;
        color:${T.GRAY};
        margin-bottom:6px;
        font-family:${FONT_STACK};
      ">${label}</p>
      <p style="
        font-size:13px;
        font-weight:700;
        color:${T.WHITE};
        line-height:1.25;
        font-family:${FONT_STACK};
      ">${value}</p>
    </div>`
  }

  return `
  <div style="
    background:rgba(0,0,0,0.25);
    padding:24px 28px;
    display:flex;
    gap:0;
  ">
    ${metaCol('PREPARED FOR', preparedFor)}
    ${metaCol('PREPARED BY', preparedBy)}
    ${metaCol('DATE', issueDate, true)}
  </div>`
}

/**
 * Dark cover footer strip: domain + phone left, PROPOSAL pill right.
 */
export function darkCoverFooterStrip(): string {
  return `
  <div style="
    padding:12px 56px;
    display:flex;
    justify-content:space-between;
    align-items:center;
  ">
    <p style="font-size:9px;color:${T.GRAY};font-family:${FONT_STACK};">DemandSignals.co &nbsp;|&nbsp; (916) 542-2423</p>
    <span style="
      background:${T.ORANGE_S};
      color:${T.WHITE};
      font-size:9px;
      font-weight:700;
      letter-spacing:0.15em;
      text-transform:uppercase;
      padding:3px 12px;
      border-radius:17px;
    ">PROPOSAL</span>
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
