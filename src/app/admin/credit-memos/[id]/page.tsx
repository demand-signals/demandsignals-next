'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ExternalLink, FileDown } from 'lucide-react'
import { formatCents } from '@/lib/format'
import { cn } from '@/lib/utils'

interface CreditMemo {
  id: string
  credit_memo_number: string
  invoice_id: string
  prospect_id: string
  amount_cents: number
  currency: string
  kind: 'refund' | 'goodwill' | 'dispute' | 'write_off'
  reason: string
  notes: string | null
  payment_method: string | null
  payment_reference: string | null
  stripe_refund_id: string | null
  issued_at: string
  created_at: string
  prospects: {
    business_name: string
    client_code: string | null
    owner_name: string | null
    owner_email: string | null
  } | null
  invoices: {
    invoice_number: string
    total_due_cents: number
    send_date: string | null
  } | null
}

const KIND_BADGE: Record<string, string> = {
  refund:    'bg-orange-100 text-orange-700',
  goodwill:  'bg-teal-100 text-teal-700',
  dispute:   'bg-red-100 text-red-700',
  write_off: 'bg-slate-200 text-slate-700',
}

const KIND_LABEL: Record<string, string> = {
  refund:    'Refund',
  goodwill:  'Goodwill credit',
  dispute:   'Dispute / chargeback',
  write_off: 'Write-off',
}

const METHOD_LABEL: Record<string, string> = {
  stripe_refund: 'Stripe refund (back to original card)',
  check:         'Check',
  wire:          'Wire transfer',
  cash:          'Cash',
  tik:           'Trade-in-kind',
  zero_balance:  'Zero balance',
  other:         'Manual entry',
}

