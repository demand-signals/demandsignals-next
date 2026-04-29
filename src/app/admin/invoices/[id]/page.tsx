'use client'

import { useEffect, useState, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Loader2,
  Copy,
  ExternalLink,
  Mail,
  MessageSquare,
  CreditCard,
  Plus,
  Trash2,
  Save,
  FileText,
  Send,
  RotateCcw,
  RefreshCw,
} from 'lucide-react'
import { formatCents } from '@/lib/format'
import ProspectContactEditor, { type ProspectContact } from '@/components/admin/ProspectContactEditor'

// ── Types ─────────────────────────────────────────────────────────────

interface LineItem {
  id?: string
  description: string
  quantity: number
  unit_price_cents: number
  unit_price_input: string  // raw string for the price input; committed to cents on blur
  discount_pct: number
  discount_label: string | null
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
    send_date: string | null
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
    late_fee_cents: number
    late_fee_grace_days: number
    late_fee_applied_at: string | null
    created_at: string
    prospect: (ProspectContact & { business_name: string; id: string }) | null
  }
  line_items: LineItem[]
  supersedes_number: string | null
  superseded_by_number: string | null
}

// ── Money helpers ─────────────────────────────────────────────────────

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2)
}

function inputToCents(val: string): number {
  return Math.round(parseFloat(val || '0') * 100)
}

function computeLineTotal(li: LineItem): number {
  const sub = li.quantity * li.unit_price_cents
  const disc = Math.round(sub * (li.discount_pct || 0) / 100)
  return sub - disc
}

// ── Shared field components ───────────────────────────────────────────

function FieldInput({
  value,
  onChange,
  placeholder,
  className,
  type = 'text',
  step,
  min,
  readOnly,
}: {
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  className?: string
  type?: string
  step?: string
  min?: string
  readOnly?: boolean
}) {
  return (
    <input
      type={type}
      step={step}
      min={min}
      value={value}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
      className={[
        'border-0 border-b border-dashed border-slate-300 bg-transparent px-0 py-0.5 focus:outline-none focus:border-teal-400 w-full',
        readOnly ? 'text-slate-500 cursor-default' : '',
        className ?? '',
      ].join(' ')}
    />
  )
}

function FieldTextarea({
  value,
  onChange,
  placeholder,
  rows = 2,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className="border border-dashed border-slate-300 bg-transparent px-2 py-1 rounded focus:outline-none focus:border-teal-400 w-full resize-y text-sm"
    />
  )
}

