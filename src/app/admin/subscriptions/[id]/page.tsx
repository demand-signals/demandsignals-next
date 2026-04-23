'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import ProspectContactEditor, { ProspectContact } from '@/components/admin/ProspectContactEditor'
import { formatCents } from '@/lib/quote-engine'

interface SubscriptionDetail {
  subscription: {
    id: string
    status: string
    stripe_subscription_id: string | null
    current_period_start: string
    current_period_end: string
    next_invoice_date: string | null
    end_date: string | null
    notes: string | null
    override_monthly_amount_cents: number | null
    canceled_at: string | null
    cancel_reason: string | null
    prospect: ProspectContact & { business_name: string }
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

interface EditState {
  end_date: string
  notes: string
  override_monthly_amount_cents: string
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
  const [editing, setEditing] = useState(false)
  const [editState, setEditState] = useState<EditState>({
    end_date: '',
    notes: '',
    override_monthly_amount_cents: '',
  })

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/admin/subscriptions/${id}`)
    const data = await res.json()
    if (res.ok) {
      setDetail(data)
      const sub = data.subscription
      setEditState({
        end_date: sub.end_date ? sub.end_date.split('T')[0] : '',
        notes: sub.notes ?? '',
        override_monthly_amount_cents: sub.override_monthly_amount_cents != null
          ? String(sub.override_monthly_amount_cents / 100)
          : '',
      })
    }
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

  async function saveEdit() {
    setBusy(true)
    const body: Record<string, unknown> = {
      end_date: editState.end_date || null,
      notes: editState.notes || null,
      override_monthly_amount_cents: editState.override_monthly_amount_cents !== ''
        ? Math.round(parseFloat(editState.override_monthly_amount_cents) * 100)
        : null,
    }
    const res = await fetch(`/api/admin/subscriptions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setBusy(false)
    if (res.ok) {
      setEditing(false)
      load()
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data.error ?? 'Save failed')
    }
  }

  async function refundLast() {
    const reason = prompt('Refund reason:')
    if (reason === null) return // user cancelled
    setBusy(true)
    const res = await fetch(`/api/admin/subscriptions/${id}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || 'admin refund' }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (res.ok) {
      alert(`Refund processed — invoice ${data.invoice_id} voided.`)
      load()
    } else {
      alert(data.error ?? 'Refund failed')
    }
  }

  async function markLastPaid() {
    if (!confirm('Mark the most recent unpaid invoice as paid?')) return
    setBusy(true)
    const res = await fetch(`/api/admin/subscriptions/${id}/mark-paid`, {
      method: 'POST',
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (res.ok) {
      alert(`Invoice ${data.invoice_id} marked paid.`)
      load()
    } else {
      alert(data.error ?? 'Failed to mark paid')
    }
  }

  async function deleteSub() {
    if (
      !confirm('Delete subscription? (Marks as canceled_by_admin; preserves invoice history.)')
    )
      return
    setBusy(true)
    const res = await fetch(`/api/admin/subscriptions/${id}`, { method: 'DELETE' })
    setBusy(false)
    if (res.ok) {
      router.push('/admin/subscriptions')
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data.error ?? 'Delete failed')
    }
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

      {/* Header + actions */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{sub.prospect?.business_name ?? '—'}</h1>
          <div className="text-sm text-slate-500">
            {sub.plan?.name} ·{' '}
            {sub.override_monthly_amount_cents != null
              ? formatCents(sub.override_monthly_amount_cents)
              : formatCents(sub.plan?.price_cents ?? 0)}{' '}
            / {sub.plan?.billing_interval}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setEditing((v) => !v)}
            disabled={busy}
            className="bg-slate-100 text-slate-700 rounded px-3 py-1.5 text-sm"
          >
            {editing ? 'Cancel edit' : 'Edit'}
          </button>
          <button
            onClick={refundLast}
            disabled={busy}
            className="bg-blue-50 text-blue-700 rounded px-3 py-1.5 text-sm"
          >
            Refund last cycle
          </button>
          <button
            onClick={markLastPaid}
            disabled={busy}
            className="bg-green-50 text-green-700 rounded px-3 py-1.5 text-sm"
          >
            Mark last paid
          </button>
          {active && (
            <>
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
            </>
          )}
          <button
            onClick={deleteSub}
            disabled={busy}
            className="bg-red-600 text-white rounded px-3 py-1.5 text-sm"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Client info */}
      {sub.prospect && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-semibold mb-3 text-sm">Client contact</h2>
          <ProspectContactEditor prospect={sub.prospect} />
        </div>
      )}

      {/* Inline edit form */}
      {editing && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-sm">Edit subscription</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <label className="block col-span-2 sm:col-span-1">
              <span className="text-xs text-slate-500 block mb-1">End date (optional)</span>
              <input
                type="date"
                value={editState.end_date}
                onChange={(e) => setEditState((s) => ({ ...s, end_date: e.target.value }))}
                className="w-full border border-slate-200 rounded px-2 py-1"
              />
            </label>
            <label className="block col-span-2 sm:col-span-1">
              <span className="text-xs text-slate-500 block mb-1">
                Override monthly amount ($, leave blank to use plan price)
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder={String((sub.plan?.price_cents ?? 0) / 100)}
                value={editState.override_monthly_amount_cents}
                onChange={(e) =>
                  setEditState((s) => ({
                    ...s,
                    override_monthly_amount_cents: e.target.value,
                  }))
                }
                className="w-full border border-slate-200 rounded px-2 py-1"
              />
            </label>
            <label className="block col-span-2">
              <span className="text-xs text-slate-500 block mb-1">Notes</span>
              <textarea
                rows={3}
                value={editState.notes}
                onChange={(e) => setEditState((s) => ({ ...s, notes: e.target.value }))}
                className="w-full border border-slate-200 rounded px-2 py-1"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveEdit}
              disabled={busy}
              className="bg-teal-500 text-white rounded px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save changes'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="bg-slate-100 rounded px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Status grid */}
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
          <div>{sub.next_invoice_date ?? '—'}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-slate-500">Period ends</div>
          <div>{new Date(sub.current_period_end).toLocaleDateString()}</div>
        </div>
        {sub.end_date && (
          <div>
            <div className="text-xs uppercase text-slate-500">End date</div>
            <div>{new Date(sub.end_date).toLocaleDateString()}</div>
          </div>
        )}
        {sub.override_monthly_amount_cents != null && (
          <div>
            <div className="text-xs uppercase text-slate-500">Override amount</div>
            <div>{formatCents(sub.override_monthly_amount_cents)} / {sub.plan?.billing_interval}</div>
          </div>
        )}
        {sub.notes && (
          <div className="col-span-2">
            <div className="text-xs uppercase text-slate-500">Notes</div>
            <div className="whitespace-pre-wrap">{sub.notes}</div>
          </div>
        )}
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

      {/* Cycle invoices */}
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
                  <td className="py-2 text-right">{formatCents(inv.total_due_cents)}</td>
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