export default function CreditMemoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [memo, setMemo] = useState<CreditMemo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/credit-memos/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setMemo(d.credit_memo)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div className="text-slate-400 text-sm py-12 text-center">Loading…</div>
  }

  if (error || !memo) {
    return (
      <div className="space-y-4">
        <Link href="/admin/credit-memos" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Credit Memos
        </Link>
        <div className="text-red-500">{error ?? 'Credit memo not found'}</div>
      </div>
    )
  }

  const issuedAt = new Date(memo.issued_at)
  const methodLabel = memo.payment_method
    ? (METHOD_LABEL[memo.payment_method] ?? memo.payment_method)
    : (memo.kind === 'goodwill'
        ? 'No money refunded — goodwill credit'
        : memo.kind === 'write_off'
        ? 'No money refunded — write-off'
        : '—')

  return (
    <div className="pb-24">
      {/* Sticky toolbar */}
      <div
        className="sticky top-0 z-30 flex items-center gap-2 flex-wrap px-6 py-3 border-b border-slate-200 bg-white/95 backdrop-blur-sm"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
      >
        <Link href="/admin/credit-memos" className="text-sm text-teal-600 mr-2">
          ← All credit memos
        </Link>
        <span className="text-xs font-mono text-slate-400 mr-2">{memo.credit_memo_number}</span>
        <span
          className={cn(
            'inline-flex px-2 py-0.5 rounded text-xs font-medium',
            KIND_BADGE[memo.kind] ?? 'bg-slate-100 text-slate-600',
          )}
        >
          {KIND_LABEL[memo.kind] ?? memo.kind}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <a
            href={`/api/admin/credit-memos/${memo.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--teal)] text-white hover:bg-[var(--teal-dark)] transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            PDF
          </a>
        </div>
      </div>

      {/* Branded document card */}
      <div
        className="max-w-3xl mx-auto my-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
      >
        {/* Document header */}
        <div
          className="flex items-start justify-between px-10 py-8"
          style={{ borderBottom: '3px solid #f28500' }}
        >
          <div>
            <Image
              src="https://demandsignals.us/assets/logos/dsig_logo_v2b.png"
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
            <div className="text-2xl font-bold" style={{ color: '#1d2330' }}>Credit Memo</div>
            <div className="font-mono text-sm mt-1" style={{ color: '#5d6780' }}>
              {memo.credit_memo_number}
            </div>
            <div className={cn(
              'text-xs mt-2 inline-block px-2 py-0.5 rounded font-semibold',
              KIND_BADGE[memo.kind] ?? 'bg-slate-100 text-slate-600',
            )}>
              {(KIND_LABEL[memo.kind] ?? memo.kind).toUpperCase()}
            </div>
          </div>
        </div>

        <div className="px-10 py-8 space-y-8" style={{ color: '#1d2330' }}>
          {/* Amount + client row */}
          <div className="flex items-start justify-between gap-8 pb-6 border-b border-slate-100">
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: '#5d6780' }}>
                Client
              </div>
              {memo.prospects ? (
                <>
                  <Link
                    href={`/admin/prospects/${memo.prospect_id}`}
                    className="text-base font-semibold hover:underline inline-flex items-center gap-1.5"
                  >
                    {memo.prospects.business_name}
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                  {memo.prospects.owner_name && (
                    <div className="text-sm mt-0.5" style={{ color: '#5d6780' }}>{memo.prospects.owner_name}</div>
                  )}
                  {memo.prospects.client_code && (
                    <div className="font-mono text-xs text-[var(--teal)] mt-1">{memo.prospects.client_code}</div>
                  )}
                </>
              ) : (
                <div className="text-sm text-slate-400 italic">Unknown client</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: '#5d6780' }}>
                Credit amount
              </div>
              <div className="text-3xl font-bold tabular-nums" style={{ color: '#f28500' }}>
                −{formatCents(memo.amount_cents)}
              </div>
              <div className="text-xs mt-1" style={{ color: '#5d6780' }}>{memo.currency}</div>
            </div>
          </div>

          {/* Memo details */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide font-semibold mb-1.5" style={{ color: '#5d6780' }}>
                Issued
              </div>
              <div className="font-medium">
                {issuedAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="text-xs" style={{ color: '#5d6780' }}>
                {issuedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide font-semibold mb-1.5" style={{ color: '#5d6780' }}>
                Method
              </div>
              <div className="text-sm">{methodLabel}</div>
            </div>

            {(memo.stripe_refund_id || memo.payment_reference) && (
              <div className="col-span-2">
                <div className="text-xs uppercase tracking-wide font-semibold mb-1.5" style={{ color: '#5d6780' }}>
                  {memo.stripe_refund_id ? 'Stripe refund id' : 'Reference'}
                </div>
                <div className="font-mono text-xs break-all">
                  {memo.stripe_refund_id ?? memo.payment_reference}
                </div>
              </div>
            )}

            {memo.invoices && (
              <div className="col-span-2 pt-4 border-t border-slate-100">
                <div className="text-xs uppercase tracking-wide font-semibold mb-1.5" style={{ color: '#5d6780' }}>
                  Applied to invoice
                </div>
                <Link
                  href={`/admin/invoices/${memo.invoice_id}`}
                  className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-[var(--teal)] hover:underline"
                >
                  {memo.invoices.invoice_number}
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <div className="text-xs mt-0.5" style={{ color: '#5d6780' }}>
                  Invoice total: {formatCents(memo.invoices.total_due_cents)}
                </div>
              </div>
            )}
          </div>

          {/* Reason — orange callout, mirrors receipt's notes pattern */}
          <div
            className="rounded-lg p-4"
            style={{ background: 'rgba(242,133,0,0.06)', borderLeft: '3px solid #f28500' }}
          >
            <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#b45309' }}>
              Reason
            </div>
            <div className="text-sm whitespace-pre-wrap" style={{ color: '#1d2330' }}>
              {memo.reason}
            </div>
          </div>

          {/* Internal notes */}
          {memo.notes && (
            <div
              className="rounded-lg p-4"
              style={{ background: 'rgba(104,197,173,0.08)', borderLeft: '3px solid #68c5ad' }}
            >
              <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#4fa894' }}>
                Internal notes
              </div>
              <div className="text-sm whitespace-pre-wrap" style={{ color: '#1d2330' }}>
                {memo.notes}
              </div>
            </div>
          )}

          {/* Immutable warning */}
          <div
            className="rounded-lg p-4"
            style={{ background: 'rgba(242,133,0,0.06)', borderLeft: '3px solid #f28500' }}
          >
            <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#b45309' }}>
              Immutable audit record
            </div>
            <div className="text-xs" style={{ color: '#5d6780' }}>
              Credit memos cannot be edited or deleted. To reverse a credit, issue a new invoice for the same amount.
              {memo.stripe_refund_id && ' To reverse a Stripe refund, refund the refund in the Stripe dashboard.'}
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
              Created {new Date(memo.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
