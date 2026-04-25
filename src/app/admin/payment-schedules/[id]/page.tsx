// ── /admin/payment-schedules/[id] ──────────────────────────────────
// Read-only view of a payment schedule + installments.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { formatCents } from '@/lib/format'

export default async function PaymentSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: schedule } = await supabaseAdmin
    .from('payment_schedules')
    .select('*, sow:sow_documents(sow_number, title, id), project:projects(id, name)')
    .eq('id', id)
    .single()

  if (!schedule) notFound()

  const { data: installments } = await supabaseAdmin
    .from('payment_installments')
    .select('*, invoice:invoices!payment_installments_invoice_id_fkey(invoice_number, status, public_uuid, total_due_cents)')
    .eq('schedule_id', id)
    .order('sequence', { ascending: true })

  const sow = schedule.sow as { sow_number: string; title: string; id: string } | null
  const project = schedule.project as { id: string; name: string } | null

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Payment Schedule</h1>
      <p style={{ color: '#5d6780', marginBottom: 16 }}>
        {sow && (
          <span>
            SOW <Link href={`/admin/sow/${sow.id}`}>{sow.sow_number}</Link> — {sow.title}.{' '}
          </span>
        )}
        {project && (
          <span>
            Project: <Link href={`/admin/projects/${project.id}`}>{project.name}</Link>.{' '}
          </span>
        )}
        Total: {formatCents(schedule.total_cents)}.
        {schedule.locked_at && (
          <span style={{ color: '#dc2626' }}> 🔒 Locked (payment received)</span>
        )}
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 16 }}>
        <thead>
          <tr style={{ background: '#f4f6f9', textAlign: 'left' }}>
            <th style={{ padding: 10 }}>#</th>
            <th style={{ padding: 10 }}>Amount</th>
            <th style={{ padding: 10 }}>Currency</th>
            <th style={{ padding: 10 }}>Trigger</th>
            <th style={{ padding: 10 }}>Status</th>
            <th style={{ padding: 10 }}>Invoice</th>
            <th style={{ padding: 10 }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {(installments ?? []).map((inst) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const i = inst as any
            return (
              <tr key={i.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: 10 }}>{i.sequence}</td>
                <td style={{ padding: 10 }}>
                  {formatCents(i.amount_cents)}
                  {i.amount_paid_cents > 0 && i.amount_paid_cents < i.amount_cents && (
                    <span style={{ color: '#f28500', fontSize: 11, display: 'block' }}>
                      ({formatCents(i.amount_paid_cents)} paid)
                    </span>
                  )}
                </td>
                <td style={{ padding: 10 }}>{i.currency_type}</td>
                <td style={{ padding: 10 }}>
                  {i.trigger_type}
                  {i.trigger_date && (
                    <div style={{ fontSize: 11, color: '#5d6780' }}>{i.trigger_date}</div>
                  )}
                </td>
                <td style={{ padding: 10 }}>{i.status}</td>
                <td style={{ padding: 10 }}>
                  {i.invoice ? (
                    <Link
                      href={`/invoice/${i.invoice.invoice_number}/${i.invoice.public_uuid}`}
                      target="_blank"
                    >
                      {i.invoice.invoice_number}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td style={{ padding: 10 }}>{i.description ?? '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
