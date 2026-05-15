'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'

interface IntegrationStatus {
  connected: boolean
  account_email: string | null
  connected_at: string | null
  revoked: boolean
  scopes?: string[]
  scope_insufficient?: boolean
  required_scope?: string
}

export default function GoogleIntegrationPage() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/integrations/google/status')
      const data = await res.json()
      setStatus(data)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function runTest() {
    setTesting(true); setTestResult(null)
    try {
      const res = await fetch('/api/integrations/google/test', { method: 'POST' })
      const data = await res.json()
      setTestResult(data.ok ? '✓ Calendar access works (test event created + deleted)' : `Error: ${data.error}`)
    } finally { setTesting(false) }
  }

  async function disconnect() {
    if (!confirm('Disconnect the Google Calendar integration?')) return
    await fetch('/api/integrations/google/disconnect', { method: 'POST' })
    await load()
  }

  if (loading) {
    return <div className="p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
  }

  return (
    <div className="max-w-3xl p-8">
      <h1 className="text-2xl font-bold mb-6">Google Calendar Integration</h1>

      {status?.connected ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-900">Connected</p>
              <p className="text-sm text-emerald-800">
                {status.account_email}
                {status.connected_at && ` · since ${new Date(status.connected_at).toLocaleDateString()}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={runTest}
              disabled={testing}
              className="px-3 py-2 bg-white border border-emerald-300 text-emerald-900 rounded-md text-sm font-medium disabled:opacity-50"
            >
              {testing ? 'Testing…' : 'Test calendar access'}
            </button>
            <button
              onClick={disconnect}
              className="px-3 py-2 bg-red-50 border border-red-200 text-red-900 rounded-md text-sm font-medium"
            >
              Disconnect
            </button>
          </div>
          {testResult && (
            <p className="text-sm text-emerald-900 mt-2">{testResult}</p>
          )}
        </div>
      ) : status?.scope_insufficient ? (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-6 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-900">Calendar permission insufficient</p>
              <p className="text-sm text-amber-800 mt-1">
                Connected as <strong>{status.account_email}</strong>, but the Calendar scope
                wasn&apos;t granted. Booking + freebusy lookups will fail until the broader
                scope is approved.
              </p>
              <p className="text-xs text-amber-700 mt-2">
                Currently granted: {status.scopes?.join(', ') || 'none'}
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Required: <code className="bg-amber-100 px-1 rounded">{status.required_scope}</code>
              </p>
            </div>
          </div>
          <div className="bg-amber-100 border border-amber-300 rounded p-3 text-sm text-amber-900 space-y-2">
            <p className="font-semibold">To fix:</p>
            <ol className="list-decimal ml-5 space-y-1 text-xs">
              <li>
                Go to <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" className="underline text-amber-900">
                  myaccount.google.com/permissions
                </a> and remove access for Demand Signals (full revoke clears the partial grant).
              </li>
              <li>Come back here and click <strong>Connect</strong> below.</li>
              <li>
                On Google&apos;s consent screen, leave <strong>all permissions checked</strong> —
                especially &ldquo;See, edit, share, and permanently delete all the calendars
                you can access using Google Calendar.&rdquo;
              </li>
            </ol>
          </div>
          <a
            href="/api/integrations/google/start"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium"
          >
            Reconnect with full scope <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      ) : status?.revoked ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Connection revoked</p>
              <p className="text-sm text-red-800">Reconnect to resume booking.</p>
            </div>
          </div>
          <a
            href="/api/integrations/google/start"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium"
          >
            Reconnect <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
          <p className="text-slate-700">
            Connect <strong>demandsignals@gmail.com</strong> to enable real Calendar event creation
            for booked meetings from the /quote flow.
          </p>
          <a
            href="/api/integrations/google/start"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium"
          >
            Connect Google Calendar <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  )
}
