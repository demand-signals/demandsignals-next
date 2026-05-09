'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  subscription: {
    id: string
    status: string
    stripe_subscription_id: string | null
    cycle_cap: number | null
    end_date: string | null
    paused_until: string | null
  }
}

export function SubscriptionActionPanel({ subscription }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [pauseDays, setPauseDays] = useState(30)
  const [pauseReason, setPauseReason] = useState('')

  async function handlePause() {
    if (!confirm(`Pause for ${pauseDays} days?`)) return
    setBusy(true)
    const res = await fetch(`/api/admin/subscriptions/${subscription.id}/pause`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ duration_days: pauseDays, reason: pauseReason }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) return alert(`Failed: ${data.error}`)
    alert(`Paused. New end date: ${data.new_end_date ?? '(open-ended)'}`)
    router.refresh()
  }

  async function handleResume() {
    if (!confirm('Resume subscription?')) return
    setBusy(true)
    const res = await fetch(`/api/admin/subscriptions/${subscription.id}/resume`, { method: 'POST' })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) return alert(`Failed: ${data.error}`)
    alert('Resumed.')
    router.refresh()
  }

  async function handlePortalLink() {
    setBusy(true)
    const res = await fetch(
      `/api/admin/subscriptions/${subscription.id}/customer-portal`,
      { method: 'POST' },
    )
    const data = await res.json()
    setBusy(false)
    if (!res.ok) return alert(`Failed: ${data.error}`)
    await navigator.clipboard.writeText(data.url)
    alert(
      `Customer portal link copied to clipboard:\n${data.url}\n\nSend to client to add a payment method.`,
    )
  }

  async function handleRetryStripe() {
    if (!confirm(
      'Retry Stripe subscription creation?\n\nThis will call Stripe with the row\'s current ' +
      'amount/interval/period_start and store the resulting stripe_subscription_id. Use only ' +
      'when the original create failed (e.g. STRIPE ERROR in notes).',
    )) return
    setBusy(true)
    const res = await fetch(
      `/api/admin/subscriptions/${subscription.id}/retry-stripe`,
      { method: 'POST', headers: { 'content-type': 'application/json' } },
    )
    const data = await res.json()
    setBusy(false)
    if (!res.ok) return alert(`Retry failed: ${data.error}`)
    alert(
      `Stripe subscription created.\n\nstripe_subscription_id: ${data.stripe_subscription_id}\nstatus: ${data.status}`,
    )
    router.refresh()
  }

  const isPaused = subscription.status === 'paused'
  const isCanceled = subscription.status === 'canceled'
  const needsStripeRetry = !subscription.stripe_subscription_id && !isCanceled

  return (
    <div
      style={{
        padding: 16,
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        background: '#fafbfc',
      }}
    >
      <h3 style={{ margin: 0, marginBottom: 12, fontSize: 14, fontWeight: 700 }}>Actions</h3>

      {needsStripeRetry && (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            border: '1px solid #fbbf24',
            borderRadius: 6,
            background: '#fef3c7',
          }}
        >
          <p style={{ margin: 0, marginBottom: 8, fontSize: 13, color: '#7c2d12', fontWeight: 600 }}>
            ⚠ No Stripe subscription on this row
          </p>
          <p style={{ margin: 0, marginBottom: 10, fontSize: 12, color: '#78350f', lineHeight: 1.4 }}>
            stripe_subscription_id is null. The original create call likely failed (check Notes).
            Retry the create using the row's current amount/interval/period_start.
          </p>
          <button
            onClick={handleRetryStripe}
            disabled={busy}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              background: '#f28500',
              color: 'white',
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.5 : 1,
            }}
          >
            {busy ? 'Retrying…' : 'Retry Stripe sync'}
          </button>
        </div>
      )}

      {subscription.cycle_cap !== null && (
        <p style={{ fontSize: 13, color: '#5d6780', marginBottom: 12 }}>
          Capped at {subscription.cycle_cap} cycles. End date:{' '}
          {subscription.end_date ? new Date(subscription.end_date).toLocaleDateString() : '—'}
        </p>
      )}

      {isPaused && subscription.paused_until && (
        <p style={{ fontSize: 13, color: '#f28500', marginBottom: 12 }}>
          ⏸ Paused until {new Date(subscription.paused_until).toLocaleDateString()}
        </p>
      )}

      {!isCanceled && (
        <div style={{ marginBottom: 12 }}>
          {isPaused ? (
            <button
              onClick={handleResume}
              disabled={busy}
              style={{
                padding: '8px 16px',
                background: '#16a34a',
                color: '#fff',
                border: 0,
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Resume Subscription
            </button>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 12 }}>Pause for</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={pauseDays}
                  onChange={(e) => setPauseDays(parseInt(e.target.value, 10) || 30)}
                  style={{
                    width: 70,
                    padding: 4,
                    border: '1px solid #cbd5e1',
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                />
                <label style={{ fontSize: 12 }}>days</label>
                <input
                  value={pauseReason}
                  placeholder="Reason (optional)"
                  onChange={(e) => setPauseReason(e.target.value)}
                  style={{
                    flex: 1,
                    padding: 4,
                    border: '1px solid #cbd5e1',
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                />
              </div>
              <button
                onClick={handlePause}
                disabled={busy}
                style={{
                  padding: '8px 16px',
                  background: '#f28500',
                  color: '#fff',
                  border: 0,
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Pause Subscription
              </button>
            </div>
          )}
        </div>
      )}

      {subscription.stripe_subscription_id && !isCanceled && (
        <button
          onClick={handlePortalLink}
          disabled={busy}
          style={{
            padding: '8px 16px',
            background: '#68c5ad',
            color: '#fff',
            border: 0,
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Generate &ldquo;Add Payment Method&rdquo; link
        </button>
      )}
    </div>
  )
}
