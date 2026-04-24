// ── pdf/_shared.ts ───────────────────────────────────────────────────
// Shared brand tokens, escape helpers, and the base HTML document shell
// used by every PDF template. All CSS is inlined — no external stylesheets.

// ── Brand tokens ─────────────────────────────────────────────────────
export const T: Record<string, string> = {
  teal:       '#68c5ad',
  tealDark:   '#4fa894',
  tealSoft:   'rgba(104,197,173,0.08)',
  orange:     '#f28500',
  orangeDeep: '#FF6B2B',
  dark:       '#1d2330',
  dark2:      '#252c3d',
  slate:      '#5d6780',
  slateSoft:  '#94a0b8',
  bgWarm:     '#fafbfc',
  light:      '#f4f6f9',
  rule:       '#e2e8f0',
  white:      '#ffffff',
}

export const LOGO_URL = 'https://demandsignals.us/assets/logos/dsig_logo_v2b.png'

/** System font stack — Inter preferred; no external font load needed */
export const FONT_STACK = `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`

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

/** Wrap a full HTML document. Chromium renders this; no runtime CSS needed. */
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
    font-size: 14px;
    line-height: 1.6;
    color: ${T.dark};
    background: ${T.white};
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  @page { margin: 0; size: Letter; }
</style>
</head>
<body>${body}</body>
</html>`
}
