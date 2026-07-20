// SSRF egress guard.
//
// Server-side code that fetches a URL supplied by an untrusted party (e.g. a
// prospect's `existing_site_url` in the quote research pipeline) can be
// tricked into hitting internal infrastructure — cloud metadata endpoints
// (169.254.169.254), loopback (127.0.0.1 / ::1), or RFC1918 private ranges
// (10.x / 172.16-31.x / 192.168.x). This helper resolves the target host to
// its IP address(es) and rejects any that fall in a non-public range, BEFORE
// a fetch is issued.
//
// Usage: call `assertPublicUrl(url)` (throws `SsrfBlockedError` on a bad host)
// and use `fetchGuarded(url, init)` which validates each hop when following
// redirects manually — a public URL that 30x-redirects to an internal address
// would otherwise slip past a one-time check.
//
// Added by security audit 2026-07-20 (SSRF in quote-research.scanSite).

import { lookup } from 'node:dns/promises'
import net from 'node:net'

export class SsrfBlockedError extends Error {
  constructor(public readonly url: string, public readonly detail: string) {
    super(`SSRF guard blocked ${url}: ${detail}`)
    this.name = 'SsrfBlockedError'
  }
}

/** Parse an IPv4 dotted quad into its 32-bit unsigned integer. */
function ipv4ToInt(ip: string): number {
  const parts = ip.split('.').map((p) => parseInt(p, 10))
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
}

function inCidr4(ipInt: number, base: string, bits: number): boolean {
  const baseInt = ipv4ToInt(base)
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
  return (ipInt & mask) === (baseInt & mask)
}

// Blocked IPv4 ranges: loopback, private, link-local (incl. cloud metadata),
// carrier-grade NAT, reserved, and broadcast.
const BLOCKED_V4: Array<[string, number]> = [
  ['0.0.0.0', 8],       // "this" network
  ['10.0.0.0', 8],      // RFC1918 private
  ['100.64.0.0', 10],   // CGNAT
  ['127.0.0.0', 8],     // loopback
  ['169.254.0.0', 16],  // link-local — includes 169.254.169.254 cloud metadata
  ['172.16.0.0', 12],   // RFC1918 private
  ['192.0.0.0', 24],    // IETF protocol assignments
  ['192.0.2.0', 24],    // TEST-NET-1
  ['192.168.0.0', 16],  // RFC1918 private
  ['198.18.0.0', 15],   // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24],  // TEST-NET-3
  ['224.0.0.0', 4],     // multicast
  ['240.0.0.0', 4],     // reserved
  ['255.255.255.255', 32], // broadcast
]

function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const ipInt = ipv4ToInt(ip)
    return BLOCKED_V4.some(([base, bits]) => inCidr4(ipInt, base, bits))
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase()
    // Loopback ::1, unspecified ::, link-local fe80::/10, unique-local fc00::/7.
    if (lower === '::1' || lower === '::') return true
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true
    // IPv4-mapped (::ffff:a.b.c.d) — extract and re-check as v4.
    const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped && net.isIPv4(mapped[1])) return isBlockedIp(mapped[1])
    return false
  }
  return true // unparseable → block
}

/**
 * Throw SsrfBlockedError unless `rawUrl` is an http(s) URL whose host resolves
 * exclusively to public IP addresses. Rejects non-http schemes, bare-IP hosts
 * in blocked ranges, and hostnames that DNS-resolve to any blocked IP.
 */
export async function assertPublicUrl(rawUrl: string): Promise<void> {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new SsrfBlockedError(rawUrl, 'unparseable URL')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SsrfBlockedError(rawUrl, `disallowed scheme ${parsed.protocol}`)
  }
  const host = parsed.hostname

  // Literal IP host — check directly, don't DNS-resolve.
  if (net.isIP(host)) {
    if (isBlockedIp(host)) throw new SsrfBlockedError(rawUrl, `blocked literal IP ${host}`)
    return
  }

  // Block obvious localhost aliases before the DNS call.
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) {
    throw new SsrfBlockedError(rawUrl, `blocked hostname ${host}`)
  }

  // Resolve ALL A/AAAA records; a single blocked answer fails the whole host
  // (defends against DNS round-robin / rebinding returning one public + one
  // private address).
  let results: Array<{ address: string }>
  try {
    results = await lookup(host, { all: true })
  } catch {
    throw new SsrfBlockedError(rawUrl, `DNS resolution failed for ${host}`)
  }
  if (results.length === 0) {
    throw new SsrfBlockedError(rawUrl, `no DNS records for ${host}`)
  }
  for (const { address } of results) {
    if (isBlockedIp(address)) {
      throw new SsrfBlockedError(rawUrl, `${host} resolves to blocked IP ${address}`)
    }
  }
}

/**
 * SSRF-safe fetch. Validates the initial URL, then follows redirects manually
 * (up to `maxRedirects`), re-validating every hop's Location so a public URL
 * cannot bounce the request into an internal address. Signature-compatible
 * with the subset of fetch() options scanSite uses.
 */
export async function fetchGuarded(
  url: string,
  init: RequestInit & { maxRedirects?: number } = {},
): Promise<Response> {
  const { maxRedirects = 5, ...rest } = init
  let current = url
  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicUrl(current)
    const res = await fetch(current, { ...rest, redirect: 'manual' })
    // 3xx with a Location → validate + continue; otherwise return as-is.
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) return res
      current = new URL(loc, current).toString()
      continue
    }
    return res
  }
  throw new SsrfBlockedError(url, `too many redirects (>${maxRedirects})`)
}
