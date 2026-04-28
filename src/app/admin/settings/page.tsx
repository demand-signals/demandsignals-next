'use client'

// ── Admin Settings Page ─────────────────────────────────────────────
// Central view of the kill-switch flags + env-var readiness.
// Lets admin flip flags without hitting the SQL Editor and see at a
// glance whether Stripe / Twilio / SMTP / PDF / R2 are wired.

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

interface ConfigRow {
  key: string
  // JSONB — could be boolean, string, number, null. Don't lock to string.
  value: unknown
}

interface EnvReadiness {
  stripe_secret_configured: boolean
  stripe_secret_active_slot?: string | null
  stripe_secret_active_prefix?: string | null
  stripe_secret_rejected_slots?: Array<{ slot: string; prefix: string }>
  stripe_webhook_secret_configured: boolean
  stripe_webhook_active_slot?: string | null
  stripe_webhook_rejected_slots?: Array<{ slot: string; prefix: string }>
  stripe_publishable_configured: boolean
  twilio_configured: boolean
  twilio_866_configured: boolean
  sms_test_mode: boolean
  sms_test_allowlist_count: number
  smtp_configured: boolean
  resend_configured: boolean
  email_provider_configured: boolean
  pdf_service_configured: boolean
  r2_configured: boolean
  cron_secret_configured: boolean
}

interface ConfigResponse {
  config: ConfigRow[]
  known_flags: string[]
  env: EnvReadiness
}

const FLAG_METADATA: Record<
  string,
  { label: string; description: string; requires: string[] }
> = {
  automated_invoicing_enabled: {
    label: 'Automated Invoicing',
    description:
      'Master switch for all auto-draft + auto-send flows. Off = only human-initiated invoices work.',
    requires: [],
  },
  stripe_enabled: {
    label: 'Stripe Payments',
    description:
      'Lets /invoice/[…]/pay create Payment Links and the webhook handler process events.',
    requires: ['stripe_secret_configured', 'stripe_webhook_secret_configured'],
  },
  sms_delivery_enabled: {
    label: 'SMS Delivery',
    description:
      'Enables the SMS send button on invoice detail. Honors SMS_TEST_MODE allowlist until A2P approval.',
    requires: ['twilio_configured', 'twilio_866_configured'],
  },
  email_delivery_enabled: {
    label: 'Email Delivery',
    description:
      'Enables the Email send button on invoice detail. Sends via Resend (primary) with SMTP fallback.',
    requires: ['email_provider_configured'],
  },
  subscription_cycle_cron_enabled: {
    label: 'Subscription Cycle Cron',
    description:
      'Daily cron generates next-cycle invoices for each active subscription. Off = no auto-billing.',
    requires: ['cron_secret_configured'],
  },
  a2p_transactional_enabled: {
    label: 'A2P Transactional (Production SMS)',
    description:
      'After Twilio approves the Transactional campaign, flipping this removes the test-allowlist gate.',
    requires: ['twilio_configured'],
  },
  ai_enabled: {
    label: 'Quote AI',
    description: 'Master switch for the /quote conversational AI flow.',
    requires: [],
  },
  cadence_enabled: {
    label: 'Outbound Cadence SMS',
    description: 'Day 1/3/7/14/30/45 cadence SMS for follow-up. Requires A2P Marketing approval.',
    requires: ['twilio_configured'],
  },
}

const ENV_LABELS: Partial<Record<keyof EnvReadiness, string>> = {
  stripe_secret_configured: 'Stripe secret key',
  stripe_webhook_secret_configured: 'Stripe webhook signing secret',
  stripe_publishable_configured: 'Stripe publishable key',
  twilio_configured: 'Twilio account + auth token',
  twilio_866_configured: 'Twilio 866# sender',
  sms_test_mode: 'SMS test mode (allowlist-only)',
  sms_test_allowlist_count: 'SMS test allowlist numbers',
  resend_configured: 'Resend API key',
  smtp_configured: 'SMTP fallback (host + user + pass)',
  email_provider_configured: 'Email provider (Resend or SMTP)',
  pdf_service_configured: 'PDF service URL + secret',
  r2_configured: 'R2 storage credentials',
  cron_secret_configured: 'Cron secret',
}

