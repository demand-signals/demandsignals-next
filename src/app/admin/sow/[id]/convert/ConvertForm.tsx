'use client'

// ── ConvertForm ─────────────────────────────────────────────────────
// Replaces the previous ConvertModal. Two important changes:
//   1. Lives on its own page, no parent re-renders → no remounts.
//   2. Number inputs use RAW STRING STATE (committed to cents on blur)
//      so typing isn't disrupted by toFixed re-formatting on every keystroke.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type {
  ConvertSowRequest,
  ConvertSowResult,
  ConvertSowSubscriptionSpec,
  ConvertSowTikSpec,
  TriggerType,
  CurrencyType,
  ExpectedPaymentMethod,
} from '@/lib/payment-plan-types'

interface RecurringDeliverable {
  id: string
  name: string
  monthly_cents: number
  cadence: 'monthly' | 'quarterly' | 'annual'
}

export interface SowSummary {
  id: string
  sow_number: string
  title: string
  status: string
  total_cents: number
  trade_credit_cents: number
  trade_credit_description: string | null
  phases: Array<{ id: string; name: string }>
  recurring_deliverables: RecurringDeliverable[]
}

// ── Local row shapes — store amount as raw string for stable input UX ─

interface InstallmentRow {
  sequence: number
  amount_input: string                  // raw "$ amount" text
  currency_type: CurrencyType
  expected_payment_method: ExpectedPaymentMethod
  trigger_type: TriggerType
  trigger_date?: string
  trigger_milestone_id?: string
  trigger_payment_sequence?: number
  description: string
  already_paid?: {
    paid_date: string
    paid_method: 'check' | 'wire' | 'cash' | 'card' | 'ach' | 'other'
    reference?: string
  }
}

interface SubscriptionRow {
  deliverable_id: string
  amount_input: string                  // raw "$ amount" text
  interval: 'month' | 'quarter' | 'year'
  start_date: string
  cycle_cap_input: string               // raw integer text; '' = open-ended
  already_activated: boolean
}

const dollarsToCents = (raw: string): number => {
  const n = parseFloat(raw)
  if (Number.isNaN(n) || n < 0) return 0
  return Math.round(n * 100)
}

const fmtCents = (c: number) => `$${(c / 100).toFixed(2)}`

