'use client'

// Client-side MSA execution: approver identity, per-disclosure e-initials,
// forced e-signature consent, cursive typed signature, and a full client-side
// fingerprint (screen, timezone, geolocation, canvas, webgl, etc.) → POST
// /api/msa/public/[number]/execute.

import { useState } from 'react'
import { Loader2, Check, AlertTriangle } from 'lucide-react'

interface Disclosure { code: string; title: string; public_url: string }

interface Props {
  number: string
  publicUuid: string
  disclosures: Disclosure[]
  alreadyExecuted: boolean
  executedSignature?: string | null
  defaultName?: string | null
  defaultEmail?: string | null
}

const CURSIVE = "'Brush Script MT','Segoe Script','Snell Roundhand',cursive"

// ── Client fingerprint collection ────────────────────────────────────
async function collectFingerprint(): Promise<Record<string, unknown>> {
  const fp: Record<string, unknown> = {}
  try {
    const nav = navigator as Navigator & { deviceMemory?: number; userAgentData?: { platform?: string } }
    fp.user_agent = nav.userAgent
    fp.platform = nav.userAgentData?.platform ?? nav.platform
    fp.vendor = (nav as unknown as { vendor?: string }).vendor
    fp.languages = nav.languages ?? [nav.language]
    fp.hardware_concurrency = nav.hardwareConcurrency
    fp.device_memory = nav.deviceMemory
    fp.touch_points = nav.maxTouchPoints
    fp.do_not_track = nav.doNotTrack
    fp.cookies_enabled = nav.cookieEnabled
    fp.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    fp.screen = { w: screen.width, h: screen.height, dpr: window.devicePixelRatio, color_depth: screen.colorDepth }
    fp.viewport = { w: window.innerWidth, h: window.innerHeight }

    // Parse browser / os / device from UA (lightweight)
    const ua = nav.userAgent
    fp.browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : 'Unknown'
    fp.os = /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown'
    fp.device = /Mobile/.test(ua) ? 'Mobile' : 'Desktop'

    // Canvas fingerprint
    try {
      const c = document.createElement('canvas')
      const ctx = c.getContext('2d')
      if (ctx) {
        ctx.textBaseline = 'top'; ctx.font = "14px 'Arial'"
        ctx.fillStyle = '#f60'; ctx.fillRect(125, 1, 62, 20)
        ctx.fillStyle = '#069'; ctx.fillText('DSIG❤️', 2, 15)
        fp.canvas_fp = c.toDataURL().slice(-32)
      }
    } catch { /* canvas blocked */ }

    // WebGL
    try {
      const gl = document.createElement('canvas').getContext('webgl') as WebGLRenderingContext | null
      if (gl) {
        const dbg = gl.getExtension('WEBGL_debug_renderer_info')
        if (dbg) {
          fp.webgl_vendor = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)
          fp.webgl_renderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)
        }
      }
    } catch { /* webgl blocked */ }

    // Precise geolocation (permission-gated; 4s timeout, best-effort)
    fp.geolocation = await new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null)
      const done = (v: unknown) => resolve(v)
      const t = setTimeout(() => done(null), 4000)
      navigator.geolocation.getCurrentPosition(
        (pos) => { clearTimeout(t); done({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy, at: new Date().toISOString() }) },
        () => { clearTimeout(t); done(null) },
        { timeout: 4000, maximumAge: 60000 },
      )
    })
  } catch { /* fingerprint best-effort */ }
  return fp
}

