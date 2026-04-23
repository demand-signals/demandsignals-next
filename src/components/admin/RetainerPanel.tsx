'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCents } from '@/lib/format'

interface Props {
  quoteId: string
  planName: string | null
  planTier: string | null
  monthlyCents: number
  startDate: string | null
  activatedAt: string | null
  cancelledAt: string | null
  subscriptionId: string | null
  launchedAt: string | null
  onActivated?: () => void | Promise<void>
}

export default function RetainerPanel(props: Props) {
  const router = useRouter()
  const [launching, setLaunching] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const status = props.cancelledAt
    ? 'Cancelled'
    : props.activatedAt
    ? props.planTier === 'site_only'
      ? 'Declined (site-only)'
      : 'Active'
    : 'Pending'

  async function markLaunched() {
    setLaunching(true)
    setErr(null)
    try {
      const res = await fetch(`/api/admin/quotes/${props.quoteId}/launch`, {
        method: 'POST',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Activation failed')
      router.refresh()
      await props.onActivated?.()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Activation failed')
    } finally {
      setLaunching(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <h3 className="font-semibold mb-2">Retainer</h3>
      <dl className="text-sm space-y-1">
        <div className="flex justify-between">
          <dt className="text-slate-500">Plan</dt>
          <dd>{props.planName ?? '—'}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Status</dt>
          <dd>{status}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Monthly</dt>
          <dd>{formatCents(props.monthlyCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Start</dt>
          <dd>{props.startDate ?? '—'}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Launched</dt>
          <dd>{props.launchedAt?.slice(0, 10) ?? '—'}</dd>
        </div>
        {props.subscriptionId && (
          <div className="flex justify-between">
            <dt className="text-slate-500">Subscription</dt>
            <dd className="font-mono text-xs">{props.subscriptionId.slice(0, 8)}…</dd>
          </div>
        )}
      </dl>

      {status === 'Pending' && props.planName && (
        <button
          onClick={markLaunched}
          disabled={launching}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded text-sm disabled:opacity-50"
        >
          {launching ? 'Activating…' : 'Mark Launched & Activate'}
        </button>
      )}
      {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
    </div>
  )
}
