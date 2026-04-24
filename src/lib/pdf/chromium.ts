// ── pdf/chromium.ts ───────────────────────────────────────────────────
// Chromium launcher: serverless (@sparticuz/chromium + puppeteer-core) in
// production; falls back to local puppeteer (which ships its own Chrome)
// in development. Both return a puppeteer-core Browser instance.

import puppeteer from 'puppeteer-core'
import type { Browser } from 'puppeteer-core'

export async function launchChromium(): Promise<Browser> {
  const isServerless =
    !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME

  if (isServerless) {
    // @sparticuz/chromium provides args + executablePath for serverless runtimes.
    // Note: newer versions of @sparticuz/chromium do not export defaultViewport.
    const chromium = (await import('@sparticuz/chromium')).default
    // v147+: pass a remote URL so the binary is fetched + cached in /tmp on cold start.
    // /var/task is read-only in Vercel serverless; bundled-binary path fails.
    const remotePack =
      'https://github.com/Sparticuz/chromium/releases/download/v147.0.2/chromium-v147.0.2-pack.x64.tar'
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 960 },
      executablePath: await chromium.executablePath(remotePack),
      headless: true,
    }) as unknown as Browser
  }

  // Dev: prefer the full puppeteer package (it downloads Chrome during npm install)
  try {
    const localPuppeteer = await import('puppeteer')
    return (localPuppeteer as any).launch({ headless: true }) as unknown as Browser
  } catch {
    // Last-resort dev path: sparticuz executable (works on macOS/Linux dev)
    const chromium = (await import('@sparticuz/chromium')).default
    // v147+: pass a remote URL so the binary is fetched + cached in /tmp on cold start.
    // /var/task is read-only in Vercel serverless; bundled-binary path fails.
    const remotePack =
      'https://github.com/Sparticuz/chromium/releases/download/v147.0.2/chromium-v147.0.2-pack.x64.tar'
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 960 },
      executablePath: await chromium.executablePath(remotePack),
      headless: true,
    }) as unknown as Browser
  }
}
