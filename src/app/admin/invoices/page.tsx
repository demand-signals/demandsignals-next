'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Plus } from 'lucide-react'
import { formatCents } from '@/lib/format'

interface InvoiceRow {
  id: string
  invoice_number: string
  kind: string
  status: string
  total_due_cents: number
  auto_generated: boolean
  auto_trigger: string | null
  created_at: string
  sent_at: string | null
  viewed_at: string | null
  paid_at: string | null
  stripe_payment_link_url: string | null
  subscription_intent: 'none' | 'pending' | 'created'
  term_months: number | null
  until_cancelled: boolean
  prospects: { business_name: string } | null
  // Computed server-side. Mirrors SOW endpoint shape (Hunter spec
  // 2026-05-02). Gross deal value with TIK additive.
  //   project_cents = sum of one_time line totals
  //   subscriptions_cents = sum of monthly+annual line totals at full per-cycle price
  //   tik_cents = trade_credit_cents
  //   computed_total_cents = project + subs + TIK
  project_cents: number
  subscriptions_cents: number
  tik_cents: number
  computed_total_cents: number
  // Soonest pending scheduled-send for this invoice (status='scheduled').
  // Null when no future send is queued.
  next_scheduled_send_at: string | null
  next_scheduled_send_channel: 'email' | 'sms' | 'both' | null
  next_scheduled_send_kind: 'send' | 'reminder' | 'issue_and_send' | null
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-700',
  void: 'bg-red-100 text-red-700 opacity-60',
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString()
}

// "May 5 9:00 AM" — date + time, compact. The Scheduled column wants
// time precision (admin schedules at 9 AM, not "Tuesday").
function fmtSchedule(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [autoOnly, setAutoOnly] = useState(false)

  useEffect(() => {
    setLoading(true)
    const sp = new URLSearchParams()
    if (statusFilter) sp.set('status', statusFilter)
    if (autoOnly) sp.set('auto_generated', 'true')
    fetch(`/api/admin/invoices?${sp}`)
      .then((r) => r.json())
      .then((d) => setInvoices(d.invoices ?? []))
      .finally(() => setLoading(false))
  }, [statusFilter, autoOnly])

  const needsReview = invoices.filter((i) => i.auto_generated && i.status === 'draft').length
  const outstanding = invoices
    .filter((i) => ['sent', 'viewed'].includes(i.status))
    .reduce((s, i) => s + i.total_due_cents, 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <div className="text-sm text-slate-500 mt-1">
            Outstanding:{' '}
            <span className="font-semibold text-slate-800">{formatCents(outstanding)}</span>
          </div>
        </div>
        <Link
          href="/admin/invoices/new"
          className="inline-flex items-center gap-2 bg-[var(--teal,#68c5ad)] text-white rounded-lg px-4 py-2 font-semibold hover:bg-teal-600"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </Link>
      </div>

      {needsReview > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-900">
          🍽️ {needsReview} auto-generated draft{needsReview === 1 ? '' : 's'} ready for review
        </div>
      )}

      <div className="flex gap-4 items-center text-sm flex-wrap">
        <label>
          Status:&nbsp;
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded px-2 py-1"
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="viewed">Viewed</option>
            <option value="paid">Paid</option>
            <option value="void">Void</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={autoOnly}
            onChange={(e) => setAutoOnly(e.target.checked)}
          />
          Auto-generated only
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center p-16">
          <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center p-16 text-slate-400">No invoices yet</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Invoice #</th>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-right px-4 py-3">$ Project</th>
                <th className="text-right px-4 py-3">$ Subscriptions</th>
                <th className="text-right px-4 py-3">$ TIK</th>
                <th className="text-right px-4 py-3">$ Total</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Scheduled</th>
                <th className="text-left px-4 py-3">Sent</th>
                <th className="text-left px-4 py-3">Last Viewed</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono">
                    <Link
                      href={`/admin/invoices/${inv.id}`}
                      className="text-teal-600 hover:underline"
                    >
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{inv.prospects?.business_name ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {inv.project_cents > 0 ? formatCents(inv.project_cents) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {inv.subscriptions_cents > 0
                      ? <>
                          {formatCents(inv.subscriptions_cents)}
                          <span className="text-xs text-slate-400">/cycle</span>
                          {inv.subscription_intent === 'created' && (
                            <span className="ml-1 text-[10px] text-emerald-700" title="Stripe subscription is live">●</span>
                          )}
                          {inv.subscription_intent === 'pending' && (
                            <span className="ml-1 text-[10px] text-amber-600" title="Stripe subscription will be created on payment">○</span>
                          )}
                        </>
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-amber-700">
                    {inv.tik_cents > 0 ? formatCents(inv.tik_cents) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {/* Gross deal value: project + subscriptions + TIK.
                        Falls back to total_due_cents for legacy rows
                        without computed totals. */}
                    {formatCents(inv.computed_total_cents > 0 ? inv.computed_total_cents : inv.total_due_cents)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                        STATUS_COLORS[inv.status]
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  {/* Scheduled — highlighted indigo pill when a future
                      send is queued. Shows date+time + channel hint
                      (E/S/E+S). issue_and_send (draft → fire later) is
                      tagged for clarity. */}
                  <td className="px-4 py-3 text-xs">
                    {inv.next_scheduled_send_at ? (
                      <span
                        className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded px-2 py-0.5 font-medium tabular-nums"
                        title={`Channel: ${inv.next_scheduled_send_channel ?? '—'} · ${inv.next_scheduled_send_kind === 'issue_and_send' ? 'Issue + send (draft)' : inv.next_scheduled_send_kind === 'reminder' ? 'Reminder' : 'Resend'}`}
                      >
                        {fmtSchedule(inv.next_scheduled_send_at)}
                        <span className="text-[10px] text-indigo-500">
                          {inv.next_scheduled_send_channel === 'email' ? 'E' : inv.next_scheduled_send_channel === 'sms' ? 'S' : inv.next_scheduled_send_channel === 'both' ? 'E+S' : ''}
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(inv.sent_at)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(inv.viewed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