// ── Main page ─────────────────────────────────────────────────────────

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [detail, setDetail] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [sendModal, setSendModal] = useState<{ public_url: string; pay_url: string | null } | null>(null)

  // Editable state
  const [lines, setLines] = useState<LineItem[]>([])
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [sendDate, setSendDate] = useState('')
  const [lateFeeCents, setLateFeeCents] = useState(0)
  const [lateFeeDollarsInput, setLateFeeDollarsInput] = useState('0.00')
  const [lateFeeGraceDays, setLateFeeGraceDays] = useState(0)
  const [tikCents, setTikCents] = useState(0)
  const [tikAmountInput, setTikAmountInput] = useState('0.00')
  const [tikDescription, setTikDescription] = useState('')
  // Document-level discount (migration 036). One-time only. Stacks with TIK.
  const [discountKind, setDiscountKind] = useState<'percent' | 'amount' | ''>('')
  const [discountPctInput, setDiscountPctInput] = useState('0')
  const [discountAmountInput, setDiscountAmountInput] = useState('0.00')
  const [discountValueBps, setDiscountValueBps] = useState(0)
  const [discountAmountCents, setDiscountAmountCents] = useState(0)
  const [discountDescription, setDiscountDescription] = useState('')

  function markDirty() {
    setDirty(true)
    setSaveError(null)
  }

  function initState(d: InvoiceDetail) {
    setLines(
      (d.line_items ?? []).map((li) => ({
        id: li.id,
        description: li.description,
        quantity: li.quantity,
        unit_price_cents: li.unit_price_cents,
        unit_price_input: centsToInput(li.unit_price_cents),
        discount_pct: li.discount_pct ?? 0,
        discount_label: li.discount_label ?? null,
        sort_order: li.sort_order ?? 0,
      })),
    )
    setNotes(d.invoice.notes ?? '')
    setDueDate(d.invoice.due_date ?? '')
    setSendDate(d.invoice.send_date ?? new Date().toISOString().slice(0, 10))
    const lateFee = d.invoice.late_fee_cents ?? 0
    setLateFeeCents(lateFee)
    setLateFeeDollarsInput(centsToInput(lateFee))
    setLateFeeGraceDays(d.invoice.late_fee_grace_days ?? 0)
    const tc = (d.invoice as typeof d.invoice & { trade_credit_cents?: number; trade_credit_description?: string | null }).trade_credit_cents ?? 0
    setTikCents(tc)
    setTikAmountInput(centsToInput(tc))
    setTikDescription((d.invoice as typeof d.invoice & { trade_credit_description?: string | null }).trade_credit_description ?? '')
    // Document-level discount (migration 036)
    type DiscFields = typeof d.invoice & {
      discount_kind?: 'percent' | 'amount' | null
      discount_value_bps?: number
      discount_amount_cents?: number
      discount_description?: string | null
    }
    const dk = (d.invoice as DiscFields).discount_kind ?? null
    const dbps = (d.invoice as DiscFields).discount_value_bps ?? 0
    const damt = (d.invoice as DiscFields).discount_amount_cents ?? 0
    setDiscountKind(dk ?? '')
    setDiscountValueBps(dbps)
    setDiscountAmountCents(damt)
    setDiscountPctInput((dbps / 100).toString())
    setDiscountAmountInput(centsToInput(damt))
    setDiscountDescription((d.invoice as DiscFields).discount_description ?? '')
    setDirty(false)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/invoices/${id}`)
    const data = await res.json()
    if (!res.ok) setFetchError(data.error ?? 'Failed')
    else {
      setDetail(data)
      initState(data)
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  // ── Computed totals ────────────────────────────────────────────────

  const subtotalCents = lines.reduce((s, li) => s + li.quantity * li.unit_price_cents, 0)
  const lineDiscountCents = lines.reduce((s, li) => {
    const sub = li.quantity * li.unit_price_cents
    return s + Math.round(sub * (li.discount_pct || 0) / 100)
  }, 0)
  // line total = subtotal − line-item discounts
  const lineTotalCents = subtotalCents - lineDiscountCents
  // Document-level discount (migration 036). Applied AFTER line discounts,
  // BEFORE TIK. Same order as SOW: subtotal → line disc → doc disc → TIK.
  const docDiscountCents = (() => {
    if (discountKind === 'percent') {
      const bps = Math.max(0, Math.min(10000, discountValueBps))
      return Math.min(lineTotalCents, Math.round(lineTotalCents * bps / 10000))
    }
    if (discountKind === 'amount') {
      return Math.min(lineTotalCents, Math.max(0, discountAmountCents))
    }
    return 0
  })()
  // Kept for backward compat: existing UI may still reference discountCents
  const discountCents = lineDiscountCents
  const totalDueCents = Math.max(0, lineTotalCents - docDiscountCents - tikCents)

  // ── Save ──────────────────────────────────────────────────────────

  async function save(forceEdit = false) {
    setBusy(true)
    setSaveError(null)
    try {
      const body: Record<string, unknown> = {
        notes: notes || null,
        due_date: dueDate || null,
        send_date: sendDate || null,
        late_fee_cents: lateFeeCents,
        late_fee_grace_days: lateFeeGraceDays,
        trade_credit_cents: tikCents,
        trade_credit_description: tikDescription || null,
        discount_kind: discountKind || null,
        discount_value_bps: discountKind === 'percent' ? discountValueBps : 0,
        discount_amount_cents: discountKind === 'amount' ? discountAmountCents : 0,
        discount_description: discountKind ? (discountDescription.trim() || null) : null,
        line_items: lines
          .filter((l) => l.description.trim())
          .map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unit_price_cents: l.unit_price_cents,
            discount_pct: l.discount_pct,
            discount_label: l.discount_label,
          })),
      }
      if (forceEdit) body.force_edit = true

      const res = await fetch(`/api/admin/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))

      if (res.status === 409 && !forceEdit) {
        if (confirm(`Invoice is ${detail?.invoice.status}. Force edit?`)) {
          setBusy(false)
          return save(true)
        }
        setBusy(false)
        return
      }
      if (!res.ok) {
        setSaveError(data.error ?? 'Save failed')
        setBusy(false)
        return
      }
      setDirty(false)
      await load()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  // ── Invoice actions ────────────────────────────────────────────────

  async function send() {
    if (!detail) return
    setBusy(true)
    const res = await fetch(`/api/admin/invoices/${id}/send`, { method: 'POST' })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { alert(data.error); return }
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
      body: JSON.stringify({ paid_method: method, paid_note: 'Marked paid by admin' }),
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
    if (!res.ok) { alert(data.error); return }
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
    if (res.ok) window.open(data.url, '_blank')
    else alert(`Payment link failed: ${data.error}`)
    load()
  }

  async function deleteDraft() {
    if (!confirm('Delete this draft?')) return
    setBusy(true)
    await fetch(`/api/admin/invoices/${id}`, { method: 'DELETE' })
    router.push('/admin/invoices')
  }

  async function refund() {
    const reason = prompt('Refund reason:')
    if (!reason) return
    setBusy(true)
    const res = await fetch(`/api/admin/invoices/${id}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { alert(data.error ?? 'Refund failed'); return }
    alert(data.note ?? 'Refund recorded.')
    load()
  }

  async function resend() {
    setBusy(true)
    const res = await fetch(`/api/admin/invoices/${id}/resend`, { method: 'POST' })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { alert(data.error ?? 'Resend failed'); return }
    alert(`Resent via ${data.channel ?? 'email'}`)
    load()
  }

  // ── Line item helpers ─────────────────────────────────────────────

  function addLine() {
    setLines((ls) => [
      ...ls,
      { description: '', quantity: 1, unit_price_cents: 0, unit_price_input: '0.00', discount_pct: 0, discount_label: null, sort_order: ls.length },
    ])
    markDirty()
  }

  function updateLine(idx: number, patch: Partial<LineItem>) {
    setLines((ls) => ls.map((x, i) => (i === idx ? { ...x, ...patch } : x)))
    markDirty()
  }

  function removeLine(idx: number) {
    setLines((ls) => ls.filter((_, i) => i !== idx))
    markDirty()
  }

  // ── Render ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center p-16">
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    )
  }
  if (fetchError || !detail) {
    return <div className="p-6 text-red-600">Error: {fetchError ?? 'Not found'}</div>
  }

  const { invoice } = detail
  const s = invoice.status
  const isDraft = s === 'draft'
  const isSentOrViewed = s === 'sent' || s === 'viewed'
  const publicUrl = `https://demandsignals.co/invoice/${invoice.invoice_number}/${invoice.public_uuid}`
  const p = invoice.prospect

  return (
    <div className="pb-24">
      {/* Sticky toolbar */}
      <div
        className="sticky top-0 z-30 flex items-center gap-2 flex-wrap px-6 py-3 border-b border-slate-200 bg-white/95 backdrop-blur-sm"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
      >
        <Link href="/admin/invoices" className="text-sm text-teal-600 mr-2">
          ← All invoices
        </Link>
        <span className="text-xs font-mono text-slate-400 mr-2">{invoice.invoice_number}</span>

        <span
          className={`text-xs px-2 py-0.5 rounded-full font-semibold mr-2 ${
            isDraft
              ? 'bg-slate-100 text-slate-600'
              : s === 'paid'
                ? 'bg-emerald-100 text-emerald-700'
                : s === 'void'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
          }`}
        >
          {s}
        </span>

        {detail.supersedes_number && (
          <span className="text-xs text-slate-400">↑ replaces {detail.supersedes_number}</span>
        )}
        {detail.superseded_by_number && (
          <span className="text-xs text-red-500">↓ replaced by {detail.superseded_by_number}</span>
        )}

        <div className="flex-1" />

        {saveError && <span className="text-xs text-red-600 mr-2">{saveError}</span>}

        {/* Save */}
        <button
          onClick={() => save()}
          disabled={!dirty || busy}
          className="inline-flex items-center gap-1.5 bg-teal-500 text-white rounded px-3 py-1.5 text-sm font-semibold disabled:opacity-40 hover:bg-teal-600"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>

        {/* Preview PDF — always available */}
        <a
          href={`/api/admin/invoices/${id}/pdf`}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-3 py-1.5 text-sm"
        >
          <FileText className="w-3.5 h-3.5" /> Preview PDF
        </a>

        {isDraft && (
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
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white rounded px-3 py-1.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          </>
        )}

        {isSentOrViewed && (
          <>
            <button onClick={sendSms} disabled={busy} className="bg-blue-100 text-blue-700 rounded px-3 py-1.5 text-sm inline-flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" /> SMS
            </button>
            <button onClick={sendEmail} disabled={busy} className="bg-blue-100 text-blue-700 rounded px-3 py-1.5 text-sm inline-flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" /> Email
            </button>
            {invoice.total_due_cents > 0 && (
              <button onClick={createPaymentLink} disabled={busy} className="bg-emerald-100 text-emerald-700 rounded px-3 py-1.5 text-sm inline-flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5" /> Payment Link
              </button>
            )}
            <button onClick={markPaid} disabled={busy} className="bg-emerald-500 text-white rounded px-3 py-1.5 text-sm">
              Mark Paid
            </button>
            <button onClick={() => voidInvoice(false)} disabled={busy} className="bg-slate-100 rounded px-3 py-1.5 text-sm">Void</button>
            <button onClick={() => voidInvoice(true)} disabled={busy} className="bg-orange-100 text-orange-900 rounded px-3 py-1.5 text-sm">
              Void &amp; Re-issue
            </button>
          </>
        )}

        {invoice.sent_at && (
          <button onClick={resend} disabled={busy} className="bg-blue-50 text-blue-700 rounded px-3 py-1.5 text-sm inline-flex items-center gap-1 disabled:opacity-50">
            <RefreshCw className="w-3.5 h-3.5" /> Resend
          </button>
        )}

        {s === 'paid' && (
          <>
            <button onClick={refund} disabled={busy} className="bg-red-100 text-red-700 rounded px-3 py-1.5 text-sm inline-flex items-center gap-1 disabled:opacity-50">
              <RotateCcw className="w-3.5 h-3.5" /> Refund
            </button>
            <button onClick={() => voidInvoice(true)} disabled={busy} className="bg-orange-100 text-orange-900 rounded px-3 py-1.5 text-sm">
              Void &amp; Re-issue
            </button>
          </>
        )}

        {!isDraft && (
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-3 py-1.5 text-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Client view
          </a>
        )}
      </div>

      {/* Branded document */}
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
            <div className="text-2xl font-bold" style={{ color: '#1d2330' }}>Invoice</div>
            <div className="font-mono text-sm mt-1" style={{ color: '#5d6780' }}>
              {invoice.invoice_number}
            </div>
            {invoice.auto_trigger && (
              <div className="text-xs mt-0.5" style={{ color: '#5d6780' }}>
                auto: {invoice.auto_trigger}
              </div>
            )}
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 justify-end text-sm">
                <span className="text-xs" style={{ color: '#5d6780' }}>Issued</span>
                <FieldInput
                  type="date"
                  value={sendDate}
                  onChange={(v) => { setSendDate(v); markDirty() }}
                  className="text-sm text-right w-36"
                />
              </div>
              <div className="flex items-center gap-2 justify-end text-sm">
                <span className="text-xs" style={{ color: '#5d6780' }}>Due</span>
                <FieldInput
                  type="date"
                  value={dueDate}
                  onChange={(v) => { setDueDate(v); markDirty() }}
                  className="text-sm text-right w-36"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-10 py-8 space-y-8" style={{ color: '#1d2330' }}>
          {/* Status notices — when paid, surface the AMOUNT prominently
              so internal workers don't squint to figure out what came in. */}
          {invoice.paid_at && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
              <strong>Paid {formatCents(invoice.total_due_cents)}</strong> on{' '}
              {new Date(invoice.paid_at).toLocaleString()}
              {invoice.paid_method && ` via ${invoice.paid_method}`}
            </div>
          )}
          {invoice.voided_at && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              Voided {new Date(invoice.voided_at).toLocaleString()}
              {invoice.void_reason && ` — ${invoice.void_reason}`}
            </div>
          )}
          {detail.supersedes_number && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              Replaces invoice <span className="font-mono">{detail.supersedes_number}</span>
            </div>
          )}
          {detail.superseded_by_number && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">
              Replaced by <span className="font-mono">{detail.superseded_by_number}</span>
            </div>
          )}

          {/* Client block */}
          {p && (
            <div className="rounded-lg p-4" style={{ background: '#f4f6f9' }}>
              <div className="text-xs uppercase tracking-wide mb-2" style={{ color: '#5d6780' }}>
                Bill to
              </div>
              <div className="font-semibold text-base mb-1">{p.business_name}</div>
              <ProspectContactEditor prospect={p} />
              <Link
                href={`/admin/prospects/${p.id}`}
                className="text-xs text-teal-600 mt-2 inline-block"
              >
                View prospect →
              </Link>
            </div>
          )}

          {/* Line items */}
          <section>
            <div
              className="text-xs uppercase tracking-wide font-semibold pb-1.5 mb-4"
              style={{ color: '#5d6780', borderBottom: '1px solid #e2e8f0' }}
            >
              Items
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 text-xs uppercase font-semibold" style={{ background: '#f4f6f9', color: '#5d6780' }}>
                    Description
                  </th>
                  <th className="text-right p-2 text-xs uppercase font-semibold w-16" style={{ background: '#f4f6f9', color: '#5d6780' }}>
                    Qty
                  </th>
                  <th className="text-right p-2 text-xs uppercase font-semibold w-24" style={{ background: '#f4f6f9', color: '#5d6780' }}>
                    Unit
                  </th>
                  <th className="text-right p-2 text-xs uppercase font-semibold w-20" style={{ background: '#f4f6f9', color: '#5d6780' }}>
                    Disc%
                  </th>
                  <th className="text-right p-2 text-xs uppercase font-semibold w-24" style={{ background: '#f4f6f9', color: '#5d6780' }}>
                    Total
                  </th>
                  <th className="w-8" style={{ background: '#f4f6f9' }} />
                </tr>
              </thead>
              <tbody>
                {lines.map((li, idx) => {
                  const lineCents = computeLineTotal(li)
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td className="p-2 align-top">
                        <FieldInput
                          value={li.description}
                          onChange={(v) => updateLine(idx, { description: v })}
                          placeholder="Description"
                          className="font-medium"
                        />
                        <FieldInput
                          value={li.discount_label ?? ''}
                          onChange={(v) => updateLine(idx, { discount_label: v || null })}
                          placeholder="Discount label (optional)"
                          className="text-xs mt-1"
                        />
                      </td>
                      <td className="p-2 align-top">
                        <input
                          type="number"
                          min="1"
                          value={li.quantity}
                          onChange={(e) => updateLine(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-full border border-slate-200 rounded px-1.5 py-1 text-right text-sm"
                        />
                      </td>
                      <td className="p-2 align-top">
                        <input
                          type="number"
                          step="0.01"
                          value={li.unit_price_input}
                          onChange={(e) => updateLine(idx, { unit_price_input: e.target.value })}
                          onBlur={(e) => {
                            const cents = inputToCents(e.target.value)
                            updateLine(idx, {
                              unit_price_cents: cents,
                              unit_price_input: centsToInput(cents),
                            })
                          }}
                          className="w-full border border-slate-200 rounded px-1.5 py-1 text-right text-sm"
                        />
                      </td>
                      <td className="p-2 align-top">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={li.discount_pct}
                          onChange={(e) => updateLine(idx, { discount_pct: parseFloat(e.target.value) || 0 })}
                          className="w-full border border-slate-200 rounded px-1.5 py-1 text-right text-sm"
                        />
                      </td>
                      <td className="p-2 text-right align-top font-semibold text-sm">
                        {formatCents(lineCents)}
                      </td>
                      <td className="p-2 align-top">
                        <button
                          onClick={() => removeLine(idx)}
                          className="text-slate-300 hover:text-red-500"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <button
              onClick={addLine}
              className="mt-3 inline-flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 rounded px-3 py-1.5"
            >
              <Plus className="w-3 h-3" /> Add line
            </button>

            {/* Totals */}
            <table className="w-full max-w-xs ml-auto mt-6 text-sm">
              <tbody>
                <tr>
                  <td className="py-1 text-slate-600">Subtotal</td>
                  <td className="py-1 text-right font-semibold">{formatCents(subtotalCents)}</td>
                </tr>
                {discountCents > 0 && (
                  <tr>
                    <td className="py-1 text-slate-600">Line item discounts</td>
                    <td className="py-1 text-right font-semibold" style={{ color: '#f28500' }}>
                      -{formatCents(discountCents)}
                    </td>
                  </tr>
                )}
                {docDiscountCents > 0 && (
                  <tr>
                    <td className="py-1 text-amber-700">
                      {discountDescription || 'Discount'}
                      {discountKind === 'percent' && (
                        <span className="text-xs text-slate-400"> ({(discountValueBps / 100).toFixed(discountValueBps % 100 === 0 ? 0 : 2)}%)</span>
                      )}
                    </td>
                    <td className="py-1 text-right font-semibold text-amber-700">
                      -{formatCents(docDiscountCents)}
                    </td>
                  </tr>
                )}
                {tikCents > 0 && (
                  <tr>
                    <td className="py-1 text-amber-700">
                      Trade-in-Kind
                      {tikDescription && <span className="text-xs text-slate-400 block">{tikDescription}</span>}
                    </td>
                    <td className="py-1 text-right font-semibold text-amber-700">
                      -{formatCents(tikCents)}
                    </td>
                  </tr>
                )}
                {lateFeeCents > 0 && invoice.late_fee_applied_at && (
                  <tr>
                    <td className="py-1 text-slate-600">Late fee</td>
                    <td className="py-1 text-right font-semibold">{formatCents(lateFeeCents)}</td>
                  </tr>
                )}
                {invoice.paid_at ? (
                  <>
                    <tr style={{ borderTop: '2px solid #1d2330' }}>
                      <td className="pt-3 font-bold text-base">Invoice total</td>
                      <td className="pt-3 text-right font-bold text-base">{formatCents(totalDueCents)}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-emerald-700 font-semibold">Paid</td>
                      <td className="py-1 text-right text-emerald-700 font-semibold">
                        −{formatCents(totalDueCents)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 font-bold text-base text-emerald-800">Outstanding</td>
                      <td className="py-1 text-right font-bold text-base text-emerald-800">$0.00</td>
                    </tr>
                  </>
                ) : (
                  <tr style={{ borderTop: '2px solid #1d2330' }}>
                    <td className="pt-3 font-bold text-base">Total due (cash)</td>
                    <td className="pt-3 text-right font-bold text-base">{formatCents(totalDueCents)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* TIK block */}
            <div className="mt-6 p-3 border border-slate-100 rounded-lg bg-slate-50/50">
              <div className="text-xs uppercase text-slate-500 font-semibold mb-1">
                Trade-in-Kind (TIK)
              </div>
              <p className="text-xs text-slate-400 mb-2">
                Amount client pays in trade instead of cash. Reduces total due.
              </p>
              <div className="grid grid-cols-[1fr_160px] gap-3">
                <label className="text-xs">
                  Trade description
                  <input
                    type="text"
                    value={tikDescription}
                    onChange={(e) => { setTikDescription(e.target.value); markDirty() }}
                    placeholder="e.g. 10 hours mobile mechanic work"
                    className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
                  />
                </label>
                <label className="text-xs">
                  Trade amount ($)
                  <input
                    type="text"
                    inputMode="decimal"
                    value={tikAmountInput}
                    onChange={(e) => setTikAmountInput(e.target.value)}
                    onBlur={() => {
                      const cents = Math.round(parseFloat(tikAmountInput || '0') * 100)
                      setTikCents(cents)
                      setTikAmountInput(centsToInput(cents))
                      markDirty()
                    }}
                    className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
                  />
                </label>
              </div>
            </div>

            {/* Discount block (migration 036). Document-level discount.
                Inherited from parent SOW at creation; editable per-invoice. */}
            <div className="mt-4 p-3 border border-slate-100 rounded-lg bg-slate-50/50">
              <div className="text-xs uppercase text-slate-500 font-semibold mb-1">
                Discount
              </div>
              <p className="text-xs text-slate-400 mb-2">
                Optional discount on the invoice total. Stacks with TIK and any per-line-item discounts. Inherits from parent SOW.
              </p>
              <div className="grid grid-cols-[120px_1fr_160px] gap-3">
                <label className="text-xs">
                  Type
                  <select
                    value={discountKind}
                    onChange={(e) => { setDiscountKind(e.target.value as 'percent' | 'amount' | ''); markDirty() }}
                    className="w-full border border-slate-200 rounded px-2 py-1 mt-1 bg-white"
                  >
                    <option value="">None</option>
                    <option value="percent">Percent (%)</option>
                    <option value="amount">Amount ($)</option>
                  </select>
                </label>
                <label className="text-xs">
                  Description
                  <input
                    type="text"
                    value={discountDescription}
                    onChange={(e) => { setDiscountDescription(e.target.value); markDirty() }}
                    placeholder="e.g. Loyalty discount, Friends &amp; family"
                    disabled={!discountKind}
                    className="w-full border border-slate-200 rounded px-2 py-1 mt-1 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </label>
                {discountKind === 'percent' ? (
                  <label className="text-xs">
                    Percent (%)
                    <input
                      type="text"
                      inputMode="decimal"
                      value={discountPctInput}
                      onChange={(e) => setDiscountPctInput(e.target.value)}
                      onBlur={() => {
                        const pctRaw = parseFloat(discountPctInput || '0')
                        const pctClamped = Math.max(0, Math.min(100, isFinite(pctRaw) ? pctRaw : 0))
                        const bps = Math.round(pctClamped * 100)
                        setDiscountValueBps(bps)
                        setDiscountPctInput(pctClamped.toString())
                        markDirty()
                      }}
                      className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
                    />
                  </label>
                ) : discountKind === 'amount' ? (
                  <label className="text-xs">
                    Amount ($)
                    <input
                      type="text"
                      inputMode="decimal"
                      value={discountAmountInput}
                      onChange={(e) => setDiscountAmountInput(e.target.value)}
                      onBlur={() => {
                        const cents = Math.max(0, Math.round(parseFloat(discountAmountInput || '0') * 100))
                        setDiscountAmountCents(cents)
                        setDiscountAmountInput(centsToInput(cents))
                        markDirty()
                      }}
                      className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
                    />
                  </label>
                ) : (
                  <div />
                )}
              </div>
            </div>
          </section>

          {/* Late fee settings */}
          <section>
            <div
              className="text-xs uppercase tracking-wide font-semibold pb-1.5 mb-3"
              style={{ color: '#5d6780', borderBottom: '1px solid #e2e8f0' }}
            >
              Late fee
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-sm">
                <span className="text-xs text-slate-500">Amount ($)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={lateFeeDollarsInput}
                  onChange={(e) => { setLateFeeDollarsInput(e.target.value); markDirty() }}
                  onBlur={(e) => {
                    const cents = inputToCents(e.target.value)
                    setLateFeeCents(cents)
                    setLateFeeDollarsInput(centsToInput(cents))
                  }}
                  className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs text-slate-500">Grace days</span>
                <input
                  type="number"
                  min="0"
                  value={lateFeeGraceDays}
                  onChange={(e) => { setLateFeeGraceDays(parseInt(e.target.value) || 0); markDirty() }}
                  className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
                />
              </label>
            </div>
            {lateFeeCents > 0 && !invoice.late_fee_applied_at && (
              <p className="text-xs mt-2" style={{ color: '#5d6780' }}>
                Late fee of {formatCents(lateFeeCents)} applies if unpaid after {lateFeeGraceDays} days past due.
              </p>
            )}
          </section>

          {/* Notes */}
          <section>
            <div
              className="text-xs uppercase tracking-wide font-semibold pb-1.5 mb-3"
              style={{ color: '#5d6780', borderBottom: '1px solid #e2e8f0' }}
            >
              Notes
            </div>
            <FieldTextarea
              value={notes}
              onChange={(v) => { setNotes(v); markDirty() }}
              placeholder="Additional notes for the client..."
              rows={2}
            />
          </section>

          {/* Stripe payment link */}
          {invoice.stripe_payment_link_url && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm">
              <div className="font-semibold text-emerald-900 mb-1">Stripe Payment Link</div>
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

          {/* Timeline */}
          <section>
            <div
              className="text-xs uppercase tracking-wide font-semibold pb-1.5 mb-3"
              style={{ color: '#5d6780', borderBottom: '1px solid #e2e8f0' }}
            >
              Activity
            </div>
            <div className="space-y-1 text-xs" style={{ color: '#5d6780' }}>
              <div>Created: {new Date(invoice.created_at).toLocaleString()}</div>
              {invoice.sent_at && (
                <div>
                  Sent: {new Date(invoice.sent_at).toLocaleString()}
                  {invoice.sent_via_channel && ` · ${invoice.sent_via_channel}`}
                </div>
              )}
              {invoice.viewed_at && (
                <div>Viewed: {new Date(invoice.viewed_at).toLocaleString()}</div>
              )}
              {invoice.paid_at && (
                <div className="text-emerald-700">
                  Paid {formatCents(invoice.total_due_cents)}: {new Date(invoice.paid_at).toLocaleString()}
                  {invoice.paid_method && ` via ${invoice.paid_method}`}
                </div>
              )}
              {invoice.voided_at && (
                <div className="text-red-700">
                  Voided: {new Date(invoice.voided_at).toLocaleString()}
                  {invoice.void_reason && ` — ${invoice.void_reason}`}
                </div>
              )}
            </div>
          </section>

          {/* Footer */}
          <div
            className="text-xs pt-4 mt-4"
            style={{ color: '#5d6780', borderTop: '1px solid #e2e8f0' }}
          >
            Demand Signals · DemandSignals@gmail.com · (916) 542-2423 · demandsignals.co
          </div>
        </div>
      </div>

      {/* Send modal */}
      {sendModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full space-y-4">
            <h2 className="text-lg font-bold">Invoice sent</h2>
            <p className="text-sm text-slate-600">
              Paste this link into your preferred channel. Once the client views it, status flips
              to &apos;viewed&apos; automatically.
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
