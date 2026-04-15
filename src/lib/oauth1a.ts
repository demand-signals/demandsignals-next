import crypto from 'crypto'

/**
 * Lightweight OAuth 1.0a implementation for Tumblr.
 * Uses HMAC-SHA1 signing. No external dependencies — just Node crypto.
 */

type OAuth1Credentials = {
  consumerKey: string
  consumerSecret: string
  token?: string
  tokenSecret?: string
}

type OAuth1Params = Record<string, string>

// ── Generate nonce + timestamp ──────────────────────────────────────────────

function nonce(): string {
  return crypto.randomBytes(16).toString('hex')
}

function timestamp(): string {
  return Math.floor(Date.now() / 1000).toString()
}

// ── Percent-encode per RFC 3986 ─────────────────────────────────────────────

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
}

// ── Build HMAC-SHA1 signature ───────────────────────────────────────────────

function sign(
  method: string,
  url: string,
  params: OAuth1Params,
  consumerSecret: string,
  tokenSecret: string = ''
): string {
  // 1. Sort params alphabetically
  const sortedKeys = Object.keys(params).sort()
  const paramString = sortedKeys
    .map(k => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join('&')

  // 2. Build signature base string
  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join('&')

  // 3. Build signing key
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`

  // 4. HMAC-SHA1
  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64')
}

// ── Build Authorization header ──────────────────────────────────────────────

export function buildAuthHeader(
  method: string,
  url: string,
  creds: OAuth1Credentials,
  extraParams: OAuth1Params = {}
): string {
  const oauthParams: OAuth1Params = {
    oauth_consumer_key: creds.consumerKey,
    oauth_nonce: nonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp(),
    oauth_version: '1.0',
  }

  if (creds.token) {
    oauthParams.oauth_token = creds.token
  }

  // Merge all params for signing (oauth + extra body/query params)
  const allParams = { ...oauthParams, ...extraParams }

  // Sign
  const signature = sign(method, url, allParams, creds.consumerSecret, creds.tokenSecret)
  oauthParams.oauth_signature = signature

  // Build header
  const headerParts = Object.keys(oauthParams)
    .sort()
    .map(k => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(', ')

  return `OAuth ${headerParts}`
}

// ── Request token (step 1 of OAuth 1.0a) ────────────────────────────────────

export async function getRequestToken(
  consumerKey: string,
  consumerSecret: string,
  callbackUrl: string
): Promise<{ oauth_token: string; oauth_token_secret: string }> {
  const url = 'https://www.tumblr.com/oauth/request_token'
  const creds: OAuth1Credentials = { consumerKey, consumerSecret }

  const authHeader = buildAuthHeader('POST', url, creds, {
    oauth_callback: callbackUrl,
  })

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: authHeader },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Tumblr request_token failed: ${res.status} — ${err}`)
  }

  const body = await res.text()
  const params = new URLSearchParams(body)
  const oauthToken = params.get('oauth_token')
  const oauthTokenSecret = params.get('oauth_token_secret')

  if (!oauthToken || !oauthTokenSecret) {
    throw new Error(`Invalid request_token response: ${body}`)
  }

  return { oauth_token: oauthToken, oauth_token_secret: oauthTokenSecret }
}

// ── Access token (step 3 of OAuth 1.0a) ─────────────────────────────────────

export async function getAccessToken(
  consumerKey: string,
  consumerSecret: string,
  oauthToken: string,
  oauthTokenSecret: string,
  oauthVerifier: string
): Promise<{ oauth_token: string; oauth_token_secret: string }> {
  const url = 'https://www.tumblr.com/oauth/access_token'
  const creds: OAuth1Credentials = {
    consumerKey,
    consumerSecret,
    token: oauthToken,
    tokenSecret: oauthTokenSecret,
  }

  const authHeader = buildAuthHeader('POST', url, creds, {
    oauth_verifier: oauthVerifier,
  })

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: authHeader },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Tumblr access_token failed: ${res.status} — ${err}`)
  }

  const body = await res.text()
  const params = new URLSearchParams(body)
  const accessToken = params.get('oauth_token')
  const accessTokenSecret = params.get('oauth_token_secret')

  if (!accessToken || !accessTokenSecret) {
    throw new Error(`Invalid access_token response: ${body}`)
  }

  return { oauth_token: accessToken, oauth_token_secret: accessTokenSecret }
}

// ── Make signed API request ─────────────────────────────────────────────────

export async function signedFetch(
  method: string,
  url: string,
  creds: OAuth1Credentials,
  body?: Record<string, string>
): Promise<Response> {
  // For POST with form body, include body params in signature
  const extraParams: OAuth1Params = body ?? {}

  const authHeader = buildAuthHeader(method, url, creds, extraParams)

  const fetchOptions: RequestInit = {
    method,
    headers: {
      Authorization: authHeader,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
  }

  if (body) {
    fetchOptions.body = new URLSearchParams(body).toString()
  }

  return fetch(url, fetchOptions)
}
