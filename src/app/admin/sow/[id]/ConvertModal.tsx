'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type {
  ConvertSowRequest,
  ConvertSowResult,
  ConvertSowPaymentInstallmentSpec,
  ConvertSowSubscriptionSpec,
  ConvertSowTikSpec,
  TriggerType,
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

interface Props {
  sow: SowSummary
  onClose: () => void
  onConverted: (result: ConvertSowResult) => void
}

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`

export function ConvertModal({ sow, onClose, onConverted }: Props) {
  const tikInitial = sow.trade_credit_cents > 0
  const cashTotalCents = sow.total_cents - (tikInitial ? sow.trade_credit_cents : 0)
  const today = new Date().toISOString().slice(0, 10)

  const [signedBy, setSignedBy] = useState(`Hunter (admin, on behalf of client)`)
  const [acceptedAt, setAcceptedAt] = useState(today)
  const [method, setMethod] = useState<'in_person' | 'phone' | 'email' | 'magic_link'>('in_person')
  const [sendInvoices, setSendInvoices] = useState(true)
  const [includeTik, setIncludeTik] = useState(tikInitial)
  const [tikDesc, setTikDesc] = useState(sow.trade_credit_description ?? '')
  const [tikAmount, setTikAmount] = useState((sow.trade_credit_cents / 100).toFixed(2))
  const [tikTrigger, setTikTrigger] =
    useState<'on_acceptance' | 'milestone' | 'on_completion_of_payment'>('on_acceptance')

  const cadenceToInterval = (c: 'monthly' | 'quarterly' | 'annual'): 'month' | 'quarter' | 'year' =>
    c === 'monthly' ? 'month' : c === 'quarterly' ? 'quarter' : 'year'

  const [installments, setInstallments] = useState<ConvertSowPaymentInstallmentSpec[]>([
    {
      sequence: 1,
      amount_cents: cashTotalCents,
      currency_type: 'cash',
      expected_payment_method: 'card',
      trigger_type: 'on_acceptance',
      description: 'Full payment',
    },
  ])

  const [subscriptions, setSubscriptions] = useState<ConvertSowSubscriptionSpec[]>(
    sow.recurring_deliverables.map((d) => ({
      deliverable_id: d.id,
      amount_cents: d.monthly_cents,
      interval: cadenceToInterval(d.cadence),
      start_date: today,
      cycle_cap: undefined,
    })),
  )

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allocatedCents = installments
    .filter((i) => i.currency_type === 'cash')
    .reduce((s, i) => s + i.amount_cents, 0)
  const tikAmountCents = includeTik ? Math.round(parseFloat(tikAmount || '0') * 100) : 0
  const expectedCash = sow.total_cents - tikAmountCents
  const sumOk = allocatedCents === expectedCash

  function applyPreset(preset: 'single' | 'two_installments' | 'three_installments') {
    if (preset === 'single') {
      setInstallments([
        {
          sequence: 1,
          amount_cents: expectedCash,
          currency_type: 'cash',
          expected_payment_method: 'card',
          trigger_type: 'on_acceptance',
          description: 'Full payment',
        },
      ])
    } else if (preset === 'two_installments') {
      const half = Math.floor(expectedCash / 2)
      const otherHalf = expectedCash - half
      const due = new Date()
      due.setDate(due.getDate() + 30)
      setInstallments([
        {
          sequence: 1,
          amount_cents: half,
          currency_type: 'cash',
          expected_payment_method: 'card',
          trigger_type: 'on_acceptance',
          description: 'Installment 1 of 2',
        },
        {
          sequence: 2,
          amount_cents: otherHalf,
          currency_type: 'cash',
          expected_payment_method: 'card',
          trigger_type: 'time',
          trigger_date: due.toISOString().slice(0, 10),
          description: 'Installment 2 of 2',
        },
      ])
    } else if (preset === 'three_installments') {
      const third = Math.floor(expectedCash / 3)
      const remainder = expectedCash - third * 2
      const due30 = new Date()
      due30.setDate(due30.getDate() + 30)
      const due60 = new Date()
      due60.setDate(due60.getDate() + 60)
      setInstallments([
        {
          sequence: 1,
          amount_cents: third,
          currency_type: 'cash',
          expected_payment_method: 'card',
          trigger_type: 'on_acceptance',
          description: 'Installment 1 of 3',
        },
        {
          sequence: 2,
          amount_cents: third,
          currency_type: 'cash',
          expected_payment_method: 'card',
          trigger_type: 'time',
          trigger_date: due30.toISOString().slice(0, 10),
          description: 'Installment 2 of 3',
        },
        {
          sequence: 3,
          amount_cents: remainder,
          currency_type: 'cash',
          expected_payment_method: 'card',
          trigger_type: 'time',
          trigger_date: due60.toISOString().slice(0, 10),
          description: 'Installment 3 of 3',
        },
      ])
    }
  }

  function updateInstallment(idx: number, patch: Partial<ConvertSowPaymentInstallmentSpec>) {
    setInstallments((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }

  function addInstallment() {
    setInstallments((prev) => [
      ...prev,
      {
        sequence: prev.length + 1,
        amount_cents: 0,
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

  function updateSub(idx: number, patch: Partial<ConvertSowSubscriptionSpec>) {
    setSubscriptions((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }
  function addSub() {
    setSubscriptions((prev) => [
      ...prev,
      {
        deliverable_id: `manual-${Date.now()}`,
        amount_cents: 0,
        interval: 'month',
        start_date: today,
        cycle_cap: undefined,
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
        ? {
            amount_cents: tikAmountCents,
            description: tikDesc,
            trigger_type: tikTrigger,
          }
        : undefined

    const body: ConvertSowRequest = {
      acceptance: { signed_by: signedBy, accepted_at: acceptedAt, method },
      payment_plan: installments,
      subscriptions,
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
      onConverted(data as ConvertSowResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSubmitting(false)
    }
  }

  // Portal mount: createPortal requires document.body, so defer until client-side mount.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  const modalUi = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 32,
          maxWidth: 760,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          Convert SOW {sow.sow_number} to Project
        </h2>
        <p style={{ color: '#5d6780', marginBottom: 24, fontSize: 14 }}>
          {sow.title} · Total: {fmt(sow.total_cents)}
        </p>

        {/* Acceptance */}
        <fieldset
          style={{ marginBottom: 24, border: '1px solid #e2e8f0', padding: 16, borderRadius: 8 }}
        >
          <legend style={{ fontWeight: 600, padding: '0 8px' }}>Acceptance</legend>
          <label style={{ display: 'block', fontSize: 12, color: '#5d6780', marginBottom: 4 }}>
            Signed by
          </label>
          <input
            value={signedBy}
            onChange={(e) => setSignedBy(e.target.value)}
            style={{
              width: '100%',
              padding: 8,
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              marginBottom: 12,
            }}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label
                style={{ display: 'block', fontSize: 12, color: '#5d6780', marginBottom: 4 }}
              >
                Accepted at
              </label>
              <input
                type="date"
                value={acceptedAt}
                onChange={(e) => setAcceptedAt(e.target.value)}
                style={{
                  width: '100%',
                  padding: 8,
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label
                style={{ display: 'block', fontSize: 12, color: '#5d6780', marginBottom: 4 }}
              >
                Method
              </label>
              <select
                value={method}
                onChange={(e) =>
                  setMethod(e.target.value as 'in_person' | 'phone' | 'email' | 'magic_link')
                }
                style={{
                  width: '100%',
                  padding: 8,
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                }}
              >
                <option value="in_person">In person</option>
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="magic_link">Magic link</option>
              </select>
            </div>
          </div>
        </fieldset>

        {/* TIK */}
        <fieldset
          style={{ marginBottom: 24, border: '1px solid #e2e8f0', padding: 16, borderRadius: 8 }}
        >
          <legend style={{ fontWeight: 600, padding: '0 8px' }}>
            <label>
              <input
                type="checkbox"
                checked={includeTik}
                onChange={(e) => setIncludeTik(e.target.checked)}
              />{' '}
              Trade-in-Kind (services owed by client)
            </label>
          </legend>
          {includeTik && (
            <>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label
                    style={{ display: 'block', fontSize: 12, color: '#5d6780', marginBottom: 4 }}
                  >
                    TIK amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={tikAmount}
                    onChange={(e) => setTikAmount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: 8,
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    style={{ display: 'block', fontSize: 12, color: '#5d6780', marginBottom: 4 }}
                  >
                    Trigger
                  </label>
                  <select
                    value={tikTrigger}
                    onChange={(e) =>
                      setTikTrigger(
                        e.target.value as
                          | 'on_acceptance'
                          | 'milestone'
                          | 'on_completion_of_payment',
                      )
                    }
                    style={{
                      width: '100%',
                      padding: 8,
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                    }}
                  >
                    <option value="on_acceptance">On acceptance (today)</option>
                    <option value="milestone">On a milestone</option>
                    <option value="on_completion_of_payment">When a cash payment is received</option>
                  </select>
                </div>
              </div>
              <label
                style={{ display: 'block', fontSize: 12, color: '#5d6780', marginBottom: 4 }}
              >
                Description
              </label>
              <textarea
                value={tikDesc}
                onChange={(e) => setTikDesc(e.target.value)}
                style={{
                  width: '100%',
                  padding: 8,
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  minHeight: 60,
                }}
              />
            </>
          )}
        </fieldset>

        {/* Recurring Subscriptions */}
        <fieldset
          style={{ marginBottom: 24, border: '1px solid #e2e8f0', padding: 16, borderRadius: 8 }}
        >
          <legend style={{ fontWeight: 600, padding: '0 8px' }}>
            Recurring subscriptions (Stripe)
          </legend>
          {subscriptions.length === 0 && (
            <p style={{ fontSize: 13, color: '#5d6780', marginBottom: 12 }}>
              No recurring services. Click below to add one.
            </p>
          )}
          {subscriptions.map((sub, idx) => (
            <div
              key={idx}
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
                  <label style={{ display: 'block', fontSize: 11, color: '#5d6780', marginBottom: 2 }}>
                    Amount per cycle ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={(sub.amount_cents / 100).toFixed(2)}
                    onChange={(e) =>
                      updateSub(idx, {
                        amount_cents: Math.round(parseFloat(e.target.value || '0') * 100),
                      })
                    }
                    style={{
                      width: '100%',
                      padding: 6,
                      border: '1px solid #cbd5e1',
                      borderRadius: 4,
                      fontSize: 13,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#5d6780', marginBottom: 2 }}>
                    Interval
                  </label>
                  <select
                    value={sub.interval}
                    onChange={(e) =>
                      updateSub(idx, { interval: e.target.value as 'month' | 'quarter' | 'year' })
                    }
                    style={{
                      width: '100%',
                      padding: 6,
                      border: '1px solid #cbd5e1',
                      borderRadius: 4,
                      fontSize: 13,
                    }}
                  >
                    <option value="month">Monthly</option>
                    <option value="quarter">Quarterly</option>
                    <option value="year">Annually</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#5d6780', marginBottom: 2 }}>
                    Start date
                  </label>
                  <input
                    type="date"
                    value={sub.start_date}
                    onChange={(e) => updateSub(idx, { start_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: 6,
                      border: '1px solid #cbd5e1',
                      borderRadius: 4,
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ fontSize: 12 }}>
                  <input
                    type="checkbox"
                    checked={sub.cycle_cap !== undefined}
                    onChange={(e) =>
                      updateSub(idx, { cycle_cap: e.target.checked ? 12 : undefined })
                    }
                  />{' '}
                  Cap at N cycles (then auto-cancel)
                </label>
                {sub.cycle_cap !== undefined && (
                  <input
                    type="number"
                    min="1"
                    value={sub.cycle_cap}
                    onChange={(e) =>
                      updateSub(idx, { cycle_cap: parseInt(e.target.value, 10) || 1 })
                    }
                    style={{
                      width: 80,
                      padding: 6,
                      border: '1px solid #cbd5e1',
                      borderRadius: 4,
                      fontSize: 13,
                    }}
                  />
                )}
                <label style={{ fontSize: 12, marginLeft: 'auto' }}>
                  <input
                    type="checkbox"
                    checked={!!sub.already_activated}
                    onChange={(e) => updateSub(idx, { already_activated: e.target.checked })}
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
        </fieldset>

        {/* Payment Plan */}
        <fieldset
          style={{ marginBottom: 24, border: '1px solid #e2e8f0', padding: 16, borderRadius: 8 }}
        >
          <legend style={{ fontWeight: 600, padding: '0 8px' }}>
            Build payment plan · cash to allocate: {fmt(expectedCash)}
          </legend>
          <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => applyPreset('single')}
              style={{
                padding: '6px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                background: '#f4f6f9',
              }}
            >
              Single payment
            </button>
            <button
              type="button"
              onClick={() => applyPreset('two_installments')}
              style={{
                padding: '6px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                background: '#f4f6f9',
              }}
            >
              2 installments (30d)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('three_installments')}
              style={{
                padding: '6px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                background: '#f4f6f9',
              }}
            >
              3 installments (30d/60d)
            </button>
          </div>

          {installments.map((inst, idx) => (
            <div
              key={idx}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                padding: 12,
                marginBottom: 8,
              }}
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
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}
              >
                <div>
                  <label
                    style={{ display: 'block', fontSize: 11, color: '#5d6780', marginBottom: 2 }}
                  >
                    Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={(inst.amount_cents / 100).toFixed(2)}
                    onChange={(e) =>
                      updateInstallment(idx, {
                        amount_cents: Math.round(parseFloat(e.target.value || '0') * 100),
                      })
                    }
                    style={{
                      width: '100%',
                      padding: 6,
                      border: '1px solid #cbd5e1',
                      borderRadius: 4,
                      fontSize: 13,
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{ display: 'block', fontSize: 11, color: '#5d6780', marginBottom: 2 }}
                  >
                    Currency
                  </label>
                  <select
                    value={inst.currency_type}
                    onChange={(e) =>
                      updateInstallment(idx, { currency_type: e.target.value as 'cash' | 'tik' })
                    }
                    style={{
                      width: '100%',
                      padding: 6,
                      border: '1px solid #cbd5e1',
                      borderRadius: 4,
                      fontSize: 13,
                    }}
                  >
                    <option value="cash">Cash</option>
                    <option value="tik">TIK</option>
                  </select>
                </div>
                <div>
                  <label
                    style={{ display: 'block', fontSize: 11, color: '#5d6780', marginBottom: 2 }}
                  >
                    Trigger
                  </label>
                  <select
                    value={inst.trigger_type}
                    onChange={(e) =>
                      updateInstallment(idx, { trigger_type: e.target.value as TriggerType })
                    }
                    style={{
                      width: '100%',
                      padding: 6,
                      border: '1px solid #cbd5e1',
                      borderRadius: 4,
                      fontSize: 13,
                    }}
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
                  <label
                    style={{ display: 'block', fontSize: 11, color: '#5d6780', marginBottom: 2 }}
                  >
                    Trigger date
                  </label>
                  <input
                    type="date"
                    value={inst.trigger_date ?? ''}
                    onChange={(e) => updateInstallment(idx, { trigger_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: 6,
                      border: '1px solid #cbd5e1',
                      borderRadius: 4,
                      fontSize: 13,
                    }}
                  />
                </div>
              )}
              {inst.trigger_type === 'milestone' && (
                <div>
                  <label
                    style={{ display: 'block', fontSize: 11, color: '#5d6780', marginBottom: 2 }}
                  >
                    Milestone (phase)
                  </label>
                  <select
                    value={inst.trigger_milestone_id ?? ''}
                    onChange={(e) =>
                      updateInstallment(idx, { trigger_milestone_id: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: 6,
                      border: '1px solid #cbd5e1',
                      borderRadius: 4,
                      fontSize: 13,
                    }}
                  >
                    <option value="">Select…</option>
                    {sow.phases.map((ph) => (
                      <option key={ph.id} value={ph.id}>
                        {ph.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {inst.trigger_type === 'on_completion_of_payment' && (
                <div>
                  <label
                    style={{ display: 'block', fontSize: 11, color: '#5d6780', marginBottom: 2 }}
                  >
                    Triggered by payment #
                  </label>
                  <select
                    value={inst.trigger_payment_sequence ?? ''}
                    onChange={(e) =>
                      updateInstallment(idx, {
                        trigger_payment_sequence: parseInt(e.target.value, 10),
                      })
                    }
                    style={{
                      width: '100%',
                      padding: 6,
                      border: '1px solid #cbd5e1',
                      borderRadius: 4,
                      fontSize: 13,
                    }}
                  >
                    <option value="">Select…</option>
                    {installments
                      .filter((p) => p.sequence < inst.sequence)
                      .map((p) => (
                        <option key={p.sequence} value={p.sequence}>
                          Payment {p.sequence} ({fmt(p.amount_cents)})
                        </option>
                      ))}
                  </select>
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <label
                  style={{ display: 'block', fontSize: 11, color: '#5d6780', marginBottom: 2 }}
                >
                  Description
                </label>
                <input
                  value={inst.description ?? ''}
                  onChange={(e) => updateInstallment(idx, { description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: 6,
                    border: '1px solid #cbd5e1',
                    borderRadius: 4,
                    fontSize: 13,
                  }}
                />
              </div>
              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: 12 }}>
                  <input
                    type="checkbox"
                    checked={!!inst.already_paid}
                    onChange={(e) =>
                      updateInstallment(idx, {
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
                        updateInstallment(idx, {
                          already_paid: { ...inst.already_paid!, paid_date: e.target.value },
                        })
                      }
                      style={{
                        flex: 1,
                        padding: 6,
                        border: '1px solid #cbd5e1',
                        borderRadius: 4,
                        fontSize: 12,
                      }}
                    />
                    <select
                      value={inst.already_paid.paid_method}
                      onChange={(e) =>
                        updateInstallment(idx, {
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
                      style={{
                        flex: 1,
                        padding: 6,
                        border: '1px solid #cbd5e1',
                        borderRadius: 4,
                        fontSize: 12,
                      }}
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
                        updateInstallment(idx, {
                          already_paid: { ...inst.already_paid!, reference: e.target.value },
                        })
                      }
                      style={{
                        flex: 1,
                        padding: 6,
                        border: '1px solid #cbd5e1',
                        borderRadius: 4,
                        fontSize: 12,
                      }}
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
            {sumOk ? '✓' : '✗'} Allocated {fmt(allocatedCents)} of {fmt(expectedCash)} cash
            {!sumOk && ` — diff ${fmt(expectedCash - allocatedCents)}`}
          </div>
        </fieldset>

        {/* Send invoices */}
        <fieldset
          style={{ marginBottom: 24, border: '1px solid #e2e8f0', padding: 16, borderRadius: 8 }}
        >
          <legend style={{ fontWeight: 600, padding: '0 8px' }}>Delivery</legend>
          <label style={{ fontSize: 13 }}>
            <input
              type="checkbox"
              checked={sendInvoices}
              onChange={(e) => setSendInvoices(e.target.checked)}
            />{' '}
            Send magic-link emails for fired invoices immediately
          </label>
        </fieldset>

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

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
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
      </div>
    </div>
  )

  return createPortal(modalUi, document.body)
}
