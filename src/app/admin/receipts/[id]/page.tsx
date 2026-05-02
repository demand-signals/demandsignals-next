'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ExternalLink, FileDown } from 'lucide-react'
import { formatCents } from '@/lib/format'
import { cn } from '@/lib/utils'

interface Receipt {
  id: string
  receipt_number: string
  invoice_id: string
  prospect_id: string
  amount_cents: number
  currency: string
  payment_method: string
  payment_reference: string | null
  paid_at: string
  notes: string | null
  created_at: string
  prospects: {
    business_name: string
    client_code: string | null
    owner_name: string | null
  } | null
  invoices: {
    invoice_number: string
    total_due_cents: number
  } | null
}

const METHOD_BADGE: Record<string, string> = {
  stripe: 'bg-violet-100 text-violet-700',
  check: 'bg-amber-100 text-amber-700',
  wire: 'bg-blue-100 text-blue-700',
  cash: 'bg-green-100 text-green-700',
  trade: 'bg-teal-100 text-teal-700',
  zero_balance: 'bg-slate-100 text-slate-600',
  other: 'bg-slate-100 text-slate-600',
}

export default function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/receipts/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setReceipt(d.receipt)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div className="text-slate-400 text-sm py-12 text-center">Loading…</div>
  }

  if (error || !receipt) {
    return (
      <div className="space-y-4">
        <Link href="/admin/receipts" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Receipts
        </Link>
        <div className="text-red-500">{error ?? 'Receipt not found'}</div>
      </div>
    )
  }

  const paidAt = new Date(receipt.paid_at)

  return (
    <div className="pb-24">
      {/* Sticky toolbar — mirrors invoice/sow detail pages */}
      <div
        className="sticky top-0 z-30 flex items-center gap-2 flex-wrap px-6 py-3 border-b border-slate-200 bg-white/95 backdrop-blur-sm"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
      >
        <Link href="/admin/receipts" className="text-sm text-teal-600 mr-2">
          ← All receipts
        </Link>
        <span className="text-xs font-mono text-slate-400 mr-2">{receipt.receipt_number}</span>
        <span className="text-xs px-2 py-0.5 rounded-full font-semibold mr-2 bg-emerald-100 text-emerald-700">
          paid
        </span>
        <span
          className={cn(
            'inline-flex px-2 py-0.5 rounded text-xs font-medium',
            METHOD_BADGE[receipt.payment_method] ?? 'bg-slate-100 text-slate-600',
          )}
        >
          {receipt.payment_method.replace('_', ' ')}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <a
            href={`/api/admin/receipts/${receipt.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--teal)] text-white hover:bg-[var(--teal-dark)] transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            PDF
          </a>
        </div>
      </div>

      {/* Branded document card — mirrors invoice/sow doc-card pattern */}
      <div
        className="max-w-3xl mx-auto my-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
      >
        {/* Document header */}
        <div
          className="flex items-start justify-between px-10 py-8"
          style={{ borderBottom: '3px solid #68c5ad' }}
        >
          <div>
            <Image
              src="https://demandsignals.co/logo.png"
              alt="Demand Signals"
              width={160}
              height={50}
              className="h-12 w-auto object-contain"
              unoptimized
            />
            <div className="text-xs mt-1" style={{ color: '#5d6780' }}>
              Demand Signals · demandsignals.co
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: '#1d2330' }}>Receipt</div>
            <div className="font-mono text-sm mt-1" style={{ color: '#5d6780' }}>
              {receipt.receipt_number}
            </div>
            <div className="text-xs mt-2 inline-block px-2 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-700">
              PAID
            </div>
          </div>
        </div>

        <div className="px-10 py-8 space-y-8" style={{ color: '#1d2330' }}>
          {/* Amount + client + paid-date row (mirrors invoice's bill-to row) */}
          <div className="flex items-start justify-between gap-8 pb-6 border-b border-slate-100">
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: '#5d6780' }}>
                Client
              </div>
              {receipt.prospects ? (
                <>
                  <Link
                    href={`/admin/prospects/${receipt.prospect_id}`}
                    className="text-base font-semibold hover:underline inline-flex items-center gap-1.5"
                  >
                    {receipt.prospects.business_name}
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                  {receipt.prospects.owner_name && (
                    <div className="text-sm mt-0.5" style={{ color: '#5d6780' }}>{receipt.prospects.owner_name}</div>
                  )}
                  {receipt.prospects.client_code && (
                    <div className="font-mono text-xs text-[var(--teal)] mt-1">{receipt.prospects.client_code}</div>
                  )}
                </>
              ) : (
                <div className="text-sm text-slate-400 italic">Unknown client</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: '#5d6780' }}>
                Amount paid
              </div>
              <div className="text-3xl font-bold tabular-nums" style={{ color: '#22c55e' }}>
                {formatCents(receipt.amount_cents)}
              </div>
              <div className="text-xs mt-1" style={{ color: '#5d6780' }}>{receipt.currency}</div>
            </div>
          </div>

          {/* Receipt details — clean two-column grid (mirrors invoice's date column block) */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide font-semibold mb-1.5" style={{ color: '#5d6780' }}>
                Paid at
              </div>
              <div className="font-medium">
                {paidAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="text-xs" style={{ color: '#5d6780' }}>
                {paidAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide font-semibold mb-1.5" style={{ color: '#5d6780' }}>
                Payment method
              </div>
              <span
                className={cn(
                  'inline-flex px-2 py-0.5 rounded text-xs font-medium',
                  METHOD_BADGE[receipt.payment_method] ?? 'bg-slate-100 text-slate-600',
                )}
              >
                {receipt.payment_method.replace('_', ' ')}
              </span>
            </div>

            {receipt.payment_reference && (
              <div className="col-span-2">
                <div className="text-xs uppercase tracking-wide font-semibold mb-1.5" style={{ color: '#5d6780' }}>
                  Reference
                </div>
                <div className="font-mono text-xs break-all">{receipt.payment_reference}</div>
              </div>
            )}

            {receipt.invoices && (
              <div className="col-span-2 pt-4 border-t border-slate-100">
                <div className="text-xs uppercase tracking-wide font-semibold mb-1.5" style={{ color: '#5d6780' }}>
                  Applied to invoice
                </div>
                <Link
                  href={`/admin/invoices/${receipt.invoice_id}`}
                  className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-[var(--teal)] hover:underline"
                >
                  {receipt.invoices.invoice_number}
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <div className="text-xs mt-0.5" style={{ color: '#5d6780' }}>
                  Invoice total: {formatCents(receipt.invoices.total_due_cents)}
                </div>
              </div>
            )}
          </div>

          {/* Notes — same callout pattern as invoice's notes block */}
          {receipt.notes && (
            <div
              className="rounded-lg p-4"
              style={{ background: 'rgba(104,197,173,0.08)', borderLeft: '3px solid #68c5ad' }}
            >
              <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#4fa894' }}>
                Notes
              </div>
              <div className="text-sm whitespace-pre-wrap" style={{ color: '#1d2330' }}>
                {receipt.notes}
              </div>
            </div>
          )}

          {/* Immutable-record warning — same callout pattern in amber */}
          <div
            className="rounded-lg p-4"
            style={{ background: 'rgba(242,133,0,0.06)', borderLeft: '3px solid #f28500' }}
          >
            <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#b45309' }}>
              Immutable audit record
            </div>
            <div className="text-xs" style={{ color: '#5d6780' }}>
              Receipts cannot be edited or deleted. To reverse a payment, void the invoice and create a new one.
            </div>
          </div>

          {/* Footer */}
          <div
            className="text-xs pt-4 mt-4 flex items-center justify-between"
            style={{ color: '#5d6780', borderTop: '1px solid #e2e8f0' }}
          >
            <div>
              Demand Signals · DemandSignals@gmail.com · (916) 542-2423 · demandsignals.co
            </div>
            <div className="font-mono text-[10px] text-slate-400">
              Created {new Date(receipt.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
