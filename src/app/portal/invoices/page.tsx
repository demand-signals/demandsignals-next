import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getInvoicesForProspect } from '@/lib/portal-data'
import { resolvePortalContext } from '@/lib/portal-session'
import { formatCents } from '@/lib/format'

// Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §13
// Plan: docs/superpowers/plans/2026-05-07-client-portal-v1-plan.md Task 9.3

export const dynamic = 'force-dynamic'

const STATUS_TINTS: Record<string, string> = {
  paid:   'bg-emerald-50 text-emerald-700',
  sent:   'bg-amber-50 text-amber-700',
  viewed: 'bg-amber-50 text-amber-700',
  draft:  'bg-slate-50 text-slate-500',
  void:   'bg-slate-50 text-slate-400',
}

function shortDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function PortalInvoicesPage() {
  const cookieStore = await cookies()
  const overrideProspectId = cookieStore.get('dsig_portal_view_as')?.value ?? null
  const ctx = await resolvePortalContext(overrideProspectId)
  if (!ctx) redirect('/admin-login')

  const invoices = await getInvoicesForProspect(ctx.prospectId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
        <p className="text-sm text-slate-500 mt-1">Every invoice issued to your account.</p>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
          No invoices yet.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left px-5 py-3">Number</th>
                <th className="text-left px-5 py-3">Issued</th>
                <th className="text-left px-5 py-3">Due</th>
                <th className="text-right px-5 py-3">Amount</th>
                <th className="text-right px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/portal/invoices/${inv.invoice_number}`}
                      className="font-medium text-teal-600 hover:underline"
                    >
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{shortDate(inv.issued_at ?? inv.created_at)}</td>
                  <td className="px-5 py-3.5 text-slate-600">{shortDate(inv.due_at)}</td>
                  <td className="px-5 py-3.5 text-right font-medium tabular-nums text-slate-900">
                    {formatCents(inv.total_due_cents)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] uppercase tracking-wide font-medium ${
                        STATUS_TINTS[inv.status] ?? 'bg-slate-50 text-slate-500'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
