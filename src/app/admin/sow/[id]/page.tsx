'use client'

import { useEffect, useState, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Loader2,
  ExternalLink,
  Copy,
  Plus,
  Trash2,
  Save,
  FileText,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Mail,
  MessageSquare,
  RefreshCw,
  X as XIcon,
} from 'lucide-react'
import { formatCents } from '@/lib/format'
import { buildSowPaymentTerms } from '@/lib/payment-terms'
import { CatalogPicker, type CatalogPickerItem } from '@/components/admin/catalog-picker'
import ProspectContactEditor, { type ProspectContact } from '@/components/admin/ProspectContactEditor'
import type { Cadence } from '@/lib/invoice-types'
import { ConvertButton } from './ConvertButton'
import {
  BACK_COVER_QUOTES,
  pickBackCoverQuote,
} from '@/lib/pdf/back-cover-quotes'

// ── Types ────────────────────────────────────────────────────────────

interface StartTrigger {
  type: 'on_phase_complete' | 'date'
  phase_id?: string | null
  date?: string | null
}

interface PhaseDeliverable {
  id: string
  service_id?: string | null
  name: string
  description: string
  cadence: Cadence
  quantity: number
  hours: number | null
  unit_price_cents: number
  unit_price_input: string  // raw string for the price input; committed to cents on blur
  start_trigger?: StartTrigger
}

interface SowPhase {
  id: string
  name: string
  description: string
  deliverables: PhaseDeliverable[]
}

interface SowData {
  id: string
  sow_number: string
  public_uuid: string
  status: string
  title: string
  scope_summary: string | null
  phases: SowPhase[]
  // legacy fields kept for backward compat display
  deliverables: Array<{
    name: string
    description: string
    acceptance_criteria?: string
    quantity?: number
    hours?: number
    unit_price_cents?: number
    line_total_cents?: number
  }>
  timeline: Array<{ name: string; duration_weeks: number; description: string }>
  pricing: { total_cents: number; deposit_cents: number; deposit_pct: number }
  computed_from_deliverables?: boolean
  payment_terms: string | null
  guarantees: string | null
  notes: string | null
  send_date: string | null
  sent_at: string | null
  viewed_at: string | null
  accepted_at: string | null
  accepted_signature: string | null
  deposit_invoice_id: string | null
  cover_eyebrow?: string | null
  cover_tagline?: string | null
  prospect: ProspectContact & { business_name: string } | null
  deposit_invoice: { invoice_number: string; total_due_cents: number; status: string } | null
}

// ── Money helpers ─────────────────────────────────────────────────────

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2)
}

function inputToCents(val: string): number {
  return Math.round(parseFloat(val || '0') * 100)
}

function computeLineCents(d: PhaseDeliverable): number {
  const qty = d.hours != null ? d.hours : d.quantity
  return Math.round((qty || 0) * (d.unit_price_cents || 0))
}

function newPhaseId(): string {
  return crypto.randomUUID()
}

const CADENCE_LABELS: Record<Cadence, string> = {
  one_time: 'One-time',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
}

const CADENCE_SUFFIX: Record<Cadence, string> = {
  one_time: '',
  monthly: '/mo',
  quarterly: '/qtr',
  annual: '/yr',
}

// ── Sub-components for the branded document ───────────────────────────

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
  rows = 3,
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  className?: string
}) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className={[
        'border border-dashed border-slate-300 bg-transparent px-2 py-1 rounded focus:outline-none focus:border-teal-400 w-full resize-y',
        className ?? '',
      ].join(' ')}
    />
  )
}

// ── CadencePicker dropdown for add-from-catalog with 'both' pricing ──