export function MsaSignClient({ number, publicUuid, disclosures, alreadyExecuted, executedSignature, defaultName, defaultEmail }: Props) {
  const [initials, setInitials] = useState<Record<string, string>>({})
  const [signature, setSignature] = useState('')
  const [name, setName] = useState(defaultName ?? '')
  const [title, setTitle] = useState('')
  const [email, setEmail] = useState(defaultEmail ?? '')
  const [cell, setCell] = useState('')
  const [consent, setConsent] = useState(false)
  const [state, setState] = useState<'idle' | 'signing' | 'done' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  if (alreadyExecuted || state === 'done') {
    const who = state === 'done' ? signature.trim() : executedSignature
    return (
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-5 text-emerald-800">
        <div className="flex items-center gap-2 font-semibold"><Check className="h-5 w-5" /> Agreement signed</div>
        <p className="mt-1 text-sm">Thank you, {who} — you&rsquo;re all set. We&rsquo;ll be in touch to get started.</p>
      </div>
    )
  }

  const allInitialed = disclosures.every((d) => (initials[d.code] ?? '').trim().length > 0)
  const canSign = allInitialed && signature.trim().length > 0 && name.trim().length > 0 && consent && state !== 'signing'

  async function sign() {
    setState('signing'); setErrMsg('')
    try {
      const fingerprint = await collectFingerprint()
      const res = await fetch(`/api/msa/public/${number}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: publicUuid,
          signature: signature.trim(),
          approver: { name: name.trim(), title: title.trim(), email: email.trim(), cell: cell.trim() },
          esignConsent: consent,
          initials: disclosures.map((d) => ({ code: d.code, initials: (initials[d.code] ?? '').trim() })),
          fingerprint,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setState('error'); setErrMsg(data.error ?? 'Signing failed'); return }
      setState('done')
    } catch (e) {
      setState('error'); setErrMsg(e instanceof Error ? e.message : 'Network error')
    }
  }

  const field = 'w-full rounded border border-slate-300 px-3 py-2 text-sm'

  return (
    <div className="space-y-6">
      {/* Disclosures */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Review &amp; acknowledge each disclosure</h2>
        <p className="mt-1 text-sm text-slate-500">Enter your initials beside each. Click a title to read it.</p>
        <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {disclosures.map((d) => (
            <div key={d.code} className="flex items-center gap-4 p-3">
              <input
                aria-label={`Initials for ${d.title}`}
                value={initials[d.code] ?? ''}
                onChange={(e) => setInitials((s) => ({ ...s, [d.code]: e.target.value.slice(0, 5).toUpperCase() }))}
                placeholder="__"
                className="w-16 rounded border border-slate-300 px-2 py-1.5 text-center font-semibold uppercase tracking-widest text-slate-800"
              />
              <div className="flex-1">
                <a href={d.public_url} target="_blank" rel="noreferrer" className="font-medium text-teal-600 hover:underline">{d.title}</a>
                <div className="text-xs text-slate-400">{d.code}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Approver identity */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Your details</h2>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name *" className={field} />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className={field} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={field} />
          <input value={cell} onChange={(e) => setCell(e.target.value)} placeholder="Cell" className={field} />
        </div>
      </div>

      {/* Signature */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Sign</h2>
        <p className="mt-1 text-sm text-slate-500">Type your full name as your electronic signature.</p>
        <input
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder="Your full name"
          className="mt-2 w-full max-w-md rounded border border-slate-300 px-3 py-2"
          style={{ fontFamily: CURSIVE, fontSize: '28px', color: '#0f172a' }}
        />
      </div>

      {/* Forced e-sign consent */}
      <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4" />
        <span className="text-slate-700">
          I agree to use an electronic signature, and I consent that my typed name and the recorded signing metadata
          constitute my legal signature under the E-SIGN Act, with the same effect as a handwritten signature.
        </span>
      </label>

      {state === 'error' && (
        <div className="flex items-center gap-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" /> {errMsg}
        </div>
      )}
      {!canSign && state !== 'signing' && (
        <p className="text-xs text-slate-400">
          {!allInitialed ? `Initial all ${disclosures.length} disclosures. ` : ''}
          {!name.trim() ? 'Enter your name. ' : ''}
          {!signature.trim() ? 'Type your signature. ' : ''}
          {!consent ? 'Agree to electronic signature.' : ''}
        </p>
      )}

      <button onClick={sign} disabled={!canSign}
        className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-5 py-2.5 font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
        {state === 'signing' ? (<><Loader2 className="h-4 w-4 animate-spin" /> Signing…</>) : 'Sign Agreement'}
      </button>
    </div>
  )
}
