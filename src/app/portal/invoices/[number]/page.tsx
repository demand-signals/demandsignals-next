import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { getInvoiceByNumberForProspect } from '@/lib/portal-data'
import { resolvePortalContext } from '@/lib/portal-session'
import { formatCents } from '@/lib/format'

// Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §13
// Plan: docs/superpowers/plans/2026-05-07-client-portal-v1-plan.md Task 9.4

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ number: string }>
}

const PAYABLE_STATUSES = new Set(['sent', 'viewed'])

function shortDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const STATUS_TINTS: Record<string, string> = {
  paid:   'bg-emerald-50 text-emerald-700',
  sent:   'bg-amber-50 text-amber-700',
  viewed: 'bg-amber-50 text-amber-700',
  draft:  'bg-slate-50 text-slate-500',
  void:   'bg-slate-50 text-slate-400',
}

export default async function PortalInvoiceDetailPage({ params }: PageProps) {
  const cookieStore = await cookies()
  const overrideProspectId = cookieStore.get('dsig_portal_view_as')?.value ?? null
  const ctx = await resolvePortalContext(overrideProspectId)
  if (!ctx) redirect('/login')

  const { number } = await params
  const invoice = await getInvoiceByNumberForProspect(ctx.prospectId, number)
  if (!invoice) notFound()

  const isPayable = PAYABLE_STATUSES.has(invoice.status) && invoice.total_due_cents > 0

  return (
    <div className="space-y-6">
      <Link
        href="/portal/invoices"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> All invoices
      </Link>

      <div className="bg-white border border-slate-200 rounded-xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Invoice</div>
            <h1 className="text-xl font-bold text-slate-900">{invoice.invoice_number}</h1>
            <div className="text-xs text-slate-400 mt-1">
              Issued {shortDate(invoice.issued_at ?? invoice.created_at)}
              {invoice.due_at && <> · Due {shortDate(invoice.due_at)}</>}
            </div>
          </div>
          <span
            className={`inline-block px-2.5 py-1 rounded text-[11px] uppercase tracking-wide font-medium ${
              STATUS_TINTS[invoice.status] ?? 'bg-slate-50 text-slate-500'
            }`}
          >
            {invoice.status}
          </span>
        </div>

        {/* Line items */}
        <div className="px-6 py-5">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left pb-2">Item</th>
                <th className="text-right pb-2">Qty</th>
                <th className="text-right pb-2">Unit</th>
                <th className="text-right pb-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.line_items.map((it) => (
                <tr key={it.id} className="border-t border-slate-100">
                  <td className="py-2.5 pr-2">
                    <div className="text-slate-900">{it.description ?? '—'}</div>
                    {it.cadence && it.cadence !== 'one_time' && (
                      <div className="text-[11px] uppercase tracking-wide text-slate-400 mt-0.5">
                        {it.cadence}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 text-right text-slate-600 tabular-nums">{it.quantity ?? 1}</td>
                  <td className="py-2.5 text-right text-slate-600 tabular-nums">
                    {it.unit_amount_cents != null ? formatCents(it.unit_amount_cents) : '—'}
                  </td>
                  <td className="py-2.5 text-right font-medium text-slate-900 tabular-nums">
                    {it.amount_cents != null ? formatCents(it.amount_cents) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-6 pb-5 flex justify-end">
          <div className="w-full max-w-xs space-y-1.5 text-sm">
            {invoice.subtotal_cents != null && (
              <Total label="Subtotal" value={invoice.subtotal_cents} />
            )}
            {invoice.discount_cents != null && invoice.discount_cents !== 0 && (
              <Total label="Discount" value={-invoice.discount_cents} />
            )}
            {invoice.tax_cents != null && invoice.tax_cents !== 0 && (
              <Total label="Tax" value={invoice.tax_cents} />
            )}
            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
              <span>Total due</span>
              <span className="tabular-nums">{formatCents(invoice.total_due_cents)}</span>
            </div>
            {invoice.amount_paid_cents != null && invoice.amount_paid_cents > 0 && (
              <div className="text-xs text-emerald-700 flex justify-between pt-1">
                <span>Paid to date</span>
                <span className="tabular-nums">{formatCents(invoice.amount_paid_cents)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment terms */}
        {invoice.payment_terms && (
          <div className="px-6 pb-5">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Payment terms
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {invoice.payment_terms}
            </p>
          </div>
        )}

        {/* Pay CTA */}
        {isPayable && (
          <div className="px-6 py-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4 rounded-b-xl">
            <div>
              <div className="text-xs text-slate-500">Outstanding balance</div>
              <div className="text-lg font-bold text-slate-900 tabular-nums">
                {formatCents(invoice.total_due_cents)}
              </div>
            </div>
            <a
              href={`/api/portal/invoices/${invoice.invoice_number}/pay`}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[var(--teal)] text-white text-sm font-semibold hover:bg-[var(--teal-dark)]"
            >
              Pay now
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span>
      <span className="tabular-nums">{formatCents(value)}</span>
    </div>
  )
}
