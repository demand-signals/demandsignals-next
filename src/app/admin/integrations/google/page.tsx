'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'

interface IntegrationStatus {
  connected: boolean
  account_email: string | null
  connected_at: string | null
  revoked: boolean
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
