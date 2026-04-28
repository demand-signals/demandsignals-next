'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, X, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { formatCents } from '@/lib/format'

interface InvoiceOption {
  id: string
  invoice_number: string
  total_due_cents: number
  status: string
  paid_at: string | null
  prospects: { business_name: string; client_code: string | null } | null
}

const KINDS = ['refund', 'goodwill', 'dispute', 'write_off'] as const
const KIND_LABEL: Record<typeof KINDS[number], string> = {
  refund:    'Refund — money returned to client',
  goodwill:  'Goodwill — credit applied, no money moves',
  dispute:   'Dispute — chargeback received',
  write_off: 'Write-off — uncollectable balance',
}

const METHODS = ['stripe_refund', 'check', 'wire', 'cash', 'other', 'tik', 'zero_balance'] as const
const METHOD_LABEL: Record<typeof METHODS[number], string> = {
  stripe_refund: 'Stripe refund (auto)',
  check:         'Check',
  wire:          'Wire transfer',
  cash:          'Cash',
  other:         'Other / manual',
  tik:           'Trade-in-kind (no cash)',
  zero_balance:  'Zero balance',
}

export function NewCreditMemoModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const router = useRouter()
  const [invoices, setInvoices] = useState<InvoiceOption[]>([])
  const [filter, setFilter] = useState('')
  const [form, setForm] = useState({
    invoice_id: '',
    amount_dollars: '',
    kind: 'refund' as typeof KINDS[number],
    reason: '',
    notes: '',
    payment_method: 'stripe_refund' as typeof METHODS[number] | '',
    payment_reference: '',
    auto_stripe_refund: true,
    issued_at: new Date().toISOString().slice(0, 10),
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/invoices?limit=200')
      .then((r) => r.json())
      .then((d) => {
        const list = (d.invoices ?? d.data ?? []) as InvoiceOption[]
        // Sort paid invoices to the top — those are the ones credit memos
        // can refund / dispute against.
        list.sort((a, b) => {
          const aPaid = a.paid_at ? 1 : 0
          const bPaid = b.paid_at ? 1 : 0
          if (aPaid !== bPaid) return bPaid - aPaid
          return (b.paid_at ?? '').localeCompare(a.paid_at ?? '')
        })
        setInvoices(list)
      })
      .catch(() => setInvoices([]))
  }, [])

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  // When kind switches to a non-cash one, clear payment_method.
  useEffect(() => {
    if (form.kind === 'goodwill' || form.kind === 'write_off') {
      setForm((f) => ({ ...f, payment_method: '', auto_stripe_refund: false }))
    } else if (form.kind === 'refund' && !form.payment_method) {
      setForm((f) => ({ ...f, payment_method: 'stripe_refund' }))
    }
  }, [form.kind, form.payment_method])

  const filtered = invoices.filter((i) => {
    if (!filter) return true
    const f = filter.toLowerCase()
    return (
      i.invoice_number.toLowerCase().includes(f) ||
      (i.prospects?.business_name ?? '').toLowerCase().includes(f) ||
      (i.prospects?.client_code ?? '').toLowerCase().includes(f)
    )
  })

  const selectedInvoice = invoices.find((i) => i.id === form.invoice_id)
  const noPaymentNeeded = form.kind === 'goodwill' || form.kind === 'write_off'
  const isStripeRefund = form.kind === 'refund' && form.payment_method === 'stripe_refund'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!form.invoice_id) {
      setErr('Pick an invoice')
      return
    }
    const amountDollars = parseFloat(form.amount_dollars)
    if (!Number.isFinite(amountDollars) || amountDollars <= 0) {
      setErr('Amount must be a positive dollar value')
      return
    }
    if (!form.reason.trim()) {
      setErr('Reason is required (shown on the credit memo PDF + email)')
      return
    }

    setSaving(true)
    const payload: Record<string, unknown> = {
      invoice_id: form.invoice_id,
      amount_cents: Math.round(amountDollars * 100),
      kind: form.kind,
      reason: form.reason.trim(),
      notes: form.notes.trim() || null,
      payment_method: noPaymentNeeded ? null : (form.payment_method || null),
      payment_reference: form.payment_reference.trim() || null,
      auto_stripe_refund: isStripeRefund ? form.auto_stripe_refund : false,
      issued_at: form.issued_at ? new Date(form.issued_at + 'T12:00:00').toISOString() : undefined,
    }

    const res = await fetch('/api/admin/credit-memos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setErr(j.error ?? 'Save failed')
      return
    }
    const j = await res.json()
    if (j?.credit_memo?.id) {
      router.push(`/admin/credit-memos/${j.credit_memo.id}`)
      return
    }
    onCreated()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto pt-12 pb-12 px-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">New Credit Memo</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Invoice picker */}
          <Field label="Invoice *">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by invoice #, client, or client code"
              className={inputCls + ' mb-2'}
            />
            <select
              value={form.invoice_id}
              onChange={(e) => set('invoice_id', e.target.value)}
              className={inputCls}
              size={6}
            >
              <option value="">— select an invoice —</option>
              {filtered.slice(0, 200).map((i) => {
                const status = i.paid_at ? 'PAID' : i.status.toUpperCase()
                return (
                  <option key={i.id} value={i.id}>
                    [{status}] {i.invoice_number} — {i.prospects?.business_name ?? '—'} — {formatCents(i.total_due_cents)}
                  </option>
                )
              })}
            </select>
            {selectedInvoice && (
              <div className="mt-2 text-xs text-slate-500">
                Selected: <strong>{selectedInvoice.invoice_number}</strong> · {selectedInvoice.prospects?.business_name} · {formatCents(selectedInvoice.total_due_cents)}
              </div>
            )}
          </Field>

          {/* Kind */}
          <Field label="Kind *">
            <select
              value={form.kind}
              onChange={(e) => set('kind', e.target.value as typeof KINDS[number])}
              className={inputCls}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>{KIND_LABEL[k]}</option>
              ))}
            </select>
          </Field>

          {/* Amount + issued date */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount ($) *">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount_dollars}
                onChange={(e) => set('amount_dollars', e.target.value)}
                className={inputCls}
                placeholder="250.00"
                required
              />
            </Field>
            <Field label="Issued date">
              <input
                type="date"
                value={form.issued_at}
                onChange={(e) => set('issued_at', e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          {/* Method (only for refund/dispute) */}
          {!noPaymentNeeded && (
            <Field label="Payment method *">
              <select
                value={form.payment_method}
                onChange={(e) => set('payment_method', e.target.value as typeof METHODS[number])}
                className={inputCls}
              >
                {METHODS.filter((m) => m !== 'tik').map((m) => (
                  <option key={m} value={m}>{METHOD_LABEL[m]}</option>
                ))}
              </select>
            </Field>
          )}

          {/* Auto Stripe refund toggle (only for stripe_refund) */}
          {isStripeRefund && (
            <label className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <input
                type="checkbox"
                checked={form.auto_stripe_refund}
                onChange={(e) => set('auto_stripe_refund', e.target.checked)}
                className="mt-0.5"
              />
              <div className="text-xs text-slate-700">
                <strong className="block text-amber-900">
                  Auto-issue Stripe refund now
                </strong>
                When checked, this credit memo POSTs to the Stripe Refund API
                immediately. The refund hits the client&apos;s original card. Uncheck
                if you&apos;ve already refunded out-of-band and want this memo as
                an accounting record only — set the reference field below.
              </div>
            </label>
          )}

          {/* Payment reference (manual) */}
          {!noPaymentNeeded && !(isStripeRefund && form.auto_stripe_refund) && (
            <Field label="Payment reference">
              <input
                value={form.payment_reference}
                onChange={(e) => set('payment_reference', e.target.value)}
                className={inputCls}
                placeholder="Check #, wire trace, Stripe refund id, etc."
              />
            </Field>
          )}

          {/* Reason — required, shown on PDF + email */}
          <Field label="Reason * (shown on PDF + email)">
            <input
              value={form.reason}
              onChange={(e) => set('reason', e.target.value)}
              className={inputCls}
              placeholder="e.g. Service not delivered as scoped"
              maxLength={300}
              required
            />
          </Field>

          {/* Internal notes */}
          <Field label="Internal notes (optional, not shown to client)">
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              className={inputCls}
              maxLength={1000}
            />
          </Field>

          {/* Pre-flight warnings */}
          {isStripeRefund && form.auto_stripe_refund && (
            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Submitting will <strong>charge Stripe</strong> to refund this amount to the client.
                This action is not undoable from the platform — to reverse it, refund the refund in the Stripe dashboard.
              </span>
            </div>
          )}
          {form.kind === 'goodwill' && (
            <div className="text-xs text-teal-800 bg-teal-50 border border-teal-200 rounded px-3 py-2 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Goodwill credit — no money moves. The client&apos;s outstanding balance is reduced.</span>
            </div>
          )}
          {form.kind === 'write_off' && (
            <div className="text-xs text-slate-700 bg-slate-100 border border-slate-200 rounded px-3 py-2 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Write-off — accounting cleanup. Amount cancels the unpaid portion of the invoice.</span>
            </div>
          )}

          {err && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-sm rounded-lg bg-[var(--teal)] text-white hover:bg-[var(--teal-dark)] disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Issue credit memo
          </button>
        </div>
      </form>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">{label}</span>
      {children}
    </label>
  )
}
