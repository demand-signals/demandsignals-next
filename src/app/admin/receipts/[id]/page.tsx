'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-400 w-36 flex-shrink-0 pt-0.5 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-slate-700 flex-1">{children}</span>
    </div>
  )
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

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-3">
        <Link
          href="/admin/receipts"
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Receipts
        </Link>

        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-800 font-mono">{receipt.receipt_number}</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {receipt.prospects?.business_name ?? 'Unknown client'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-600">{formatCents(receipt.amount_cents)}</div>
            <span className={cn(
              'inline-flex px-2.5 py-0.5 rounded text-xs font-medium mt-1',
              METHOD_BADGE[receipt.payment_method] ?? 'bg-slate-100 text-slate-600',
            )}>
              {receipt.payment_method.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Receipt Details</h2>

        <Row label="Receipt #">
          <span className="font-mono font-semibold">{receipt.receipt_number}</span>
        </Row>

        <Row label="Amount">
          <span className="font-mono font-semibold text-emerald-600">{formatCents(receipt.amount_cents)} {receipt.currency}</span>
        </Row>

        <Row label="Payment Method">
          <span className={cn(
            'inline-flex px-2 py-0.5 rounded text-xs font-medium',
            METHOD_BADGE[receipt.payment_method] ?? 'bg-slate-100 text-slate-600',
          )}>
            {receipt.payment_method.replace('_', ' ')}
          </span>
        </Row>

        {receipt.payment_reference && (
          <Row label="Reference">
            <span className="font-mono text-xs">{receipt.payment_reference}</span>
          </Row>
        )}

        <Row label="Paid At">
          {new Date(receipt.paid_at).toLocaleString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit',
          })}
        </Row>

        {receipt.notes && (
          <Row label="Notes">
            <span className="whitespace-pre-wrap">{receipt.notes}</span>
          </Row>
        )}

        <Row label="Created At">
          <span className="text-xs text-slate-400">
            {new Date(receipt.created_at).toLocaleString()}
          </span>
        </Row>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Invoice link */}
        {receipt.invoices && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Invoice</div>
            <Link
              href={`/admin/invoices/${receipt.invoice_id}`}
              className="flex items-center gap-1.5 text-[var(--teal)] hover:text-[var(--teal-dark)] font-mono text-sm font-semibold"
            >
              {receipt.invoices.invoice_number}
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <div className="text-xs text-slate-400 mt-1">
              Total due: {formatCents(receipt.invoices.total_due_cents)}
            </div>
          </div>
        )}

        {/* Prospect link */}
        {receipt.prospects && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Client</div>
            <Link
              href={`/admin/prospects/${receipt.prospect_id}`}
              className="flex items-center gap-1.5 text-slate-700 hover:text-slate-900 text-sm font-semibold"
            >
              {receipt.prospects.business_name}
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            {receipt.prospects.client_code && (
              <div className="font-mono text-xs text-[var(--teal)] mt-1">
                {receipt.prospects.client_code}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs text-amber-700">
          Receipts are immutable audit records. They cannot be edited or deleted.
          To reverse a payment, void the invoice and create a new one.
        </p>
      </div>
    </div>
  )
}
