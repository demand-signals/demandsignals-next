import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Mail } from 'lucide-react'
import { getProspectById } from '@/lib/portal-data'
import { resolvePortalContext } from '@/lib/portal-session'

// Read-only account info. v1 has no edit-account. "Request a change"
// button below opens an email to admin.
//
// Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §13
// Plan: docs/superpowers/plans/2026-05-07-client-portal-v1-plan.md Task 9.2

export const dynamic = 'force-dynamic'

export default async function PortalAccountPage() {
  const cookieStore = await cookies()
  const overrideProspectId = cookieStore.get('dsig_portal_view_as')?.value ?? null
  const ctx = await resolvePortalContext(overrideProspectId)
  if (!ctx) redirect('/admin-login')
  const prospect = await getProspectById(ctx.prospectId)
  if (!prospect) redirect('/admin-login')

  const requestEmail = `mailto:DemandSignals@gmail.com?subject=${encodeURIComponent(
    `Account update request${prospect.client_code ? ` — ${prospect.client_code}` : ''}`,
  )}`

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Account</h1>
          <p className="text-sm text-slate-500 mt-1">Your contact and business information on file.</p>
        </div>
        <a
          href={requestEmail}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
        >
          <Mail className="w-4 h-4" />
          Request a change
        </a>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        <Row label="Business name" value={prospect.business_name} />
        <Row label="Owner" value={prospect.owner_name} />
        <Row label="Email" value={prospect.owner_email} />
        <Row label="Owner phone" value={prospect.owner_phone} />
        <Row label="Business phone" value={prospect.business_phone} />
        <Row label="Website" value={prospect.website_url} link />
        <Row label="Address" value={prospect.address} />
        <Row
          label="City / State / ZIP"
          value={[prospect.city, prospect.state, prospect.zip].filter(Boolean).join(', ') || null}
        />
        {prospect.country && prospect.country !== 'US' && (
          <Row label="Country" value={prospect.country} />
        )}
        {prospect.client_code && (
          <Row label="Client code" value={prospect.client_code} mono />
        )}
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  link = false,
  mono = false,
}: {
  label: string
  value: string | null
  link?: boolean
  mono?: boolean
}) {
  return (
    <div className="px-5 py-3.5 grid grid-cols-3 gap-4">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
      <div className={`col-span-2 text-sm ${mono ? 'font-mono text-slate-700' : 'text-slate-900'}`}>
        {value ? (
          link ? (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 hover:underline"
            >
              {value}
            </a>
          ) : (
            value
          )
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </div>
    </div>
  )
}
