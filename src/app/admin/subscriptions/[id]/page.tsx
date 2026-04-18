'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

interface SubscriptionDetail {
  subscription: {
    id: string
    status: string
    stripe_subscription_id: string | null
    current_period_start: string
    current_period_end: string
    next_invoice_date: string
    canceled_at: string | null
    cancel_reason: string | null
    prospect: { business_name: string; owner_email: string | null }
    plan: { name: string; price_cents: number; billing_interval: string; description: string | null }
  }
  invoices: Array<{
    id: string
    invoice_number: string
    total_due_cents: number
    status: string
    sent_at: string | null
    paid_at: string | null
  }>
}

export default function SubscriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [detail, setDetail] = useState<SubscriptionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/admin/subscriptions/${id}`)
    const data = await res.json()
    if (res.ok) setDetail(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [id])

  async function cancel(atPeriodEnd: boolean) {
    const reason = prompt('Cancellation reason:') ?? 'admin_requested'
    if (!reason) return
    setBusy(true)
    await fetch(`/api/admin/subscriptions/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, at_period_end: atPeriodEnd }),
    })
    setBusy(false)
    load()
  }

  if (loading)
    return (
      <div className="flex justify-center p-16">
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    )
  if (!detail) return <div className="p-6">Not found</div>

  const { subscription: sub, invoices } = detail
  const active = sub.status === 'active' || sub.status === 'trialing'

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <Link href="/admin/subscriptions" className="text-sm text-teal-600">
        ← All subscriptions
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{sub.prospect?.business_name ?? '—'}</h1>
          <div className="text-sm text-slate-500">
            {sub.plan?.name} · ${(sub.plan?.price_cents / 100).toFixed(2)} /{' '}
            {sub.plan?.billing_interval}
          </div>
        </div>
        {active && (
          <div className="flex gap-2">
            <button
              onClick={() => cancel(true)}
              disabled={busy}
              className="bg-amber-100 text-amber-900 rounded px-3 py-1.5 text-sm"
            >
              Cancel at period end
            </button>
            <button
              onClick={() => cancel(false)}
              disabled={busy}
              className="bg-red-100 text-red-700 rounded px-3 py-1.5 text-sm"
            >
              Cancel immediately
            </button>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs uppercase text-slate-500">Status</div>
          <div className="font-semibold">{sub.status}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-slate-500">Stripe sub ID</div>
          <div className="font-mono text-xs">
            {sub.stripe_subscription_id ?? <span className="text-slate-400">none</span>}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase text-slate-500">Next invoice</div>
          <div>{sub.next_invoice_date}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-slate-500">Period ends</div>
          <div>{new Date(sub.current_period_end).toLocaleDateString()}</div>
        </div>
        {sub.canceled_at && (
          <div className="col-span-2">
            <div className="text-xs uppercase text-slate-500">Canceled</div>
            <div>
              {new Date(sub.canceled_at).toLocaleString()}
              {sub.cancel_reason && ` — ${sub.cancel_reason}`}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-semibold mb-3">Cycle invoices ({invoices.length})</h2>
        {invoices.length === 0 ? (
          <div className="text-sm text-slate-400">No invoices yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left py-1">Invoice #</th>
                <th className="text-right py-1">Amount</th>
                <th className="text-left py-1">Status</th>
                <th className="text-left py-1">Sent</th>
                <th className="text-left py-1">Paid</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-slate-100">
                  <td className="py-2 font-mono">
                    <Link href={`/admin/invoices/${inv.id}`} className="text-teal-600 hover:underline">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="py-2 text-right">${(inv.total_due_cents / 100).toFixed(2)}</td>
                  <td className="py-2">{inv.status}</td>
                  <td className="py-2 text-xs">
                    {inv.sent_at ? new Date(inv.sent_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-2 text-xs">
                    {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