export default function SettingsPage() {
  const [data, setData] = useState<ConfigResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [flipping, setFlipping] = useState<string | null>(null)
  const [flipError, setFlipError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/config')
    const d = await res.json()
    setData(d)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  // Coerce whatever quote_config.value is into a strict on/off boolean.
  // JSONB can be native true / native false / string "true" / string "false"
  // / null / empty string — all four show up in the wild because rows have
  // been written by different code paths over time.
  function flagOn(key: string): boolean {
    const v = data?.config.find((c) => c.key === key)?.value
    return v === true || v === 'true'
  }

  async function flipFlag(key: string) {
    setFlipping(key)
    setFlipError(null)
    const next = !flagOn(key)
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: next }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `PATCH ${res.status} ${res.statusText}`)
      }
    } catch (e) {
      setFlipError(e instanceof Error ? e.message : 'Toggle failed')
    } finally {
      setFlipping(null)
      load()
    }
  }

  function envReady(key: string, required: string[]): boolean {
    if (!data) return false
    for (const r of required) {
      if (!data.env[r as keyof EnvReadiness]) return false
    }
    return true
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    )
  }

  if (!data) return <div className="p-6 text-red-600">Failed to load config.</div>

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-600 mt-1">
          Kill-switch flags + infrastructure readiness at a glance.
        </p>
      </div>

      {flipError && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>Toggle failed:</strong> {flipError}
        </div>
      )}

      <section>
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">
          Feature Flags
        </h2>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left px-4 py-2">Flag</th>
                <th className="text-left px-4 py-2">Description</th>
                <th className="text-center px-4 py-2 w-24">Ready?</th>
                <th className="text-center px-4 py-2 w-28">State</th>
                <th className="text-right px-4 py-2 w-28">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.known_flags.map((key) => {
                const meta = FLAG_METADATA[key]
                const on = flagOn(key)
                const required = meta?.requires ?? []
                const ready = envReady(key, required)
                return (
                  <tr key={key} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{meta?.label ?? key}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{key}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{meta?.description}</td>
                    <td className="px-4 py-3 text-center">
                      {required.length === 0 ? (
                        <span className="text-slate-300">—</span>
                      ) : ready ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 inline" />
                      ) : (
                        <span title={`Missing: ${required.filter((r) => !data.env[r as keyof EnvReadiness]).join(', ')}`}>
                          <AlertTriangle className="w-5 h-5 text-amber-500 inline" />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          on ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {on ? 'ENABLED' : 'disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => flipFlag(key)}
                        disabled={flipping === key}
                        className={`text-xs font-semibold rounded px-3 py-1 ${
                          on
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-teal-500 text-white hover:bg-teal-600'
                        } disabled:opacity-50`}
                      >
                        {flipping === key ? '…' : on ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">
          Infrastructure Readiness
        </h2>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {(Object.keys(ENV_LABELS) as Array<keyof EnvReadiness>).map((k) => {
              const v = data.env[k]
              const label = ENV_LABELS[k]
              if (typeof v === 'number') {
                return (
                  <div key={k} className="flex items-center justify-between py-1">
                    <span className="text-slate-700">{label}</span>
                    <span
                      className={`font-mono text-xs px-2 py-0.5 rounded ${
                        v > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {v}
                    </span>
                  </div>
                )
              }
              return (
                <div key={k} className="flex items-center justify-between py-1">
                  <span className="text-slate-700">{label}</span>
                  {v ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 text-xs">
                      <CheckCircle2 className="w-4 h-4" /> set
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                      <XCircle className="w-4 h-4" /> not set
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">
          All Config Values
        </h2>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left px-4 py-2">Key</th>
                <th className="text-left px-4 py-2">Value</th>
              </tr>
            </thead>
            <tbody>
              {data.config.map((c) => (
                <tr key={c.key} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-mono text-xs">{c.key}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-600">{
                    c.value === null || c.value === undefined
                      ? <span className="text-slate-300 italic">null</span>
                      : typeof c.value === 'string'
                        ? c.value
                        : JSON.stringify(c.value)
                  }</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
