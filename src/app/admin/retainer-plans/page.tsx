import Link from 'next/link'
import { getRetainerPlans } from '@/lib/retainer'
import { formatCents } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function RetainerPlansPage() {
  const plans = await getRetainerPlans()

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Retainer Plans</h1>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="text-left px-4 py-3">Tier</th>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Items</th>
              <th className="text-right px-4 py-3">Monthly (min)</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => {
              const monthlyMinCents = p.items.reduce(
                (s, i) => s + i.monthly_cents * i.quantity,
                0
              )
              return (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 capitalize text-slate-700">{p.tier.replace('_', ' ')}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/retainer-plans/${p.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.items.length}</td>
                  <td className="px-4 py-3 text-right text-slate-700 font-medium">
                    {monthlyMinCents === 0 ? '—' : formatCents(monthlyMinCents)}
                  </td>
                </tr>
              )
            })}
            {plans.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400">
                  No retainer plans found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
