'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface InstallmentRow {
  id: string
  sequence: number
  amount_cents: number
  amount_paid_cents: number
  currency_type: string
  trigger_type: string
  trigger_date: string | null
  status: string
  description: string | null
  invoice: { invoice_number: string; public_uuid: string; status: string } | null
}

interface TikRow {
  id: string
  original_amount_cents: number
  remaining_cents: number
  description: string
  status: string
}

interface Props {
  projectId: string
  prospectId: string
}

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`

export function OutstandingObligations({ projectId, prospectId }: Props) {
  const [installments, setInstallments] = useState<InstallmentRow[]>([])
  const [tradeCredits, setTradeCredits] = useState<TikRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await fetch(`/api/admin/projects/${projectId}/obligations`)
        if (cancelled) return
        if (r.ok) {
          const data = await r.json()
          setInstallments(data.installments ?? [])
          setTradeCredits(data.trade_credits ?? [])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [projectId, prospectId])

  if (loading) return null

  const pendingCash = installments.filter(
    (i) => i.currency_type === 'cash' && i.status !== 'paid' && i.status !== 'cancelled',
  )
  const openTik = tradeCredits.filter((tc) => ['outstanding', 'partial'].includes(tc.status))

  if (pendingCash.length === 0 && openTik.length === 0) {
    return (
      <section
        style={{
          margin: '24px 0',
          padding: 16,
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          background: '#fafbfc',
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Outstanding Obligations</h2>
        <p style={{ fontSize: 13, color: '#5d6780', margin: 0 }}>None.</p>
      </section>
    )
  }

  return (
    <section
      style={{
        margin: '24px 0',
        padding: 16,
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        background: '#fafbfc',
      }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Outstanding Obligations</h2>

      {pendingCash.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Pending cash payments</h3>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
            {pendingCash.map((i) => (
              <li key={i.id} style={{ marginBottom: 4 }}>
                #{i.sequence} — {fmt(i.amount_cents)}
                {i.trigger_type === 'time' && ` · due ${i.trigger_date}`}
                {i.trigger_type === 'milestone' && ` · on milestone`}
                {i.trigger_type === 'on_completion_of_payment' && ` · after another payment`}
                {i.trigger_type === 'on_acceptance' && ` · on acceptance`}
                {' · '}status: <strong>{i.status}</strong>
                {i.invoice && (
                  <>
                    {' · '}
                    <Link
                      href={`/invoice/${i.invoice.invoice_number}/${i.invoice.public_uuid}`}
                      target="_blank"
                    >
                      {i.invoice.invoice_number}
                    </Link>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {openTik.length > 0 && (
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            Trade-in-Kind (services owed by client)
          </h3>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
            {openTik.map((tc) => (
              <li key={tc.id} style={{ marginBottom: 4 }}>
                <Link href={`/admin/trade-credits/${tc.id}`}>
                  {fmt(tc.remaining_cents)} remaining of {fmt(tc.original_amount_cents)}
                </Link>{' '}
                · {tc.description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
