'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Copy, ExternalLink, Mail, MessageSquare, CreditCard } from 'lucide-react'

interface LineItem {
  description: string
  quantity: number
  unit_price_cents: number
  line_total_cents: number
  sort_order: number
}

interface InvoiceDetail {
  invoice: {
    id: string
    invoice_number: string
    public_uuid: string
    kind: string
    status: string
    subtotal_cents: number
    discount_cents: number
    total_due_cents: number
    due_date: string | null
    paid_at: string | null
    paid_method: string | null
    sent_at: string | null
    viewed_at: string | null
    voided_at: string | null
    void_reason: string | null
    auto_generated: boolean
    auto_trigger: string | null
    notes: string | null
    stripe_payment_link_url: string | null
    sent_via_channel: string | null
    created_at: string
    prospect: { business_name: string; owner_email: string | null; owner_phone: string | null } | null
  }
  line_items: LineItem[]
  supersedes_number: string | null
  superseded_by_number: string | null
}

function formatCents(c: number): string {
  const dollars = Math.abs(c) / 100
  const sign = c < 0 ? '-' : ''
  return `${sign}$${dollars.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [detail, setDetail] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sendModal, setSendModal] = useState<{ public_url: string; pay_url: string | null } | null>(
    null,
  )
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/admin/invoices/${id}`)
    const data = await res.json()
    if (!res.ok) setError(data.error ?? 'Failed')
    else setDetail(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [id])

  async function send() {
    if (!detail) return
    setBusy(true)
    const res = await fetch(`/api/admin/invoices/${id}/send`, { method: 'POST' })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) {
      alert(data.error)
      return
    }
    setSendModal({ public_url: data.public_url, pay_url: data.pay_url })
    load()
  }

  async function markPaid() {
    const method = prompt('Payment method (check/wire/other)', 'check')
    if (!method) return
    setBusy(true)
    await fetch(`/api/admin/invoices/${id}/mark-paid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paid_method: method, paid_note: `Marked paid by admin` }),
    })
    setBusy(false)
    load()
  }

  async function voidInvoice(reissue: boolean) {
    const reason = prompt('Void reason (min 5 chars):')
    if (!reason || reason.length < 5) return
    setBusy(true)
    const endpoint = reissue ? 'void-and-reissue' : 'void'
    const res = await fetch(`/api/admin/invoices/${id}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ void_reason: reason }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) {
      alert(data.error)
      return
    }
    if (reissue) router.push(`/admin/invoices/${data.new_invoice.id}`)
    else load()
  }

  async function sendSms() {
    setBusy(true)
    const res = await fetch(`/api/admin/invoices/${id}/send-sms`, { method: 'POST' })
    const data = await res.json()
    setBusy(false)
    alert(res.ok ? `SMS sent (${data.message_id})` : `SMS failed: ${data.error}`)
    load()
  }

  async function sendEmail() {
    setBusy(true)
    const res = await fetch(`/api/admin/invoices/${id}/send-email`, { method: 'POST' })
    const data = await res.json()
    setBusy(false)
    alert(res.ok ? 'Email sent' : `Email failed: ${data.error}`)
    load()
  }

  async function createPaymentLink() {
    setBusy(true)
    const res = await fetch(`/api/admin/invoices/${id}/payment-link`, { method: 'POST' })
    const data = await res.json()
    setBusy(false)
    if (res.ok) {
      window.open(data.url, '_blank')
    } else {
      alert(`Payment Link failed: ${data.error}`)
    }
    load()
  }

  async function deleteDraft() {
    if (!confirm('Delete this draft?')) return
    setBusy(true)
    await fetch(`/api/admin/invoices/${id}`, { method: 'DELETE' })
    router.push('/admin/invoices')
  }

  if (loading)
    return (
      <div className="flex justify-center p-16">
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    )
  if (error || !detail) return <div className="p-6 text-red-600">Error: {error ?? 'Not found'}</div>

  const { invoice, line_items } = detail
  const s = invoice.status

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/invoices" className="text-sm text-teal-600">
            ← All invoices
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {invoice.invoice_number}
          </h1>
          <div className="text-xs text-slate-500 mt-1">
            Kind: {invoice.kind}
            {invoice.auto_trigger && ` · auto-trigger: ${invoice.auto_trigger}`}
          </div>
          {detail.supersedes_number && (
            <div className="text-xs mt-1">
              ↑ Replaces <span className="font-mono">{detail.supersedes_number}</span>
            </div>
          )}
          {detail.superseded_by_number && (
            <div className="text-xs mt-1 text-red-700">
              ↓ Replaced by <span className="font-mono">{detail.superseded_by_number}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {s === 'draft' && (
            <>
              <button
                onClick={deleteDraft}
                disabled={busy}
                className="bg-red-100 text-red-700 rounded px-3 py-1.5 text-sm"
              >
                Delete
              </button>
              <button
                onClick={send}
                disabled={busy}
                className="bg-teal-500 text-white rounded px-4 py-1.5 text-sm font-semibold"
              >
                Send
              </button>
            </>
          )}
          {(s === 'sent' || s === 'viewed') && (
            <>
              <button
                onClick={sendSms}
                disabled={busy}
                className="bg-blue-100 text-blue-700 rounded px-3 py-1.5 text-sm inline-flex items-center gap-1"
              >
                <MessageSquare className="w-3.5 h-3.5" /> SMS
              </button>
              <button
                onClick={sendEmail}
                disabled={busy}
                className="bg-blue-100 text-blue-700 rounded px-3 py-1.5 text-sm inline-flex items-center gap-1"
              >
                <Mail className="w-3.5 h-3.5" /> Email
              </button>
              {invoice.total_due_cents > 0 && (
                <button
                  onClick={createPaymentLink}
                  disabled={busy}
                  className="bg-emerald-100 text-emerald-700 rounded px-3 py-1.5 text-sm inline-flex items-center gap-1"
                >
                  <CreditCard className="w-3.5 h-3.5" /> Payment Link
                </button>
              )}
              <button
                onClick={markPaid}
                disabled={busy}
                className="bg-emerald-500 text-white rounded px-3 py-1.5 text-sm"
              >
                Mark Paid
              </button>
              <button
                onClick={() => voidInvoice(false)}
                disabled={busy}
                className="bg-slate-100 rounded px-3 py-1.5 text-sm"
              >
                Void
              </button>
              <button
                onClick={() => voidInvoice(true)}
                disabled={busy}
                className="bg-orange-100 text-orange-900 rounded px-3 py-1.5 text-sm"
              >
                Void & Re-issue
              </button>
            </>
          )}
          {s === 'paid' && (
            <button
              onClick={() => voidInvoice(true)}
              disabled={busy}
              className="bg-orange-100 text-orange-900 rounded px-3 py-1.5 text-sm"
            >
              Void & Re-issue
            </button>
          )}
          {invoice.status !== 'draft' && (
            <a
              href={`/api/admin/invoices/${id}/pdf`}
              target="_blank"
              rel="noopener"
              className="bg-slate-100 rounded px-3 py-1.5 text-sm inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" /> PDF
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-semibold mb-3">Line items</h2>
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left py-1">Description</th>
                <th className="text-right py-1">Qty</th>
                <th className="text-right py-1">Unit</th>
                <th className="text-right py-1">Amount</th>
              </tr>
            </thead>
            <tbody>
              {line_items.map((li, idx) => (
                <tr key={idx} className="border-t border-slate-100">
                  <td className="py-2">{li.description}</td>
                  <td className="py-2 text-right">{li.quantity}</td>
                  <td className="py-2 text-right">{formatCents(li.unit_price_cents)}</td>
                  <td className="py-2 text-right font-medium">
                    {formatCents(li.line_total_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 pt-4 border-t border-slate-200 text-right space-y-1 text-sm">
            <div>
              Subtotal: <span className="font-medium">{formatCents(invoice.subtotal_cents)}</span>
            </div>
            {invoice.discount_cents > 0 && (
              <div>
                Discount: <span className="font-medium">-{formatCents(invoice.discount_cents)}</span>
              </div>
            )}
            <div className="text-lg font-bold">Total due: {formatCents(invoice.total_due_cents)}</div>
          </div>
          {invoice.notes && (
            <div className="mt-4 bg-teal-50 border-l-4 border-teal-500 px-3 py-2 text-sm">
              <div className="font-semibold text-xs text-teal-900 uppercase mb-1">Notes</div>
              {invoice.notes}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="font-semibold mb-2">Client</h3>
            <div className="text-sm">{invoice.prospect?.business_name ?? '—'}</div>
            {invoice.prospect?.owner_email && (
              <div className="text-xs text-slate-500">{invoice.prospect.owner_email}</div>
            )}
            {invoice.prospect?.owner_phone && (
              <div className="text-xs text-slate-500">{invoice.prospect.owner_phone}</div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm space-y-2">
            <h3 className="font-semibold mb-2">Timeline</h3>
            <div className="text-xs text-slate-500">
              Created: {new Date(invoice.created_at).toLocaleString()}
            </div>
            {invoice.sent_at && (
              <div className="text-xs text-slate-500">
                Sent: {new Date(invoice.sent_at).toLocaleString()}
                {invoice.sent_via_channel && ` · ${invoice.sent_via_channel}`}
              </div>
            )}
            {invoice.viewed_at && (
              <div className="text-xs text-slate-500">
                Viewed: {new Date(invoice.viewed_at).toLocaleString()}
              </div>
            )}
            {invoice.paid_at && (
              <div className="text-xs text-emerald-700">
                Paid: {new Date(invoice.paid_at).toLocaleString()} via {invoice.paid_method}
              </div>
            )}
            {invoice.voided_at && (
              <div className="text-xs text-red-700">
                Voided: {new Date(invoice.voided_at).toLocaleString()}
                {invoice.void_reason && ` — ${invoice.void_reason}`}
              </div>
            )}
          </div>

          {invoice.stripe_payment_link_url && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm">
              <div className="font-semibold text-emerald-900 mb-2">Stripe Payment Link</div>
              <a
                href={invoice.stripe_payment_link_url}
                target="_blank"
                rel="noopener"
                className="text-xs text-emerald-700 break-all underline"
              >
                {invoice.stripe_payment_link_url}
              </a>
            </div>
          )}
        </div>
      </div>

      {sendModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full space-y-4">
            <h2 className="text-lg font-bold">Invoice sent</h2>
            <p className="text-sm text-slate-600">
              Paste this link into your preferred channel. Once the client views it, status flips
              to 'viewed' automatically.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded p-2 flex items-center gap-2">
              <code className="flex-1 text-xs truncate">{sendModal.public_url}</code>
              <button
                onClick={() => navigator.clipboard.writeText(sendModal.public_url)}
                className="text-teal-600 hover:text-teal-700"
                title="Copy URL"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setSendModal(null)}
                className="bg-teal-500 text-white rounded-lg px-4 py-2 font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
