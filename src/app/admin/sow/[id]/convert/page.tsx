// ── /admin/sow/[id]/convert ─────────────────────────────────────────
// Dedicated page for SOW → Project conversion. Replaces the previous
// modal which was closing on every state change (parent re-renders).

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { SowPhase } from '@/lib/invoice-types'
import { ConvertForm } from './ConvertForm'

export default async function ConvertSowPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: sow } = await supabaseAdmin
    .from('sow_documents')
    .select('id, sow_number, title, status, pricing, trade_credit_cents, trade_credit_description, phases')
    .eq('id', id)
    .maybeSingle()

  if (!sow) notFound()

  const phases = (sow.phases ?? []) as SowPhase[]
  const totalCents = (sow.pricing as { total_cents?: number } | null)?.total_cents ?? 0
  const tikCents = sow.trade_credit_cents ?? 0

  const recurringDeliverables = phases.flatMap((p) =>
    (p.deliverables ?? [])
      .filter((d) => ['monthly', 'quarterly', 'annual'].includes(d.cadence))
      .map((d) => ({
        id: d.id,
        name: d.name,
        monthly_cents:
          (d.unit_price_cents ?? 0) * (((d.hours ?? d.quantity ?? 1) as number) || 1),
        cadence: d.cadence as 'monthly' | 'quarterly' | 'annual',
      })),
  )

  return (
    <div style={{ padding: '24px 32px', maxWidth: 920, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <Link href={`/admin/sow/${id}`} style={{ fontSize: 13, color: '#68c5ad' }}>
          ← Back to SOW {sow.sow_number}
        </Link>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        Convert SOW {sow.sow_number} to Project
      </h1>
      <p style={{ color: '#5d6780', marginBottom: 24, fontSize: 14 }}>
        {sow.title} · Total: ${(totalCents / 100).toFixed(2)} · Status: {sow.status}
      </p>

      <ConvertForm
        sow={{
          id: sow.id,
          sow_number: sow.sow_number,
          title: sow.title,
          status: sow.status,
          total_cents: totalCents,
          trade_credit_cents: tikCents,
          trade_credit_description: sow.trade_credit_description ?? null,
          phases: phases.map((p) => ({ id: p.id, name: p.name })),
          recurring_deliverables: recurringDeliverables,
        }}
      />
    </div>
  )
}
