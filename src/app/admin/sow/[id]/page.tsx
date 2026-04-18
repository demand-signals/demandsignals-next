'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ExternalLink, Copy } from 'lucide-react'

interface SowDetail {
  sow: {
    id: string
    sow_number: string
    public_uuid: string
    status: string
    title: string
    scope_summary: string | null
    deliverables: Array<{ name: string; description: string; acceptance_criteria?: string }>
    timeline: Array<{ name: string; duration_weeks: number; description: string }>
    pricing: { total_cents: number; deposit_cents: number; deposit_pct: number }
    payment_terms: string | null
    guarantees: string | null
    notes: string | null
    sent_at: string | null
    viewed_at: string | null
    accepted_at: string | null
    accepted_signature: string | null
    deposit_invoice_id: string | null
    prospect: { business_name: string; owner_email: string | null } | null
    deposit_invoice: { invoice_number: string; total_due_cents: number; status: string } | null
  }
}

export default function SowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [detail, setDetail] = useState<SowDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [sentModalUrl, setSentModalUrl] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/admin/sow/${id}`)
    const data = await res.json()
    if (res.ok) setDetail(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [id])

  async function send() {
    setBusy(true)
    const res = await fetch(`/api/admin/sow/${id}/send`, { method: 'POST' })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) {
      alert(data.error)
      return
    }
    setSentModalUrl(data.public_url)
    load()
  }

  async function deleteDraft() {
    if (!confirm('Delete this draft?')) return
    setBusy(true)
    await fetch(`/api/admin/sow/${id}`, { method: 'DELETE' })
    router.push('/admin/sow')
  }

  if (loading)
    return (
      <div className="flex justify-center p-16">
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    )
  if (!detail) return <div className="p-6">Not found</div>

  const { sow } = detail
  const publicUrl = `https://demandsignals.co/sow/${sow.sow_number}/${sow.public_uuid}`

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <Link href="/admin/sow" className="text-sm text-teal-600">
        ← All SOWs
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{sow.title}</h1>
          <div className="font-mono text-sm text-slate-500 mt-1">{sow.sow_number}</div>
          <div className="text-sm text-slate-600 mt-1">
            {sow.prospect?.business_name ?? '—'} · Status:{' '}
            <span className="font-semibold">{sow.status}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {sow.status === 'draft' && (
            <>
              <button onClick={deleteDraft} disabled={busy} className="bg-red-100 text-red-700 rounded px-3 py-1.5 text-sm">
                Delete
              </button>
              <button onClick={send} disabled={busy} className="bg-teal-500 text-white rounded px-4 py-1.5 text-sm font-semibold">
                Send
              </button>
            </>
          )}
          {sow.status !== 'draft' && (
            <a
              href={`/api/admin/sow/${id}/pdf`}
              target="_blank"
              rel="noopener"
              className="bg-slate-100 rounded px-3 py-1.5 text-sm inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" /> PDF
            </a>
          )}
          {sow.status !== 'draft' && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener"
              className="bg-blue-100 text-blue-700 rounded px-3 py-1.5 text-sm inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Client view
            </a>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 text-sm">
        <div>
          <div className="text-xs uppercase text-slate-500 mb-1">Scope</div>
          <div>{sow.scope_summary ?? '—'}</div>
        </div>

        <div>
          <div className="text-xs uppercase text-slate-500 mb-1">
            Deliverables ({sow.deliverables.length})
          </div>
          <ul className="space-y-1">
            {sow.deliverables.map((d, i) => (
              <li key={i} className="text-sm">
                <b>{d.name}</b> — {d.description}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-xs uppercase text-slate-500 mb-1">Timeline</div>
          <ul className="space-y-1">
            {sow.timeline.map((p, i) => (
              <li key={i} className="text-sm">
                <b>{p.name}</b> ({p.duration_weeks}w) — {p.description}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-xs uppercase text-slate-500 mb-1">Pricing</div>
          <div>
            Total: ${(sow.pricing.total_cents / 100).toFixed(2)} · Deposit ({sow.pricing.deposit_pct}%):
            ${(sow.pricing.deposit_cents / 100).toFixed(2)}
          </div>
        </div>

        {sow.accepted_at && sow.accepted_signature && (
          <div className="bg-emerald-50 border border-emerald-200 rounded p-3">
            <div className="text-xs uppercase text-emerald-900 font-semibold">Accepted</div>
            <div>
              {sow.accepted_signature} on {new Date(sow.accepted_at).toLocaleString()}
            </div>
            {detail.sow.deposit_invoice && (
              <div className="mt-2 text-sm">
                Deposit invoice:{' '}
                <Link
                  href={`/admin/invoices/${sow.deposit_invoice_id}`}
                  className="text-teal-600 hover:underline font-mono"
                >
                  {detail.sow.deposit_invoice.invoice_number}
                </Link>{' '}
                — ${(detail.sow.deposit_invoice.total_due_cents / 100).toFixed(2)} ·{' '}
                {detail.sow.deposit_invoice.status}
              </div>
            )}
          </div>
        )}
      </div>

      {sentModalUrl && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full space-y-4">
            <h2 className="text-lg font-bold">SOW sent</h2>
            <p className="text-sm text-slate-600">
              Share this URL with the prospect. They can review, download PDF, and click Accept.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded p-2 flex items-center gap-2">
              <code className="flex-1 text-xs truncate">{sentModalUrl}</code>
              <button
                onClick={() => navigator.clipboard.writeText(sentModalUrl)}
                className="text-teal-600 hover:text-teal-700"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setSentModalUrl(null)}
                className="bg-teal-500 text-white rounded-lg px-4 py-2 font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