export function ConvertForm({ sow }: { sow: SowSummary }) {
  const router = useRouter()
  const tikInitial = sow.trade_credit_cents > 0
  const cashTotalCents = sow.total_cents - (tikInitial ? sow.trade_credit_cents : 0)
  const today = new Date().toISOString().slice(0, 10)

  const cadenceToInterval = (
    c: 'monthly' | 'quarterly' | 'annual',
  ): 'month' | 'quarter' | 'year' =>
    c === 'monthly' ? 'month' : c === 'quarterly' ? 'quarter' : 'year'

  // ── Acceptance ────────────────────────────────────────────────────
  const [signedBy, setSignedBy] = useState('Hunter (admin, on behalf of client)')
  const [acceptedAt, setAcceptedAt] = useState(today)
  const [method, setMethod] = useState<'in_person' | 'phone' | 'email' | 'magic_link'>(
    'in_person',
  )
  const [sendInvoices, setSendInvoices] = useState(true)

  // ── TIK ──────────────────────────────────────────────────────────
  const [includeTik, setIncludeTik] = useState(tikInitial)
  const [tikDesc, setTikDesc] = useState(sow.trade_credit_description ?? '')
  const [tikAmountInput, setTikAmountInput] = useState((sow.trade_credit_cents / 100).toFixed(2))
  const [tikTrigger, setTikTrigger] =
    useState<'on_acceptance' | 'milestone' | 'on_completion_of_payment'>('on_acceptance')

  // ── Installments ──────────────────────────────────────────────────
  const [installments, setInstallments] = useState<InstallmentRow[]>([
    {
      sequence: 1,
      amount_input: (cashTotalCents / 100).toFixed(2),
      currency_type: 'cash',
      expected_payment_method: 'card',
      trigger_type: 'on_acceptance',
      description: 'Full payment',
    },
  ])

  // ── Subscriptions (auto-prefilled from recurring deliverables) ────
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>(
    sow.recurring_deliverables.map((d) => ({
      deliverable_id: d.id,
      amount_input: (d.monthly_cents / 100).toFixed(2),
      interval: cadenceToInterval(d.cadence),
      start_date: today,
      cycle_cap_input: '',
      already_activated: false,
    })),
  )

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Live sum check (compute on demand, doesn't store anything)
  const allocatedCents = installments
    .filter((i) => i.currency_type === 'cash')
    .reduce((s, i) => s + dollarsToCents(i.amount_input), 0)
  const tikAmountCents = includeTik ? dollarsToCents(tikAmountInput) : 0
  const expectedCash = sow.total_cents - tikAmountCents
  const sumOk = allocatedCents === expectedCash

  // ── Presets ──────────────────────────────────────────────────────
  function applyPreset(preset: 'single' | 'two' | 'three') {
    if (preset === 'single') {
      setInstallments([
        {
          sequence: 1,
          amount_input: (expectedCash / 100).toFixed(2),
          currency_type: 'cash',
          expected_payment_method: 'card',
          trigger_type: 'on_acceptance',
          description: 'Full payment',
        },
      ])
    } else if (preset === 'two') {
      const half = Math.floor(expectedCash / 2)
      const other = expectedCash - half
      const due = new Date()
      due.setDate(due.getDate() + 30)
      setInstallments([
        {
          sequence: 1,
          amount_input: (half / 100).toFixed(2),
          currency_type: 'cash',
          expected_payment_method: 'card',
          trigger_type: 'on_acceptance',
          description: 'Installment 1 of 2',
        },
        {
          sequence: 2,
          amount_input: (other / 100).toFixed(2),
          currency_type: 'cash',
          expected_payment_method: 'card',
          trigger_type: 'time',
          trigger_date: due.toISOString().slice(0, 10),
          description: 'Installment 2 of 2',
        },
      ])
    } else {
      const third = Math.floor(expectedCash / 3)
      const remainder = expectedCash - third * 2
      const d30 = new Date(); d30.setDate(d30.getDate() + 30)
      const d60 = new Date(); d60.setDate(d60.getDate() + 60)
      setInstallments([
        {
          sequence: 1,
          amount_input: (third / 100).toFixed(2),
          currency_type: 'cash',
          expected_payment_method: 'card',
          trigger_type: 'on_acceptance',
          description: 'Installment 1 of 3',
        },
        {
          sequence: 2,
          amount_input: (third / 100).toFixed(2),
          currency_type: 'cash',
          expected_payment_method: 'card',
          trigger_type: 'time',
          trigger_date: d30.toISOString().slice(0, 10),
          description: 'Installment 2 of 3',
        },
        {
          sequence: 3,
          amount_input: (remainder / 100).toFixed(2),
          currency_type: 'cash',
          expected_payment_method: 'card',
          trigger_type: 'time',
          trigger_date: d60.toISOString().slice(0, 10),
          description: 'Installment 3 of 3',
        },
      ])
    }
  }

  function patchInstallment(idx: number, patch: Partial<InstallmentRow>) {
    setInstallments((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }
  function addInstallment() {
    setInstallments((prev) => [
      ...prev,
      {
        sequence: prev.length + 1,
        amount_input: '0.00',
        currency_type: 'cash',
        expected_payment_method: 'card',
        trigger_type: 'on_acceptance',
        description: `Installment ${prev.length + 1}`,
      },
    ])
  }
  function removeInstallment(idx: number) {
    setInstallments((prev) =>
      prev.filter((_, i) => i !== idx).map((p, i) => ({ ...p, sequence: i + 1 })),
    )
  }

  function patchSub(idx: number, patch: Partial<SubscriptionRow>) {
    setSubscriptions((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }
  function addSub() {
    setSubscriptions((prev) => [
      ...prev,
      {
        deliverable_id: `manual-${Date.now()}`,
        amount_input: '0.00',
        interval: 'month',
        start_date: today,
        cycle_cap_input: '',
        already_activated: false,
      },
    ])
  }
  function removeSub(idx: number) {
    setSubscriptions((prev) => prev.filter((_, i) => i !== idx))
  }

  async function submit() {
    setSubmitting(true)
    setError(null)

    const tik: ConvertSowTikSpec | undefined =
      includeTik && tikAmountCents > 0
        ? { amount_cents: tikAmountCents, description: tikDesc, trigger_type: tikTrigger }
        : undefined

    const subscriptionsPayload: ConvertSowSubscriptionSpec[] = subscriptions.map((s) => {
      const cap = s.cycle_cap_input.trim() === ''
        ? undefined
        : Math.max(1, parseInt(s.cycle_cap_input, 10) || 0) || undefined
      return {
        deliverable_id: s.deliverable_id,
        amount_cents: dollarsToCents(s.amount_input),
        interval: s.interval,
        start_date: s.start_date,
        cycle_cap: cap,
        already_activated: s.already_activated || undefined,
      }
    })

    const body: ConvertSowRequest = {
      acceptance: { signed_by: signedBy, accepted_at: acceptedAt, method },
      payment_plan: installments.map((i) => ({
        sequence: i.sequence,
        amount_cents: dollarsToCents(i.amount_input),
        currency_type: i.currency_type,
        expected_payment_method: i.expected_payment_method,
        trigger_type: i.trigger_type,
        trigger_date: i.trigger_date,
        trigger_milestone_id: i.trigger_milestone_id,
        trigger_payment_sequence: i.trigger_payment_sequence,
        description: i.description,
        already_paid: i.already_paid,
      })),
      subscriptions: subscriptionsPayload,
      tik,
      send_invoices: sendInvoices,
    }

    try {
      const res = await fetch(`/api/admin/sow/${sow.id}/convert`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Conversion failed')
        setSubmitting(false)
        return
      }
      const result = data as ConvertSowResult
      const invoiceList = result.installments
        .filter((i) => i.invoice_number)
        .map((i) => i.invoice_number)
        .join(', ')
      const subList = result.subscriptions
        .map((s) => `${s.id.slice(0, 8)} (${s.status})`)
        .join(', ')
      alert(
        `Project created: ${result.project_id}\n` +
          `Invoices: ${invoiceList || '(none yet)'}\n` +
          `Subscriptions: ${subList || '(none)'}\n` +
          `TIK ledger: ${result.trade_credit_id ? 'opened' : '(none)'}`,
      )
      router.push(`/admin/projects/${result.project_id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSubmitting(false)
    }
  }

  // ── Reusable styles (kept inline for portability — no global CSS dep) ─
  const cardStyle: React.CSSProperties = {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    background: '#fff',
  }
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: 8,
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 13,
  }
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    color: '#5d6780',
    marginBottom: 4,
  }
  const legendStyle: React.CSSProperties = {
    fontWeight: 600,
    fontSize: 14,
    marginBottom: 12,
  }

  return (
    <>
      {/* Acceptance */}
      <section style={cardStyle}>
        <div style={legendStyle}>Acceptance</div>
        <label style={labelStyle}>Signed by</label>
        <input
          value={signedBy}
          onChange={(e) => setSignedBy(e.target.value)}
          style={{ ...inputStyle, marginBottom: 12 }}
        />
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Accepted at</label>
            <input
              type="date"
              value={acceptedAt}
              onChange={(e) => setAcceptedAt(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as typeof method)}
              style={inputStyle}
            >
              <option value="in_person">In person</option>
              <option value="phone">Phone</option>
              <option value="email">Email</option>
              <option value="magic_link">Magic link</option>
            </select>
          </div>
        </div>
      </section>

      {/* TIK */}
      <section style={cardStyle}>
        <div style={legendStyle}>
          <label>
            <input
              type="checkbox"
              checked={includeTik}
              onChange={(e) => setIncludeTik(e.target.checked)}
            />{' '}
            Trade-in-Kind (services owed by client)
          </label>
        </div>
        {includeTik && (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>TIK amount ($)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={tikAmountInput}
                  onChange={(e) => setTikAmountInput(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Trigger</label>
                <select
                  value={tikTrigger}
                  onChange={(e) => setTikTrigger(e.target.value as typeof tikTrigger)}
                  style={inputStyle}
                >
                  <option value="on_acceptance">On acceptance (today)</option>
                  <option value="milestone">On a milestone</option>
                  <option value="on_completion_of_payment">When a cash payment is received</option>
                </select>
              </div>
            </div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={tikDesc}
              onChange={(e) => setTikDesc(e.target.value)}
              style={{ ...inputStyle, minHeight: 60 }}
            />
          </>
        )}
      </section>

      {/* Recurring Subscriptions */}
      <section style={cardStyle}>
        <div style={legendStyle}>Recurring subscriptions (Stripe)</div>
        {subscriptions.length === 0 && (
          <p style={{ fontSize: 13, color: '#5d6780', marginBottom: 12 }}>
            No recurring services. Click below to add one.
          </p>
        )}
        {subscriptions.map((sub, idx) => (
          <div
            key={`sub-${idx}`}
            style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: 12, marginBottom: 8 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <strong style={{ fontSize: 13 }}>Subscription {idx + 1}</strong>
              <button
                type="button"
                onClick={() => removeSub(idx)}
                style={{
                  marginLeft: 'auto',
                  padding: '4px 10px',
                  background: '#fee',
                  border: '1px solid #fcc',
                  borderRadius: 4,
                  fontSize: 12,
                  color: '#c00',
                }}
              >
                Remove
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <label style={labelStyle}>Amount per cycle ($)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={sub.amount_input}
                  onChange={(e) => patchSub(idx, { amount_input: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Interval</label>
                <select
                  value={sub.interval}
                  onChange={(e) =>
                    patchSub(idx, { interval: e.target.value as 'month' | 'quarter' | 'year' })
                  }
                  style={inputStyle}
                >
                  <option value="month">Monthly</option>
                  <option value="quarter">Quarterly</option>
                  <option value="year">Annually</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Start date</label>
                <input
                  type="date"
                  value={sub.start_date}
                  onChange={(e) => patchSub(idx, { start_date: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: 12 }}>
                Cap at
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="∞"
                  value={sub.cycle_cap_input}
                  onChange={(e) => patchSub(idx, { cycle_cap_input: e.target.value })}
                  style={{ ...inputStyle, width: 70, display: 'inline-block', margin: '0 6px' }}
                />
                cycles (blank = open-ended)
              </label>
              <label style={{ fontSize: 12, marginLeft: 'auto' }}>
                <input
                  type="checkbox"
                  checked={sub.already_activated}
                  onChange={(e) => patchSub(idx, { already_activated: e.target.checked })}
                />{' '}
                Already activated externally (backfill)
              </label>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addSub}
          style={{
            padding: '8px 14px',
            background: '#68c5ad',
            color: '#fff',
            border: 0,
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          + Add subscription
        </button>
      </section>

      {/* Payment Plan */}
      <section style={cardStyle}>
        <div style={legendStyle}>
          Build payment plan · cash to allocate: {fmtCents(expectedCash)}
        </div>
        <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => applyPreset('single')}
            style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#f4f6f9' }}
          >
            Single payment
          </button>
          <button
            type="button"
            onClick={() => applyPreset('two')}
            style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#f4f6f9' }}
          >
            2 installments (30d)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('three')}
            style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#f4f6f9' }}
          >
            3 installments (30d/60d)
          </button>
        </div>

        {installments.map((inst, idx) => (
          <div
            key={`inst-${idx}`}
            style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: 12, marginBottom: 8 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <strong style={{ fontSize: 13 }}>Payment {inst.sequence}</strong>
              <button
                type="button"
                onClick={() => removeInstallment(idx)}
                style={{
                  marginLeft: 'auto',
                  padding: '4px 10px',
                  background: '#fee',
                  border: '1px solid #fcc',
                  borderRadius: 4,
                  fontSize: 12,
                  color: '#c00',
                }}
              >
                Remove
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <label style={labelStyle}>Amount ($)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={inst.amount_input}
                  onChange={(e) => patchInstallment(idx, { amount_input: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Currency</label>
                <select
                  value={inst.currency_type}
                  onChange={(e) =>
                    patchInstallment(idx, { currency_type: e.target.value as CurrencyType })
                  }
                  style={inputStyle}
                >
                  <option value="cash">Cash</option>
                  <option value="tik">TIK</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Trigger</label>
                <select
                  value={inst.trigger_type}
                  onChange={(e) =>
                    patchInstallment(idx, { trigger_type: e.target.value as TriggerType })
                  }
                  style={inputStyle}
                >
                  <option value="on_acceptance">On acceptance</option>
                  <option value="time">On a date</option>
                  <option value="milestone">On milestone</option>
                  <option value="on_completion_of_payment">On payment received</option>
                </select>
              </div>
            </div>
            {inst.trigger_type === 'time' && (
              <div>
                <label style={labelStyle}>Trigger date</label>
                <input
                  type="date"
                  value={inst.trigger_date ?? ''}
                  onChange={(e) => patchInstallment(idx, { trigger_date: e.target.value })}
                  style={inputStyle}
                />
              </div>
            )}
            {inst.trigger_type === 'milestone' && (
              <div>
                <label style={labelStyle}>Milestone (phase)</label>
                <select
                  value={inst.trigger_milestone_id ?? ''}
                  onChange={(e) => patchInstallment(idx, { trigger_milestone_id: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Select…</option>
                  {sow.phases.map((ph) => (
                    <option key={ph.id} value={ph.id}>{ph.name}</option>
                  ))}
                </select>
              </div>
            )}
            {inst.trigger_type === 'on_completion_of_payment' && (
              <div>
                <label style={labelStyle}>Triggered by payment #</label>
                <select
                  value={inst.trigger_payment_sequence ?? ''}
                  onChange={(e) =>
                    patchInstallment(idx, {
                      trigger_payment_sequence: parseInt(e.target.value, 10),
                    })
                  }
                  style={inputStyle}
                >
                  <option value="">Select…</option>
                  {installments
                    .filter((p) => p.sequence < inst.sequence)
                    .map((p) => (
                      <option key={p.sequence} value={p.sequence}>
                        Payment {p.sequence} ({fmtCents(dollarsToCents(p.amount_input))})
                      </option>
                    ))}
                </select>
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              <label style={labelStyle}>Description</label>
              <input
                value={inst.description}
                onChange={(e) => patchInstallment(idx, { description: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={!!inst.already_paid}
                  onChange={(e) =>
                    patchInstallment(idx, {
                      already_paid: e.target.checked
                        ? { paid_date: today, paid_method: 'check' }
                        : undefined,
                    })
                  }
                />{' '}
                Already paid externally (backfill)
              </label>
              {inst.already_paid && (
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <input
                    type="date"
                    value={inst.already_paid.paid_date}
                    onChange={(e) =>
                      patchInstallment(idx, {
                        already_paid: { ...inst.already_paid!, paid_date: e.target.value },
                      })
                    }
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <select
                    value={inst.already_paid.paid_method}
                    onChange={(e) =>
                      patchInstallment(idx, {
                        already_paid: {
                          ...inst.already_paid!,
                          paid_method: e.target.value as
                            | 'check'
                            | 'wire'
                            | 'cash'
                            | 'card'
                            | 'ach'
                            | 'other',
                        },
                      })
                    }
                    style={{ ...inputStyle, flex: 1 }}
                  >
                    <option value="check">Check</option>
                    <option value="wire">Wire</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="ach">ACH</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    placeholder="Reference"
                    value={inst.already_paid.reference ?? ''}
                    onChange={(e) =>
                      patchInstallment(idx, {
                        already_paid: { ...inst.already_paid!, reference: e.target.value },
                      })
                    }
                    style={{ ...inputStyle, flex: 1 }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addInstallment}
          style={{
            padding: '8px 14px',
            background: '#68c5ad',
            color: '#fff',
            border: 0,
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          + Add payment
        </button>

        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 6,
            background: sumOk ? '#f0fdf4' : '#fef2f2',
            color: sumOk ? '#16a34a' : '#dc2626',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {sumOk ? '✓' : '✗'} Allocated {fmtCents(allocatedCents)} of {fmtCents(expectedCash)} cash
          {!sumOk && ` — diff ${fmtCents(expectedCash - allocatedCents)}`}
        </div>
      </section>

      {/* Send invoices */}
      <section style={cardStyle}>
        <div style={legendStyle}>Delivery</div>
        <label style={{ fontSize: 13 }}>
          <input
            type="checkbox"
            checked={sendInvoices}
            onChange={(e) => setSendInvoices(e.target.checked)}
          />{' '}
          Send magic-link emails for fired invoices immediately
        </label>
      </section>

      {error && (
        <div
          style={{
            padding: 12,
            background: '#fef2f2',
            color: '#dc2626',
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginBottom: 40 }}>
        <button
          onClick={() => router.push(`/admin/sow/${sow.id}`)}
          disabled={submitting}
          style={{
            padding: '10px 20px',
            background: '#f4f6f9',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            fontSize: 14,
          }}
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={submitting || !sumOk}
          style={{
            padding: '10px 20px',
            background: sumOk ? '#FF6B2B' : '#cbd5e1',
            color: '#fff',
            border: 0,
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: sumOk ? 'pointer' : 'not-allowed',
          }}
        >
          {submitting ? 'Converting…' : 'Convert & Generate'}
        </button>
      </div>
    </>
  )
}
