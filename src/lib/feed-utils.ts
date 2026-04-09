/**
 * Shared utilities for markdown feed endpoints and content API routes.
 *
 * Provides:
 * - feedHeaders()      – builds Cache-Control + Content-Type + ETag + Last-Modified
 * - checkConditional() – 304 Not Modified shortcut
 * - getDetailLevel()   – reads ?detail=summary|full from the request URL
 * - SITE_URL constant
 */

import { createHash } from 'crypto'

export const SITE_URL = 'https://demandsignals.co'

/* ── ETag helper ──────────────────────────────────────────────────── */
function etag(content: string): string {
  return `"${createHash('md5').update(content).digest('hex')}"`
}

/* ── Headers ──────────────────────────────────────────────────────── */
export function feedHeaders(
  contentType: string,
  content: string,
  lastModified?: Date,
): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': `${contentType}; charset=utf-8`,
    'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200',
    ETag: etag(content),
  }
  if (lastModified) {
    headers['Last-Modified'] = lastModified.toUTCString()
  }
  return headers
}

/* ── 304 shortcut ─────────────────────────────────────────────────── */
export function checkConditional(
  request: Request,
  content: string,
  lastModified?: Date,
): Response | null {
  const ifNoneMatch = request.headers.get('if-none-match')
  const contentEtag = etag(content)

  if (ifNoneMatch && ifNoneMatch === contentEtag) {
    return new Response(null, { status: 304, headers: { ETag: contentEtag } })
  }

  if (lastModified) {
    const ifModifiedSince = request.headers.get('if-modified-since')
    if (ifModifiedSince) {
      const clientDate = new Date(ifModifiedSince).getTime()
      if (!isNaN(clientDate) && lastModified.getTime() <= clientDate) {
        return new Response(null, { status: 304, headers: { ETag: contentEtag } })
      }
    }
  }

  return null
}

/* ── Detail level ─────────────────────────────────────────────────── */
export function getDetailLevel(request: Request): 'summary' | 'full' {
  const url = new URL(request.url)
  const detail = url.searchParams.get('detail')
  return detail === 'summary' ? 'summary' : 'full'
}

/* ── XML escaping ────────────────────────────────────────────────── */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
