// ── pdf/render.ts ─────────────────────────────────────────────────────
// Core HTML → PDF conversion. Takes a self-contained HTML string and
// returns a raw PDF Buffer. All callers (sow.ts, invoice.ts, receipt.ts)
// call this function — it is the only place Chromium is launched.

import { launchChromium } from './chromium'

export interface PdfOptions {
  /** Page size. Defaults to 'Legal' (612×1008pt). */
  format?: 'Letter' | 'Legal' | 'A4'
  /** Page margins. Default: all zero (templates handle their own padding). */
  margin?: { top: string; bottom: string; left: string; right: string }
  /** Whether to render CSS backgrounds. Default: true. */
  printBackground?: boolean
}

export async function htmlToPdfBuffer(
  html: string,
  options: PdfOptions = {},
): Promise<Buffer> {
  const browser = await launchChromium()
  try {
    const page = await browser.newPage()
    // waitUntil: 'networkidle0' ensures external images (logo URL) finish loading
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const buf = await page.pdf({
      format: options.format ?? 'Legal',
      printBackground: options.printBackground ?? true,
      margin: options.margin ?? { top: '0', bottom: '0', left: '0', right: '0' },
    })
    return Buffer.from(buf)
  } finally {
    await browser.close()
  }
}
