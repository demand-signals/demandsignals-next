// ── Public invoice viewer: /invoice/[number]/[uuid] ─────────────────
// Server-rendered page. Pure invoice, no site chrome. Pay Now button.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Download } from 'lucide-react'

interface LineItem {
  description: string
  quantity: number
  unit_price_cents: number
  line_total_cents: number
}

interface InvoiceResponse {
  invoice: {
    invoice_number: string
    kind: string
    status: string
    subtotal_cents: number
    discount_cents: number
    total_due_cents: number
    due_date: string | null
    sent_at: string | null
    paid_at: string | null
    voided_at: string | null
    notes: string | null
    superseded_by_number: string | null
    stripe_payment_link_url: string | null
    prospect: { business_name: string; owner_email: string | null } | null
  }
  line_items: LineItem[]
}

function formatCents(c: number): string {
  const dollars = Math.abs(c) / 100
  const sign = c < 0 ? '-' : ''
  return `${sign}$${dollars.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

async function fetchInvoice(number: string, uuid: string): Promise<InvoiceResponse | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://demandsignals.co'
  const res = await fetch(`${baseUrl}/api/invoices/public/${number}?key=${uuid}`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ number: string; uuid: string }>
}) {
  const { number, uuid } = await params
  const data = await fetchInvoice(number, uuid)
  if (!data) notFound()

  const { invoice, line_items } = data
  const isPaid = invoice.status === 'paid'
  const isVoid = invoice.status === 'void'
  const isOutstanding = !isPaid && !isVoid && invoice.total_due_cents > 0
  const downloadUrl = `/api/invoices/public/${number}/pdf?key=${uuid}`
  const payUrl = `/api/invoices/public/${number}/pay?key=${uuid}`

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-10">
        {isVoid && (
          <div className="bg-red-50 border border-red-200 text-red-900 rounded p-4 mb-6">
            <div className="font-bold">VOIDED</div>
            {invoice.superseded_by_number && (
              <div className="text-sm">
                Superseded by <span className="font-mono">{invoice.superseded_by_number}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="text-2xl font-bold text-slate-900">DEMAND SIGNALS</div>
            <div className="text-xs text-slate-500 mt-1">
              demandsignals.co · (916) 542-2423
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-sm text-slate-600">{invoice.invoice_number}</div>
            {isPaid && (
              <div className="inline-block mt-2 bg-emerald-100 text-emerald-800 rounded-full px-3 py-1 text-xs font-bold">
                PAID ✓
              </div>
            )}
            {!isPaid && !isVoid && (
              <div className="inline-block mt-2 bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-xs font-bold">
                {invoice.status.toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Bill To</div>
            <div className="text-sm font-medium">{invoice.prospect?.business_name ?? '—'}</div>
            {invoice.prospect?.owner_email && (
              <div className="text-xs text-slate-500">{invoice.prospect.owner_email}</div>
            )}
          </div>
          <div className="text-right text-sm space-y-1">
            {invoice.sent_at && (
              <div>
                <span className="text-slate-500 text-xs">Issued:</span>{' '}
                {new Date(invoice.sent_at).toLocaleDateString()}
              </div>
            )}
            {invoice.due_date && (
              <div>
                <span className="text-slate-500 text-xs">Due:</span>{' '}
                {new Date(invoice.due_date).toLocaleDateString()}
              </div>
            )}
            {invoice.paid_at && (
              <div className="text-emerald-700">
                <span className="text-slate-500 text-xs">Paid:</span>{' '}
                {new Date(invoice.paid_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        <table className="w-full text-sm mb-6">
          <thead className="text-xs uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="text-left py-2">Description</th>
              <th className="text-right py-2 w-16">Qty</th>
              <th className="text-right py-2 w-24">Unit</th>
              <th className="text-right py-2 w-28">Amount</th>
            </tr>
          </thead>
          <tbody>
            {line_items.map((li, idx) => (
              <tr key={idx} className="border-b border-slate-100">
                <td className="py-2">{li.description}</td>
                <td className="py-2 text-right">{li.quantity}</td>
                <td className="py-2 text-right">{formatCents(li.unit_price_cents)}</td>
                <td className="py-2 text-right font-medium">{formatCents(li.line_total_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-right space-y-1 mb-6">
          <div>
            Subtotal: <span className="font-medium">{formatCents(invoice.subtotal_cents)}</span>
          </div>
          {invoice.discount_cents > 0 && (
            <div>Discount: -{formatCents(invoice.discount_cents)}</div>
          )}
          <div className="text-xl font-bold border-t border-slate-200 pt-2 mt-2">
            Total due: {formatCents(invoice.total_due_cents)}
          </div>
        </div>

        {invoice.notes && (
          <div className="bg-teal-50 border-l-4 border-[var(--teal,#68c5ad)] rounded px-4 py-3 text-sm mb-6">
            <div className="font-semibold text-xs uppercase text-teal-900 mb-1">Notes</div>
            {invoice.notes}
          </div>
        )}

        <div id="pay" className="flex flex-col sm:flex-row gap-3 justify-end">
          <a
            href={downloadUrl}
            className="inline-flex items-center gap-2 bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-slate-700"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </a>
          {isOutstanding && (
            <a
              href={payUrl}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white rounded-lg px-6 py-2 text-base font-bold hover:bg-emerald-700 shadow-lg"
            >
              Pay {formatCents(invoice.total_due_cents)} →
            </a>
          )}
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
          Questions? Email{' '}
          <Link
            href="mailto:DemandSignals@gmail.com"
            className="text-[var(--teal,#68c5ad)]"
          >
            DemandSignals@gmail.com
          </Link>{' '}
          or call (916) 542-2423.
        </div>
      </div>
    </div>
  )
}

export const metadata = {
  robots: 'noindex, nofollow',
}