function CadencePickModal({
  item,
  onConfirm,
  onCancel,
}: {
  item: CatalogPickerItem
  onConfirm: (cadence: Cadence, unitPrice: number) => void
  onCancel: () => void
}) {
  const [cadence, setCadence] = useState<Cadence>(
    item.pricing_type === 'monthly' ? 'monthly' : 'one_time',
  )
  const price =
    cadence === 'one_time'
      ? item.display_price_cents
      : item.monthly_range_low_cents ?? item.display_price_cents

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4">
        <h2 className="text-base font-bold">Choose cadence for "{item.name}"</h2>
        <div className="space-y-2 text-sm">
          {(['one_time', 'monthly', 'quarterly', 'annual'] as Cadence[]).map((c) => (
            <label key={c} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="cadence"
                value={c}
                checked={cadence === c}
                onChange={() => setCadence(c)}
              />
              <span>{CADENCE_LABELS[c]}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm text-slate-500">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(cadence, price)}
            className="bg-teal-500 text-white rounded px-4 py-1.5 text-sm font-bold"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────

export default function SowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [sow, setSow] = useState<SowData | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [sentModalUrl, setSentModalUrl] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Preview-before-send modal — same shape as the invoice page's preview
  // modal, intent="send-email" | "send-sms" | "resend-email" | "resend-sms".
  type SowPreviewState =
    | { kind: 'email'; loading: true; intent: 'send-email' | 'resend-email' }
    | {
        kind: 'email'
        loading: false
        intent: 'send-email' | 'resend-email'
        recipient: string
        subject: string
        text: string
        html: string
        public_url: string
        has_pdf_attachment: boolean
        pdf_filename: string | null
      }
    | { kind: 'sms'; loading: true; intent: 'send-sms' | 'resend-sms' }
    | {
        kind: 'sms'
        loading: false
        intent: 'send-sms' | 'resend-sms'
        recipient: string
        message: string
        public_url: string
      }
    | { kind: 'error'; message: string }
  const [previewModal, setPreviewModal] = useState<SowPreviewState | null>(null)
  const [previewSubmitting, setPreviewSubmitting] = useState(false)
  const [previewResult, setPreviewResult] = useState<string | null>(null)

  // Editable field state
  const [title, setTitle] = useState('')
  const [scopeSummary, setScopeSummary] = useState('')
  const [phases, setPhases] = useState<SowPhase[]>([])
  const [depositPct, setDepositPct] = useState('25')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [guarantees, setGuarantees] = useState('')
  const [notes, setNotes] = useState('')
  const [sendDate, setSendDate] = useState('')
  const [tradeCents, setTradeCents] = useState(0)
  const [tradeAmountInput, setTradeAmountInput] = useState('0.00')
  const [tradeDescription, setTradeDescription] = useState('')
  // Document-level discount (migration 036). One-time only. Stacks with TIK.
  const [discountKind, setDiscountKind] = useState<'percent' | 'amount' | ''>('')
  const [discountPctInput, setDiscountPctInput] = useState('0')
  const [discountAmountInput, setDiscountAmountInput] = useState('0.00')
  const [discountValueBps, setDiscountValueBps] = useState(0)
  const [discountAmountCents, setDiscountAmountCents] = useState(0)
  const [discountDescription, setDiscountDescription] = useState('')
  const [coverEyebrow, setCoverEyebrow] = useState('')
  const [coverTagline, setCoverTagline] = useState('')
  // Back-cover quote seed (migration 044). NULL = use sow_number; any
  // other string = override. Reroll writes a fresh UUID; Pick writes
  // 'quote:N' sentinel.
  const [quoteSeed, setQuoteSeed] = useState<string | null>(null)
  const [quotePickerOpen, setQuotePickerOpen] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Catalog picker state — "both" pricing_type items show a cadence modal before adding
  const [pendingCatalogItem, setPendingCatalogItem] = useState<{
    item: CatalogPickerItem
    phaseId: string
  } | null>(null)

  function markDirty() {
    setDirty(true)
    setSaveError(null)
  }

  function initState(s: SowData) {
    setTitle(s.title)
    setScopeSummary(s.scope_summary ?? '')

    // If phases array is populated, use it; otherwise migrate legacy deliverables
    // into a single "Phase 1" so the UI is always phase-centric.
    if (s.phases && s.phases.length > 0) {
      // Seed unit_price_input from unit_price_cents for each deliverable
      setPhases(s.phases.map((p) => ({
        ...p,
        deliverables: p.deliverables.map((d) => ({
          ...d,
          unit_price_input: d.unit_price_input ?? ((d.unit_price_cents ?? 0) / 100).toFixed(2),
        })),
      })))
    } else {
      // Migrate legacy flat deliverables into a single default phase.
      const migrated: SowPhase = {
        id: newPhaseId(),
        name: 'Phase 1',
        description: '',
        deliverables: s.deliverables.map((d) => ({
          id: newPhaseId(),
          service_id: null,
          name: d.name,
          description: d.description,
          cadence: 'one_time' as Cadence,
          quantity: d.quantity ?? 1,
          hours: d.hours ?? null,
          unit_price_cents: d.unit_price_cents ?? 0,
          unit_price_input: ((d.unit_price_cents ?? 0) / 100).toFixed(2),
        })),
      }
      setPhases([migrated])
    }

    setDepositPct(String(s.pricing?.deposit_pct ?? 25))
    setPaymentTerms(s.payment_terms ?? '')
    setGuarantees(s.guarantees ?? '')
    setNotes(s.notes ?? '')
    setSendDate(s.send_date ?? new Date().toISOString().slice(0, 10))
    const tc = (s as SowData & { trade_credit_cents?: number; trade_credit_description?: string | null }).trade_credit_cents ?? 0
    setTradeCents(tc)
    setTradeAmountInput((tc / 100).toFixed(2))
    setTradeDescription((s as SowData & { trade_credit_description?: string | null }).trade_credit_description ?? '')
    // Document-level discount fields (migration 036). Empty kind = no discount.
    type DiscFields = SowData & {
      discount_kind?: 'percent' | 'amount' | null
      discount_value_bps?: number
      discount_amount_cents?: number
      discount_description?: string | null
    }
    const dk = (s as DiscFields).discount_kind ?? null
    const dbps = (s as DiscFields).discount_value_bps ?? 0
    const damt = (s as DiscFields).discount_amount_cents ?? 0
    setDiscountKind(dk ?? '')
    setDiscountValueBps(dbps)
    setDiscountAmountCents(damt)
    setDiscountPctInput((dbps / 100).toString())
    setDiscountAmountInput((damt / 100).toFixed(2))
    setDiscountDescription((s as DiscFields).discount_description ?? '')
    setCoverEyebrow((s as SowData & { cover_eyebrow?: string | null }).cover_eyebrow ?? '')
    setCoverTagline((s as SowData & { cover_tagline?: string | null }).cover_tagline ?? '')
    setQuoteSeed((s as SowData & { quote_seed?: string | null }).quote_seed ?? null)
    setDirty(false)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/sow/${id}`)
    const data = await res.json()
    if (res.ok && data.sow) {
      setSow(data.sow)
      initState(data.sow)
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  // ── Computed values ───────────────────────────────────────────────

  const allDeliverables = phases.flatMap((p) => p.deliverables)

  const oneTimeTotalCents = allDeliverables
    .filter((d) => d.cadence === 'one_time')
    .reduce((s, d) => s + computeLineCents(d), 0)

  const monthlyTotalCents = allDeliverables
    .filter((d) => d.cadence === 'monthly')
    .reduce((s, d) => s + computeLineCents(d), 0)

  const quarterlyTotalCents = allDeliverables
    .filter((d) => d.cadence === 'quarterly')
    .reduce((s, d) => s + computeLineCents(d), 0)

  const annualTotalCents = allDeliverables
    .filter((d) => d.cadence === 'annual')
    .reduce((s, d) => s + computeLineCents(d), 0)

  const parsedPct = Number.parseFloat(depositPct)
  const pct =
    depositPct.trim() === '' || !Number.isFinite(parsedPct)
      ? 25
      : Math.max(0, Math.min(100, parsedPct))
  // Discount math: order is subtotal → minus discount → minus TIK → cash.
  // Final clamped to 0. Same order applied in SOW PDF and public page.
  const discountCents = (() => {
    if (discountKind === 'percent') {
      const bps = Math.max(0, Math.min(10000, discountValueBps))
      return Math.min(oneTimeTotalCents, Math.round(oneTimeTotalCents * bps / 10000))
    }
    if (discountKind === 'amount') {
      return Math.min(oneTimeTotalCents, Math.max(0, discountAmountCents))
    }
    return 0
  })()
  const cashTotalCents = Math.max(0, oneTimeTotalCents - discountCents - tradeCents)
  const depositCents = Math.round(cashTotalCents * pct / 100)
  const balanceCents = cashTotalCents - depositCents

  // ── Actions ───────────────────────────────────────────────────────

  async function save(forceEdit = false) {
    setBusy(true)
    setSaveError(null)
    try {
      const body: Record<string, unknown> = {
        title,
        scope_summary: scopeSummary,
        computed_from_deliverables: true,
        phases,
        // Keep legacy fields in sync with one-time deliverables for backward compat
        deliverables: allDeliverables
          .filter((d) => d.cadence === 'one_time')
          .map((d) => ({
            name: d.name,
            description: d.description,
            quantity: d.hours == null ? d.quantity : undefined,
            hours: d.hours ?? undefined,
            unit_price_cents: d.unit_price_cents || undefined,
            line_total_cents: computeLineCents(d),
          })),
        timeline: [],
        pricing: {
          total_cents: oneTimeTotalCents,
          deposit_cents: depositCents,
          deposit_pct: pct,
        },
        payment_terms:
          paymentTerms.trim() ||
          buildSowPaymentTerms({
            oneTimeCents: oneTimeTotalCents,
            monthlyCents: monthlyTotalCents,
            quarterlyCents: quarterlyTotalCents,
            annualCents: annualTotalCents,
            depositPct: pct,
            depositCents,
            tradeCents,
            discountCents,
          }),
        guarantees,
        notes,
        send_date: sendDate || null,
        trade_credit_cents: tradeCents,
        trade_credit_description: tradeDescription || null,
        // Document-level discount (migration 036). When kind is empty,
        // we send null + zeroed values so the API clears any prior
        // discount on this SOW. Otherwise persist the captured numbers.
        discount_kind: discountKind || null,
        discount_value_bps: discountKind === 'percent' ? discountValueBps : 0,
        discount_amount_cents: discountKind === 'amount' ? discountAmountCents : 0,
        discount_description: discountKind ? (discountDescription.trim() || null) : null,
        cover_eyebrow: coverEyebrow.trim() || null,
        cover_tagline: coverTagline.trim() || null,
        quote_seed: quoteSeed,
      }
      if (forceEdit) body.force_edit = true

      const res = await fetch(`/api/admin/sow/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.status === 409 && !forceEdit) {
        if (confirm('SOW is sent/accepted — force edit anyway?')) {
          setBusy(false)
          return save(true)
        }
        setBusy(false)
        return
      }

      if (!res.ok) {
        const d = await res.json()
        setSaveError(d.error ?? 'Save failed')
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

  async function send() {
    setBusy(true)
    const res = await fetch(`/api/admin/sow/${id}/send`, { method: 'POST' })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) {
      alert(data.error)
      return
    }
    setSentModalUrl(data.public_url)
    await load()
  }

  async function deleteDraft() {
    if (!confirm('Delete this draft?')) return
    setBusy(true)
    await fetch(`/api/admin/sow/${id}`, { method: 'DELETE' })
    router.push('/admin/sow')
  }

  // ── Preview-before-send helpers ───────────────────────────────────
  // Mirrors invoice page pattern. Manual sends (Email / SMS / Resend)
  // open a preview modal first; admin confirms; the actual POST fires.

  async function openSendEmailPreview() {
    setPreviewResult(null)
    setPreviewModal({ kind: 'email', loading: true, intent: 'send-email' })
    try {
      const res = await fetch(`/api/admin/sow/${id}/send-email/preview`)
      const data = await res.json()
      if (!res.ok || data.ok === false) {
        setPreviewModal({ kind: 'error', message: data.error ?? 'Preview failed' })
        return
      }
      setPreviewModal({
        kind: 'email',
        loading: false,
        intent: 'send-email',
        recipient: data.recipient,
        subject: data.subject,
        text: data.text,
        html: data.html,
        public_url: data.public_url,
        has_pdf_attachment: data.has_pdf_attachment,
        pdf_filename: data.pdf_filename,
      })
    } catch (e) {
      setPreviewModal({ kind: 'error', message: e instanceof Error ? e.message : 'Preview failed' })
    }
  }

  async function openSendSmsPreview() {
    setPreviewResult(null)
    setPreviewModal({ kind: 'sms', loading: true, intent: 'send-sms' })
    try {
      const res = await fetch(`/api/admin/sow/${id}/send-sms/preview`)
      const data = await res.json()
      if (!res.ok || data.ok === false) {
        setPreviewModal({ kind: 'error', message: data.error ?? 'Preview failed' })
        return
      }
      setPreviewModal({
        kind: 'sms',
        loading: false,
        intent: 'send-sms',
        recipient: data.recipient,
        message: data.message,
        public_url: data.public_url,
      })
    } catch (e) {
      setPreviewModal({ kind: 'error', message: e instanceof Error ? e.message : 'Preview failed' })
    }
  }

  async function confirmPreviewAndSend() {
    if (!previewModal || previewModal.kind === 'error' || previewModal.loading) return
    setPreviewSubmitting(true)
    setPreviewResult(null)
    try {
      const endpoint =
        previewModal.intent === 'resend-email'
          ? `/api/admin/sow/${id}/resend?channel=email`
          : previewModal.intent === 'resend-sms'
            ? `/api/admin/sow/${id}/resend?channel=sms`
            : previewModal.kind === 'email'
              ? `/api/admin/sow/${id}/send-email`
              : `/api/admin/sow/${id}/send-sms`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) {
        setPreviewResult(`Failed: ${data.error ?? 'Send failed'}`)
        return
      }
      setPreviewResult(
        previewModal.kind === 'email'
          ? `Email sent to ${previewModal.recipient}`
          : `SMS sent to ${previewModal.recipient}`,
      )
      await load()
    } catch (e) {
      setPreviewResult(`Failed: ${e instanceof Error ? e.message : 'Send failed'}`)
    } finally {
      setPreviewSubmitting(false)
    }
  }

  // ── Phase helpers ─────────────────────────────────────────────────

  function addPhase() {
    setPhases((prev) => [
      ...prev,
      {
        id: newPhaseId(),
        name: `Phase ${prev.length + 1}`,
        description: '',
        deliverables: [],
      },
    ])
    markDirty()
  }

  function updatePhase(phaseId: string, patch: Partial<Omit<SowPhase, 'deliverables'>>) {
    setPhases((prev) => prev.map((p) => (p.id === phaseId ? { ...p, ...patch } : p)))
    markDirty()
  }

  function removePhase(phaseId: string) {
    setPhases((prev) => prev.filter((p) => p.id !== phaseId))
    markDirty()
  }

  function movePhase(idx: number, dir: -1 | 1) {
    setPhases((prev) => {
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
    markDirty()
  }

  // ── Deliverable helpers ───────────────────────────────────────────

  function addDeliverable(phaseId: string) {
    setPhases((prev) =>
      prev.map((p) =>
        p.id === phaseId
          ? {
              ...p,
              deliverables: [
                ...p.deliverables,
                {
                  id: newPhaseId(),
                  service_id: null,
                  name: '',
                  description: '',
                  cadence: 'one_time' as Cadence,
                  quantity: 1,
                  hours: null,
                  unit_price_cents: 0,
                  unit_price_input: '0.00',
                },
              ],
            }
          : p,
      ),
    )
    markDirty()
  }

  function addDeliverableFromCatalog(phaseId: string, item: CatalogPickerItem, cadence: Cadence, unitPrice: number) {
    setPhases((prev) =>
      prev.map((p) =>
        p.id === phaseId
          ? {
              ...p,
              deliverables: [
                ...p.deliverables,
                {
                  id: newPhaseId(),
                  service_id: item.id,
                  name: item.name,
                  description: item.description ?? item.benefit ?? '',
                  cadence,
                  quantity: 1,
                  hours: null,
                  unit_price_cents: unitPrice,
                  unit_price_input: (unitPrice / 100).toFixed(2),
                },
              ],
            }
          : p,
      ),
    )
    markDirty()
  }

  function updateDeliverable(phaseId: string, delivId: string, patch: Partial<PhaseDeliverable>) {
    setPhases((prev) =>
      prev.map((p) =>
        p.id === phaseId
          ? {
              ...p,
              deliverables: p.deliverables.map((d) =>
                d.id === delivId ? { ...d, ...patch } : d,
              ),
            }
          : p,
      ),
    )
    markDirty()
  }

  function removeDeliverable(phaseId: string, delivId: string) {
    setPhases((prev) =>
      prev.map((p) =>
        p.id === phaseId
          ? { ...p, deliverables: p.deliverables.filter((d) => d.id !== delivId) }
          : p,
      ),
    )
    markDirty()
  }

  function moveDeliverable(phaseId: string, idx: number, dir: -1 | 1) {
    setPhases((prev) =>
      prev.map((p) => {
        if (p.id !== phaseId) return p
        const dels = [...p.deliverables]
        const target = idx + dir
        if (target < 0 || target >= dels.length) return p
        ;[dels[idx], dels[target]] = [dels[target], dels[idx]]
        return { ...p, deliverables: dels }
      }),
    )
    markDirty()
  }

  function handleCatalogPick(phaseId: string, item: CatalogPickerItem) {
    if (item.pricing_type === 'both') {
      setPendingCatalogItem({ item, phaseId })
      return
    }
    const cadence: Cadence = item.pricing_type === 'monthly' ? 'monthly' : 'one_time'
    const unitPrice =
      cadence === 'monthly'
        ? (item.monthly_range_low_cents ?? item.display_price_cents)
        : item.display_price_cents
    addDeliverableFromCatalog(phaseId, item, cadence, unitPrice)
  }

  // ── Render ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center p-16">
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    )
  }
  if (!sow) return <div className="p-6">Not found</div>

  const publicUrl = `https://demandsignals.co/sow/${sow.sow_number}/${sow.public_uuid}`
  const isDraft = sow.status === 'draft'
  const p = sow.prospect

  return (
    <div className="pb-24">
      {/* Sticky toolbar */}
      <div
        className="sticky top-0 z-30 flex items-center gap-2 flex-wrap px-6 py-3 border-b border-slate-200 bg-white/95 backdrop-blur-sm"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
      >
        <Link href="/admin/sow" className="text-sm text-teal-600 mr-2">
          ← All SOWs
        </Link>
        <span className="text-xs font-mono text-slate-400 mr-2">{sow.sow_number}</span>

        <span
          className={`text-xs px-2 py-0.5 rounded-full font-semibold mr-2 ${
            sow.status === 'draft'
              ? 'bg-slate-100 text-slate-600'
              : sow.status === 'accepted'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-blue-100 text-blue-700'
          }`}
        >
          {sow.status}
        </span>

        <div className="flex-1" />

        {saveError && (
          <span className="text-xs text-red-600 mr-2">{saveError}</span>
        )}

        {/* Save */}
        <button
          onClick={() => save()}
          disabled={!dirty || busy}
          className="inline-flex items-center gap-1.5 bg-teal-500 text-white rounded px-3 py-1.5 text-sm font-semibold disabled:opacity-40 hover:bg-teal-600"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>

        {/* Preview PDF */}
        <a
          href={`/api/admin/sow/${id}/pdf`}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-3 py-1.5 text-sm"
        >
          <FileText className="w-3.5 h-3.5" /> Preview PDF
        </a>

        {/* Send / Email / SMS — draft toolbar. Email and SMS each open
            the preview modal; confirming the preview issues the SOW
            (renders PDF, uploads to R2, flips draft→sent) and
            dispatches in one server hop. */}
        {isDraft && (
          <>
            <button
              onClick={deleteDraft}
              disabled={busy}
              className="bg-red-100 text-red-700 rounded px-3 py-1.5 text-sm"
            >
              Delete
            </button>
            <button onClick={openSendSmsPreview} disabled={busy} className="bg-blue-100 text-blue-700 rounded px-3 py-1.5 text-sm inline-flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" /> SMS
            </button>
            <button onClick={openSendEmailPreview} disabled={busy} className="bg-blue-100 text-blue-700 rounded px-3 py-1.5 text-sm inline-flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" /> Email
            </button>
            <button
              onClick={send}
              disabled={busy}
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white rounded px-3 py-1.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              title="Issue SOW + auto-fire email"
            >
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          </>
        )}

        {/* Manual sends — non-draft. Each opens a preview-before-send
            modal; admin confirms before the actual POST fires. */}
        {!isDraft && (
          <>
            <button
              onClick={openSendEmailPreview}
              disabled={busy}
              className="bg-blue-100 text-blue-700 rounded px-3 py-1.5 text-sm inline-flex items-center gap-1"
            >
              <Mail className="w-3.5 h-3.5" /> Email
            </button>
            <button
              onClick={openSendSmsPreview}
              disabled={busy}
              className="bg-blue-100 text-blue-700 rounded px-3 py-1.5 text-sm inline-flex items-center gap-1"
            >
              <MessageSquare className="w-3.5 h-3.5" /> SMS
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-3 py-1.5 text-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Client view
            </a>
          </>
        )}

        {/* Convert SOW to Project — links to dedicated /convert page */}
        <ConvertButton sow={{ id: sow.id, status: sow.status }} />
      </div>

      {/* Branded document — on-page header matches invoice/receipt/credit-memo
          (white + teal underline). The PDF cover is rendered separately by
          src/lib/pdf/sow.ts and remains the dark slate cover with the editable
          cover fields (eyebrow / title / tagline) shown in the "Cover content"
          subsection below. */}
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
            <div className="text-2xl font-bold" style={{ color: '#1d2330' }}>Statement of Work</div>
            <div className="font-mono text-sm mt-1" style={{ color: '#5d6780' }}>
              {sow.sow_number}
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 justify-end text-sm">
                <span className="text-xs" style={{ color: '#5d6780' }}>Issued</span>
                <input
                  type="date"
                  value={sendDate}
                  onChange={(e) => { setSendDate(e.target.value); markDirty() }}
                  className="border-0 border-b border-dashed border-slate-300 bg-transparent px-0 py-0.5 focus:outline-none focus:border-teal-400 text-sm text-right w-36"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-10 py-8 space-y-8" style={{ color: '#1d2330' }}>
          {/* Magic-link preview — inline so admin can copy/test the URL
              without rendering the PDF. The SOW magic-link page is ALSO
              the approval surface (Accept button lives there). For drafts,
              the link 404s until the SOW is sent. */}
          <div className="rounded-lg p-3 border border-slate-200 bg-slate-50/40">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs uppercase tracking-wide font-semibold text-slate-500">
                Client magic link {!isDraft && <span className="text-slate-400 normal-case font-normal">— Accept button lives here</span>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(publicUrl)}
                  className="text-xs text-teal-600 hover:underline"
                  title="Copy URL"
                >
                  Copy
                </button>
                {!isDraft && (
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noopener"
                    className="text-xs text-teal-600 hover:underline"
                  >
                    Open ↗
                  </a>
                )}
              </div>
            </div>
            <code className="block mt-1 text-[11px] text-slate-700 break-all">{publicUrl}</code>
            {isDraft && (
              <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                Draft — link returns 404 until the SOW is sent. Click <strong>Send</strong> to issue + activate the link (and the client&apos;s Accept button).
              </div>
            )}
          </div>

          {/* Client block */}
          {p && (
            <div
              className="rounded-lg p-4"
              style={{ background: '#f4f6f9' }}
            >
              <div
                className="text-xs uppercase tracking-wide mb-2"
                style={{ color: '#5d6780' }}
              >
                Bill to
              </div>
              <div className="font-semibold text-base mb-1">{p.business_name}</div>
              <ProspectContactEditor prospect={p} />
            </div>
          )}

          {/* Project title — primary doc heading on the page + drives PDF cover */}
          <section>
            <div
              className="text-xs uppercase tracking-wide font-semibold pb-1.5 mb-3"
              style={{ color: '#5d6780', borderBottom: '1px solid #e2e8f0' }}
            >
              Project title
            </div>
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); markDirty() }}
              placeholder="Project title"
              className="w-full text-2xl font-bold border-0 border-b border-dashed border-slate-300 bg-transparent px-0 py-1 focus:outline-none focus:border-teal-400"
              style={{ color: '#1d2330', letterSpacing: '-0.01em' }}
            />
          </section>

          {/* Cover content (PDF only) — eyebrow + tagline drive the dark
              PDF cover but don't show on the on-page admin/client view.
              Kept here so admin can edit them without needing to render
              the PDF first. */}
          <section className="rounded-lg p-4 border border-slate-200" style={{ background: '#fafbfc' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs uppercase tracking-wide font-semibold" style={{ color: '#5d6780' }}>
                Cover content
              </div>
              <div className="text-[10px] text-slate-400">PDF cover only</div>
            </div>
            <div className="space-y-3">
              <label className="block text-xs">
                <span className="text-slate-500">Eyebrow</span>
                <input
                  value={coverEyebrow}
                  onChange={(e) => { setCoverEyebrow(e.target.value); markDirty() }}
                  placeholder="Statement of Work"
                  className="w-full border border-slate-200 rounded px-2 py-1 mt-1 text-sm"
                />
              </label>
              <label className="block text-xs">
                <span className="text-slate-500">Tagline</span>
                <input
                  value={coverTagline}
                  onChange={(e) => { setCoverTagline(e.target.value); markDirty() }}
                  placeholder="Prepared by Demand Signals — Digital Growth & Strategy"
                  className="w-full border border-slate-200 rounded px-2 py-1 mt-1 text-sm"
                />
              </label>
            </div>
          </section>

          {/* Back-cover quote (PDF only) — picked by hash off quote_seed
              (or sow_number when null). Reroll writes a fresh UUID;
              Pick writes the quote:N sentinel for direct selection. */}
          <section className="rounded-lg p-4 border border-slate-200" style={{ background: '#fafbfc' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs uppercase tracking-wide font-semibold" style={{ color: '#5d6780' }}>
                Back-cover quote
              </div>
              <div className="text-[10px] text-slate-400">PDF back cover only</div>
            </div>
            {(() => {
              const effectiveSeed = quoteSeed || sow.sow_number
              const currentQuote = pickBackCoverQuote(effectiveSeed)
              const idx = BACK_COVER_QUOTES.findIndex(
                (q) => q.text === currentQuote.text && q.author === currentQuote.author,
              )
              return (
                <div className="space-y-3">
                  <div className="rounded border border-slate-200 bg-white p-3 italic text-sm text-slate-700 leading-relaxed">
                    “{currentQuote.text}”
                    <div className="mt-1 not-italic text-xs uppercase tracking-wide text-teal-700">— {currentQuote.author}</div>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span>
                      Quote {idx + 1} of {BACK_COVER_QUOTES.length}
                      {quoteSeed
                        ? quoteSeed.startsWith('quote:')
                          ? <span className="ml-2 text-teal-700">· hand-picked</span>
                          : <span className="ml-2 text-teal-700">· custom seed</span>
                        : <span className="ml-2 text-slate-400">· default (seeded by SOW number)</span>}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setQuoteSeed(crypto.randomUUID())
                          markDirty()
                        }}
                        className="px-3 py-1 rounded text-xs font-semibold bg-teal-500 text-white hover:bg-teal-600"
                      >
                        Reroll
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuotePickerOpen(true)}
                        className="px-3 py-1 rounded text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                      >
                        Pick…
                      </button>
                      {quoteSeed && (
                        <button
                          type="button"
                          onClick={() => {
                            setQuoteSeed(null)
                            markDirty()
                          }}
                          className="px-3 py-1 rounded text-xs font-semibold bg-white border border-slate-300 text-slate-500 hover:bg-slate-50"
                          title="Revert to the default quote derived from the SOW number"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}
          </section>

          {/* Scope */}
          <section>
            <div
              className="text-xs uppercase tracking-wide font-semibold pb-1.5 mb-3"
              style={{ color: '#5d6780', borderBottom: '1px solid #e2e8f0' }}
            >
              Scope summary
            </div>
            <FieldTextarea
              value={scopeSummary}
              onChange={(v) => { setScopeSummary(v); markDirty() }}
              placeholder="Describe the scope of work..."
              rows={3}
            />
          </section>

          {/* Phases */}
          <section>
            <div
              className="text-xs uppercase tracking-wide font-semibold pb-1.5 mb-4"
              style={{ color: '#5d6780', borderBottom: '1px solid #e2e8f0' }}
            >
              Phases
            </div>

            <div className="space-y-6">
              {phases.map((phase, phaseIdx) => (
                <div
                  key={phase.id}
                  className="rounded-lg border border-slate-200"
                >
                  {/* Phase header */}
                  <div
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ background: '#f4f6f9' }}
                  >
                    <FieldInput
                      value={phase.name}
                      onChange={(v) => updatePhase(phase.id, { name: v })}
                      placeholder="Phase name"
                      className="font-semibold flex-1"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => movePhase(phaseIdx, -1)}
                        disabled={phaseIdx === 0}
                        className="text-slate-400 hover:text-slate-600 disabled:opacity-25"
                        title="Move phase up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => movePhase(phaseIdx, 1)}
                        disabled={phaseIdx === phases.length - 1}
                        className="text-slate-400 hover:text-slate-600 disabled:opacity-25"
                        title="Move phase down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removePhase(phase.id)}
                        className="text-slate-300 hover:text-red-500 ml-1"
                        title="Remove phase"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="px-4 pt-2 pb-1">
                    <FieldTextarea
                      value={phase.description}
                      onChange={(v) => updatePhase(phase.id, { description: v })}
                      placeholder="Phase description (optional)"
                      rows={2}
                    />
                  </div>

                  {/* Deliverables table */}
                  <div className="px-4 pb-2">
                    {phase.deliverables.length > 0 && (
                      <table className="w-full text-sm mt-2">
                        <thead>
                          <tr>
                            <th
                              className="text-left p-2 text-xs uppercase font-semibold"
                              style={{ background: '#f4f6f9', color: '#5d6780' }}
                            >
                              Item
                            </th>
                            <th
                              className="text-center p-2 text-xs uppercase font-semibold w-24"
                              style={{ background: '#f4f6f9', color: '#5d6780' }}
                            >
                              Cadence
                            </th>
                            <th
                              className="text-right p-2 text-xs uppercase font-semibold w-20"
                              style={{ background: '#f4f6f9', color: '#5d6780' }}
                            >
                              Qty/Hrs
                            </th>
                            <th
                              className="text-right p-2 text-xs uppercase font-semibold w-24"
                              style={{ background: '#f4f6f9', color: '#5d6780' }}
                            >
                              Rate
                            </th>
                            <th
                              className="text-right p-2 text-xs uppercase font-semibold w-28"
                              style={{ background: '#f4f6f9', color: '#5d6780' }}
                            >
                              Total
                            </th>
                            <th className="w-8" style={{ background: '#f4f6f9' }} />
                          </tr>
                        </thead>
                        <tbody>
                          {phase.deliverables.map((d, delivIdx) => {
                            const lineCents = computeLineCents(d)
                            const suffix = CADENCE_SUFFIX[d.cadence]
                            return (
                              <tr key={d.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td className="p-2 align-top">
                                  {d.service_id && (
                                    <span className="inline-flex items-center gap-1 text-teal-600 text-xs mb-1">
                                      <Sparkles className="w-3 h-3" /> catalog
                                    </span>
                                  )}
                                  <FieldInput
                                    value={d.name}
                                    onChange={(v) => updateDeliverable(phase.id, d.id, { name: v })}
                                    placeholder="Item name"
                                    className="font-semibold mb-1"
                                  />
                                  <FieldInput
                                    value={d.description}
                                    onChange={(v) => updateDeliverable(phase.id, d.id, { description: v })}
                                    placeholder="Description"
                                    className="text-xs"
                                  />
                                  {/* Start trigger */}
                                  <div className="mt-1 flex items-center gap-1.5">
                                    <select
                                      value={d.start_trigger?.type ?? 'on_phase_complete'}
                                      onChange={(e) =>
                                        updateDeliverable(phase.id, d.id, {
                                          start_trigger: {
                                            type: e.target.value as 'on_phase_complete' | 'date',
                                            phase_id: null,
                                            date: null,
                                          },
                                        })
                                      }
                                      className="text-xs border border-slate-200 rounded px-1 py-0.5 text-slate-500"
                                    >
                                      <option value="on_phase_complete">Starts: on phase complete</option>
                                      <option value="date">Starts: on date</option>
                                    </select>
                                    {d.start_trigger?.type === 'on_phase_complete' && (
                                      <select
                                        value={d.start_trigger?.phase_id ?? ''}
                                        onChange={(e) =>
                                          updateDeliverable(phase.id, d.id, {
                                            start_trigger: {
                                              type: 'on_phase_complete',
                                              phase_id: e.target.value || null,
                                              date: null,
                                            },
                                          })
                                        }
                                        className="text-xs border border-slate-200 rounded px-1 py-0.5 text-slate-500"
                                      >
                                        <option value="">— any phase —</option>
                                        {phases
                                          .filter((pp) => pp.id !== phase.id)
                                          .map((pp, i) => (
                                            <option key={pp.id} value={pp.id}>
                                              Phase {i + 1}: {pp.name || '(unnamed)'}
                                            </option>
                                          ))}
                                      </select>
                                    )}
                                    {d.start_trigger?.type === 'date' && (
                                      <input
                                        type="date"
                                        value={d.start_trigger?.date ?? ''}
                                        onChange={(e) =>
                                          updateDeliverable(phase.id, d.id, {
                                            start_trigger: {
                                              type: 'date',
                                              phase_id: null,
                                              date: e.target.value || null,
                                            },
                                          })
                                        }
                                        className="text-xs border border-slate-200 rounded px-1 py-0.5"
                                      />
                                    )}
                                  </div>
                                </td>

                                {/* Cadence */}
                                <td className="p-2 align-top text-center">
                                  <select
                                    value={d.cadence}
                                    onChange={(e) =>
                                      updateDeliverable(phase.id, d.id, {
                                        cadence: e.target.value as Cadence,
                                      })
                                    }
                                    className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs"
                                  >
                                    {(Object.keys(CADENCE_LABELS) as Cadence[]).map((c) => (
                                      <option key={c} value={c}>
                                        {CADENCE_LABELS[c]}
                                      </option>
                                    ))}
                                  </select>
                                </td>

                                {/* Qty / Hours */}
                                <td className="p-2 align-top">
                                  <div className="flex flex-col gap-1">
                                    <label className="text-xs text-slate-400">
                                      {d.hours != null ? 'Hours' : 'Qty'}
                                    </label>
                                    {d.hours != null ? (
                                      <input
                                        type="number"
                                        step="0.25"
                                        min="0"
                                        value={d.hours}
                                        onChange={(e) =>
                                          updateDeliverable(phase.id, d.id, {
                                            hours: parseFloat(e.target.value) || 0,
                                          })
                                        }
                                        className="w-full border border-slate-200 rounded px-1.5 py-1 text-right text-sm"
                                      />
                                    ) : (
                                      <input
                                        type="number"
                                        min="1"
                                        value={d.quantity}
                                        onChange={(e) =>
                                          updateDeliverable(phase.id, d.id, {
                                            quantity: Math.max(1, parseInt(e.target.value) || 1),
                                          })
                                        }
                                        className="w-full border border-slate-200 rounded px-1.5 py-1 text-right text-sm"
                                      />
                                    )}
                                    <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={d.hours != null}
                                        onChange={(e) =>
                                          updateDeliverable(phase.id, d.id, {
                                            hours: e.target.checked ? d.quantity || 1 : null,
                                          })
                                        }
                                      />
                                      hourly
                                    </label>
                                  </div>
                                </td>

                                {/* Rate */}
                                <td className="p-2 align-top">
                                  <div className="text-xs text-slate-400 mb-1">
                                    {d.hours != null ? '$/hr' : 'unit $'}
                                    {suffix && <span className="text-teal-600 ml-1">{suffix}</span>}
                                  </div>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={d.unit_price_input}
                                    onChange={(e) =>
                                      updateDeliverable(phase.id, d.id, {
                                        unit_price_input: e.target.value,
                                      })
                                    }
                                    onBlur={(e) => {
                                      const cents = inputToCents(e.target.value)
                                      updateDeliverable(phase.id, d.id, {
                                        unit_price_cents: cents,
                                        unit_price_input: centsToInput(cents),
                                      })
                                    }}
                                    className="w-full border border-slate-200 rounded px-1.5 py-1 text-right text-sm"
                                  />
                                </td>

                                {/* Line total */}
                                <td className="p-2 text-right align-top font-semibold text-sm">
                                  {lineCents > 0 ? (
                                    <>
                                      {formatCents(lineCents)}
                                      {suffix && (
                                        <span className="text-xs text-teal-600 ml-0.5">{suffix}</span>
                                      )}
                                    </>
                                  ) : (
                                    '—'
                                  )}
                                </td>

                                {/* Reorder + Delete */}
                                <td className="p-2 align-top">
                                  <div className="flex flex-col items-center gap-0.5">
                                    <button
                                      onClick={() => moveDeliverable(phase.id, delivIdx, -1)}
                                      disabled={delivIdx === 0}
                                      className="text-slate-400 hover:text-slate-600 disabled:opacity-25"
                                      title="Move up"
                                    >
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => moveDeliverable(phase.id, delivIdx, 1)}
                                      disabled={delivIdx === phase.deliverables.length - 1}
                                      className="text-slate-400 hover:text-slate-600 disabled:opacity-25"
                                      title="Move down"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => removeDeliverable(phase.id, d.id)}
                                      className="text-slate-300 hover:text-red-500 mt-0.5"
                                      title="Remove"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}

                    {/* Add deliverable actions */}
                    <div className="mt-3 space-y-2">
                      <div className="text-xs text-slate-400 font-semibold uppercase">
                        Add from catalog
                      </div>
                      <CatalogPicker
                        onPick={(item) => handleCatalogPick(phase.id, item)}
                        placeholder="Search catalog…"
                        compact
                      />
                      <button
                        onClick={() => addDeliverable(phase.id)}
                        className="inline-flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 rounded px-3 py-1.5"
                      >
                        <Plus className="w-3 h-3" /> Add ad-hoc deliverable
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addPhase}
              className="mt-4 inline-flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 rounded px-4 py-2 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Add phase
            </button>
          </section>

          {/* Pricing */}
          <section>
            <div
              className="text-xs uppercase tracking-wide font-semibold pb-1.5 mb-4"
              style={{ color: '#5d6780', borderBottom: '1px solid #e2e8f0' }}
            >
              Pricing
            </div>

            {/* TIK block */}
            <div className="mb-4 p-3 border border-slate-100 rounded-lg bg-slate-50/50">
              <div className="text-xs uppercase text-slate-500 font-semibold mb-1">
                Trade-in-Kind (TIK)
              </div>
              <p className="text-xs text-slate-400 mb-2">
                Amount client pays in trade instead of cash. Reduces cash owed.
              </p>
              <div className="grid grid-cols-[1fr_160px] gap-3">
                <label className="text-xs">
                  Trade description
                  <input
                    type="text"
                    value={tradeDescription}
                    onChange={(e) => { setTradeDescription(e.target.value); markDirty() }}
                    placeholder="e.g. 10 hours mobile mechanic work"
                    className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
                  />
                </label>
                <label className="text-xs">
                  Trade amount ($)
                  <input
                    type="text"
                    inputMode="decimal"
                    value={tradeAmountInput}
                    onChange={(e) => setTradeAmountInput(e.target.value)}
                    onBlur={() => {
                      const cents = Math.round(parseFloat(tradeAmountInput || '0') * 100)
                      setTradeCents(cents)
                      setTradeAmountInput((cents / 100).toFixed(2))
                      markDirty()
                    }}
                    className="w-full border border-slate-200 rounded px-2 py-1 mt-1"
                  />
                </label>
              </div>
            </div>

            {/* Discount block (migration 036). Document-level, one-time only,
                stacks with TIK. Inherits to invoices created from this SOW. */}
            <div className="mb-4 p-3 border border-slate-100 rounded-lg bg-slate-50/50">
              <div className="text-xs uppercase text-slate-500 font-semibold mb-1">
                Discount
              </div>
              <p className="text-xs text-slate-400 mb-2">
                Optional discount on the one-time total. Stacks with TIK. Inherits to invoices created from this SOW.
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
                        setDiscountAmountInput((cents / 100).toFixed(2))
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

            {/* Three-column economics — admin-side at-a-glance breakdown.
                One-Time = upfront cash (post discount + TIK).
                Monthly = monthly recurring + (annual / 12) + (quarterly / 3)
                  for comparable display. Quarterly is a SOW-only legacy
                  cadence (invoices use one_time/monthly/annual only).
                Total = first-cycle billable (one-time + first month/qtr/yr
                  of each recurring line). After this, recurring runs on
                  subscription. */}
            <div className="grid grid-cols-3 gap-3 max-w-xl ml-auto mb-4">
              <div className="rounded-lg p-3 border border-slate-200" style={{ background: '#fafbfc' }}>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">One-Time</div>
                <div className="text-lg font-bold" style={{ color: '#1d2330' }}>
                  {formatCents(cashTotalCents > 0 ? cashTotalCents : oneTimeTotalCents)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {(tradeCents > 0 || discountCents > 0) ? 'after TIK + discount' : 'billed once'}
                </div>
              </div>
              <div className="rounded-lg p-3 border border-slate-200" style={{ background: '#fafbfc' }}>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Monthly</div>
                {(() => {
                  const monthlyEquiv = monthlyTotalCents
                    + Math.round((quarterlyTotalCents ?? 0) / 3)
                    + Math.round((annualTotalCents ?? 0) / 12)
                  const hasAny = monthlyEquiv > 0
                  return (
                    <>
                      <div className="text-lg font-bold" style={{ color: '#1d2330' }}>
                        {formatCents(monthlyEquiv)}
                        {hasAny && <span className="text-xs text-slate-400 font-normal">/mo</span>}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {!hasAny
                          ? '—'
                          : annualTotalCents > 0 && monthlyTotalCents === 0 && quarterlyTotalCents === 0
                            ? `${formatCents(annualTotalCents)}/yr equiv`
                            : (annualTotalCents > 0 || quarterlyTotalCents > 0)
                              ? 'incl. annual/qtr equiv'
                              : 'subscription'}
                      </div>
                    </>
                  )
                })()}
              </div>
              <div className="rounded-lg p-3 border-2" style={{ background: '#f0fdf9', borderColor: '#68c5ad' }}>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">First Cycle</div>
                <div className="text-lg font-bold" style={{ color: '#1d2330' }}>
                  {formatCents(
                    (cashTotalCents > 0 ? cashTotalCents : oneTimeTotalCents)
                    + monthlyTotalCents
                    + quarterlyTotalCents
                    + annualTotalCents,
                  )}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {(monthlyTotalCents > 0 || quarterlyTotalCents > 0 || annualTotalCents > 0)
                    ? 'one-time + first cycle'
                    : 'one-time only'}
                </div>
              </div>
            </div>

            <table className="w-full max-w-xs ml-auto text-sm">
              <tbody>
                {oneTimeTotalCents > 0 && (
                  <tr>
                    <td className="py-1 text-slate-600">One-time project total</td>
                    <td className="py-1 text-right font-semibold">{formatCents(oneTimeTotalCents)}</td>
                  </tr>
                )}
                {monthlyTotalCents > 0 && (
                  <tr>
                    <td className="py-1 text-slate-600">Monthly recurring</td>
                    <td className="py-1 text-right font-semibold text-teal-700">
                      {formatCents(monthlyTotalCents)}<span className="text-xs text-slate-400">/mo</span>
                    </td>
                  </tr>
                )}
                {quarterlyTotalCents > 0 && (
                  <tr>
                    <td className="py-1 text-slate-600">Quarterly recurring</td>
                    <td className="py-1 text-right font-semibold text-teal-700">
                      {formatCents(quarterlyTotalCents)}<span className="text-xs text-slate-400">/qtr</span>
                    </td>
                  </tr>
                )}
                {annualTotalCents > 0 && (
                  <tr>
                    <td className="py-1 text-slate-600">Annual recurring</td>
                    <td className="py-1 text-right font-semibold text-teal-700">
                      {formatCents(annualTotalCents)}<span className="text-xs text-slate-400">/yr</span>
                    </td>
                  </tr>
                )}
                {(oneTimeTotalCents > 0 && discountCents > 0) && (
                  <tr>
                    <td className="py-1 text-amber-700">
                      {discountDescription || 'Discount'}
                      {discountKind === 'percent' && (
                        <span className="text-xs text-slate-400"> ({(discountValueBps / 100).toFixed(discountValueBps % 100 === 0 ? 0 : 2)}%)</span>
                      )}
                    </td>
                    <td className="py-1 text-right font-semibold text-amber-700">
                      −{formatCents(discountCents)}
                    </td>
                  </tr>
                )}
                {(oneTimeTotalCents > 0 && tradeCents > 0) && (
                  <tr>
                    <td className="py-1 text-amber-700">Trade-in-Kind credit</td>
                    <td className="py-1 text-right font-semibold text-amber-700">
                      −{formatCents(tradeCents)}
                    </td>
                  </tr>
                )}
                {(oneTimeTotalCents > 0 && (tradeCents > 0 || discountCents > 0)) && (
                  <tr>
                    <td className="py-1 text-slate-600">Cash project total</td>
                    <td className="py-1 text-right font-semibold">{formatCents(cashTotalCents)}</td>
                  </tr>
                )}
                {oneTimeTotalCents > 0 && (
                  <>
                    <tr>
                      <td className="py-1 text-slate-600">
                        Deposit (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={depositPct}
                          onChange={(e) => { setDepositPct(e.target.value); markDirty() }}
                          className="w-12 border border-slate-200 rounded px-1 py-0 text-center inline"
                        />
                        %)
                      </td>
                      <td className="py-1 text-right font-semibold">{formatCents(depositCents)}</td>
                    </tr>
                    <tr style={{ borderTop: '2px solid #1d2330' }}>
                      <td className="pt-3 font-bold">Balance on delivery</td>
                      <td className="pt-3 text-right font-bold text-base">{formatCents(balanceCents)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
            {(monthlyTotalCents > 0 || quarterlyTotalCents > 0 || annualTotalCents > 0) && (
              <p className="text-xs text-slate-400 mt-2 text-right">
                Recurring charges begin per deliverable start trigger
              </p>
            )}
          </section>

          {/* Payment terms */}
          <section>
            <div
              className="text-xs uppercase tracking-wide font-semibold pb-1.5 mb-3"
              style={{ color: '#5d6780', borderBottom: '1px solid #e2e8f0' }}
            >
              <div className="flex items-center justify-between">
                <span>Payment terms</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = buildSowPaymentTerms({
                      oneTimeCents: oneTimeTotalCents,
                      monthlyCents: monthlyTotalCents,
                      quarterlyCents: quarterlyTotalCents,
                      annualCents: annualTotalCents,
                      depositPct: pct,
                      depositCents,
                      tradeCents,
                      discountCents,
                    })
                    setPaymentTerms(next)
                    markDirty()
                  }}
                  className="text-[10px] normal-case tracking-normal font-normal text-teal-600 hover:underline"
                >
                  Auto-generate from terms
                </button>
              </div>
            </div>
            <FieldTextarea
              value={paymentTerms}
              onChange={(v) => { setPaymentTerms(v); markDirty() }}
              placeholder="Auto-generated on save if left blank — click 'Auto-generate' to preview, then edit freely."
              rows={3}
            />
          </section>

          {/* Guarantees */}
          <section>
            <div
              className="text-xs uppercase tracking-wide font-semibold pb-1.5 mb-3"
              style={{ color: '#5d6780', borderBottom: '1px solid #e2e8f0' }}
            >
              Guarantees
            </div>
            <FieldTextarea
              value={guarantees}
              onChange={(v) => { setGuarantees(v); markDirty() }}
              placeholder="Service guarantees, revision policy, etc."
              rows={2}
            />
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
              placeholder="Additional notes..."
              rows={2}
            />
          </section>

          {/* Accepted block */}
          {sow.accepted_at && sow.accepted_signature && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="text-xs uppercase font-semibold text-emerald-900 mb-1">Accepted</div>
              <div className="text-sm">
                {sow.accepted_signature} on{' '}
                {new Date(sow.accepted_at).toLocaleString()}
              </div>
              {sow.deposit_invoice && (
                <div className="mt-2 text-sm">
                  Deposit invoice:{' '}
                  <Link
                    href={`/admin/invoices/${sow.deposit_invoice_id}`}
                    className="text-teal-600 hover:underline font-mono"
                  >
                    {sow.deposit_invoice.invoice_number}
                  </Link>{' '}
                  — {formatCents(sow.deposit_invoice.total_due_cents)} · {sow.deposit_invoice.status}
                </div>
              )}
            </div>
          )}

          {/* Signature block */}
          <div
            className="pt-10 mt-10"
            style={{ borderTop: '1px dashed #5d6780' }}
          >
            <div className="flex gap-10">
              <div>
                <div className="text-xs mb-1" style={{ color: '#5d6780' }}>Client signature</div>
                <div
                  className="inline-block min-w-48 h-8"
                  style={{ borderBottom: '1px solid #1d2330' }}
                />
                <div className="text-xs mt-1" style={{ color: '#5d6780' }}>Date</div>
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: '#5d6780' }}>DSIG signature</div>
                <div
                  className="inline-block min-w-48 h-8"
                  style={{ borderBottom: '1px solid #1d2330' }}
                />
                <div className="text-xs mt-1" style={{ color: '#5d6780' }}>Date</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="text-xs pt-4 mt-4"
            style={{ color: '#5d6780', borderTop: '1px solid #e2e8f0' }}
          >
            Demand Signals · DemandSignals@gmail.com · (916) 542-2423 · demandsignals.co
          </div>
        </div>

        {/* PDF-mirror back cover (read-only — content is global, not per-SOW) */}
        <div
          className="relative px-10 py-12 text-center overflow-hidden"
          style={{
            background: '#3D4566',
            color: '#ffffff',
            minHeight: 360,
            backgroundImage:
              'radial-gradient(circle at 8% 12%, rgba(82,201,160,0.22) 0%, rgba(82,201,160,0) 38%), radial-gradient(circle at 92% 88%, rgba(242,100,25,0.18) 0%, rgba(242,100,25,0) 42%)',
          }}
        >
          {/* Top strip */}
          <div
            className="absolute top-0 left-0 right-0 h-[5px]"
            style={{ background: 'linear-gradient(90deg, #F26419 0%, #52C9A0 100%)' }}
          />

          <div className="relative z-10 max-w-2xl mx-auto pt-4">
            <div
              className="text-6xl font-bold opacity-50 leading-none mb-2"
              style={{ color: '#52C9A0', fontFamily: 'Georgia, serif' }}
            >
              &ldquo;
            </div>
            <p
              className="italic font-normal leading-snug mb-3"
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: 22,
                color: '#ffffff',
                letterSpacing: '-0.01em',
              }}
            >
              Marketing is no longer about the stuff that you make, but about the stories you tell.
            </p>
            <p
              className="text-xs font-semibold mb-5 uppercase"
              style={{ color: '#52C9A0', letterSpacing: '0.2em', wordSpacing: '0.5em' }}
            >
              — Seth Godin
            </p>
            <div className="h-px w-12 mx-auto opacity-25 bg-white mb-5" />
            <Image
              src="https://demandsignals.co/logo.png"
              alt="Demand Signals"
              width={140}
              height={36}
              className="h-9 w-auto object-contain mx-auto mb-4"
              unoptimized
            />
            <h2 className="text-xl font-bold mb-4" style={{ letterSpacing: '-0.01em' }}>
              Let&rsquo;s get to work — <span style={{ color: '#52C9A0' }}>together.</span>
            </h2>
            <span
              className="inline-block px-7 py-2.5 rounded-full text-[11px] font-bold uppercase mb-5"
              style={{ background: '#F26419', color: '#fff', letterSpacing: '0.1em' }}
            >
              QUESTIONS? GET IN TOUCH →
            </span>
            <div className="grid grid-cols-3 gap-0 max-w-md mx-auto text-left mb-3">
              <div className="px-4 border-r border-white/10">
                <div className="text-[8px] uppercase opacity-60 tracking-wider mb-1">EMAIL</div>
                <div className="text-[10px] font-bold">DemandSignals@gmail.com</div>
              </div>
              <div className="px-4 border-r border-white/10">
                <div className="text-[8px] uppercase opacity-60 tracking-wider mb-1">PHONE</div>
                <div className="text-[10px] font-bold">(916) 542-2423</div>
              </div>
              <div className="px-4">
                <div className="text-[8px] uppercase opacity-60 tracking-wider mb-1">WEB</div>
                <div className="text-[10px] font-bold">DemandSignals.co</div>
              </div>
            </div>
            <p className="text-[9px] opacity-50">© 2026 Demand Signals. Confidential.</p>
          </div>

          {/* Meta band — same as cover */}
          <div
            className="absolute bottom-0 left-0 right-0 grid grid-cols-3 text-[10px] uppercase tracking-wider px-10 py-3 border-t border-white/10 text-left"
            style={{ background: 'rgba(0,0,0,0.18)' }}
          >
            <div>
              <div className="opacity-60">Prepared for</div>
              <div className="font-semibold mt-0.5">{p?.business_name ?? '—'}</div>
            </div>
            <div>
              <div className="opacity-60">Prepared by</div>
              <div className="font-semibold mt-0.5">Demand Signals</div>
            </div>
            <div>
              <div className="opacity-60">Issued</div>
              <div className="font-semibold mt-0.5">
                {sendDate ? new Date(sendDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cadence picker modal for 'both' pricing_type items */}
      {pendingCatalogItem && (
        <CadencePickModal
          item={pendingCatalogItem.item}
          onConfirm={(cadence, unitPrice) => {
            addDeliverableFromCatalog(pendingCatalogItem.phaseId, pendingCatalogItem.item, cadence, unitPrice)
            setPendingCatalogItem(null)
          }}
          onCancel={() => setPendingCatalogItem(null)}
        />
      )}

      {/* Preview-before-send modal */}
      {/* Quote picker modal — pick a specific back-cover quote by index.
          On confirm, writes 'quote:N' sentinel into quote_seed which the
          PDF render path short-circuits to the exact quote chosen. */}
      {quotePickerOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">Pick a back-cover quote</h2>
                <p className="text-sm text-slate-600">
                  Selecting one locks it to this SOW. Reroll regenerates randomly; Reset reverts to the default seeded by SOW number.
                </p>
              </div>
              <button onClick={() => setQuotePickerOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {BACK_COVER_QUOTES.map((q, i) => {
                const sentinel = `quote:${i}`
                const isCurrent = quoteSeed === sentinel
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setQuoteSeed(sentinel)
                      markDirty()
                      setQuotePickerOpen(false)
                    }}
                    className={`w-full text-left rounded border p-3 text-sm transition-colors ${
                      isCurrent
                        ? 'bg-teal-50 border-teal-400'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="italic text-slate-700 leading-snug">“{q.text}”</div>
                    <div className="mt-1 text-[10px] uppercase tracking-wide text-teal-700">
                      — {q.author}
                      <span className="ml-2 text-slate-400">#{i + 1}</span>
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                onClick={() => setQuotePickerOpen(false)}
                className="bg-slate-100 text-slate-700 rounded px-4 py-1.5 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {previewModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">
                  {previewModal.kind === 'error'
                    ? 'Preview failed'
                    : previewModal.kind === 'email'
                      ? 'Preview email — review before sending'
                      : 'Preview SMS — review before sending'}
                </h2>
                <p className="text-sm text-slate-600">
                  This is the exact message that will go out on confirm. Nothing has been sent yet.
                </p>
              </div>
              <button onClick={() => { setPreviewModal(null); setPreviewResult(null) }} className="text-slate-400 hover:text-slate-600">
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {previewModal.kind === 'error' ? (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2">
                {previewModal.message}
              </div>
            ) : 'loading' in previewModal && previewModal.loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 p-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Building preview…
              </div>
            ) : previewModal.kind === 'email' ? (
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                  <div className="text-slate-500 font-medium">To:</div>
                  <div className="font-mono">{previewModal.recipient}</div>
                  <div className="text-slate-500 font-medium">Subject:</div>
                  <div className="font-medium">{previewModal.subject}</div>
                  <div className="text-slate-500 font-medium">Attachment:</div>
                  <div>
                    {previewModal.has_pdf_attachment
                      ? <span className="text-emerald-700">📎 {previewModal.pdf_filename}</span>
                      : <span className="text-slate-400">none</span>}
                  </div>
                </div>
                <details open className="border border-slate-200 rounded">
                  <summary className="px-3 py-2 bg-slate-50 cursor-pointer text-xs uppercase tracking-wide font-semibold text-slate-600">
                    Email body (rendered)
                  </summary>
                  <iframe
                    title="Email preview"
                    sandbox=""
                    srcDoc={previewModal.html}
                    className="w-full bg-white border-0"
                    style={{ minHeight: 360 }}
                  />
                </details>
                <details className="border border-slate-200 rounded">
                  <summary className="px-3 py-2 bg-slate-50 cursor-pointer text-xs uppercase tracking-wide font-semibold text-slate-600">
                    Plain text fallback
                  </summary>
                  <pre className="p-4 bg-slate-50 text-xs whitespace-pre-wrap font-mono text-slate-700">{previewModal.text}</pre>
                </details>
                <div className="text-xs text-slate-500">
                  Magic link: <code className="text-[10px]">{previewModal.public_url}</code>
                </div>
              </div>
            ) : (
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                  <div className="text-slate-500 font-medium">To:</div>
                  <div className="font-mono">{previewModal.recipient}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1">SMS message</div>
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm font-mono whitespace-pre-wrap">
                    {previewModal.message}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {previewModal.message.length} / 160 chars{previewModal.message.length > 160 ? ' — will be sent as multipart SMS' : ''}
                  </div>
                </div>
              </div>
            )}

            {previewResult && (
              <div className={`text-sm rounded px-3 py-2 border ${previewResult.startsWith('Failed')
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                {previewResult}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => { setPreviewModal(null); setPreviewResult(null) }}
                className="bg-slate-100 text-slate-700 rounded px-4 py-1.5 text-sm"
              >
                {previewResult && !previewResult.startsWith('Failed') ? 'Close' : 'Cancel'}
              </button>
              {previewModal.kind !== 'error' && !('loading' in previewModal && previewModal.loading) && !(previewResult && !previewResult.startsWith('Failed')) && (
                <button
                  onClick={confirmPreviewAndSend}
                  disabled={previewSubmitting}
                  className="text-white rounded px-4 py-1.5 text-sm font-semibold disabled:opacity-50 bg-blue-600"
                >
                  {previewSubmitting ? 'Sending…' : previewModal.kind === 'email' ? 'Send email' : 'Send SMS'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sent modal */}
      {sentModalUrl && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full space-y-4">
            <h2 className="text-lg font-bold">SOW sent</h2>
            <p className="text-sm text-slate-600">
              Share this URL with the prospect. They can review, download PDF, and click Accept.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded p-2 flex items-center gap-2">
              <code className="flex-1 text-xs truncate">{sentModalUrl}</code>
              <button
                onClick={() => navigator.clipboard.writeText(sentModalUrl)}
                className="text-teal-600 hover:text-teal-700"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setSentModalUrl(null)}
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
