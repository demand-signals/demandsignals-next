'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ExternalLink, Copy, Pencil, Eye, EyeOff } from 'lucide-react'
import { formatCents } from '@/lib/quote-engine'
import DocumentPreview from '@/components/admin/DocumentPreview'
import EditClient from './EditClient'

interface SowDetail {
  sow: {
    id: string
    sow_number: string
    public_uuid: string
    status: string
    title: string
    scope_summary: string | null
    deliverables: Array<{
      name: string
      description: string
      acceptance_criteria?: string
      quantity?: number
      hours?: number
      unit_price_cents?: number
      line_total_cents?: number
    }>
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
    prospect: {
      business_name: string
      owner_name: string | null
      owner_email: string | null
      business_email: string | null
      owner_phone: string | null
      business_phone: string | null
      address: string | null
      city: string | null
      state: string | null
      zip: string | null
    } | null
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
  const [editing, setEditing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

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
  const p = sow.prospect

  // Sum priced deliverables
  const deliverablesTotalCents = sow.deliverables.reduce((s, d) => s + (d.line_total_cents ?? 0), 0)

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <Link href="/admin/sow" className="text-sm text-teal-600">
        ← All SOWs
      </Link>

      {/* Header row */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{sow.title}</h1>
          <div className="font-mono text-sm text-slate-500 mt-1">{sow.sow_number}</div>
          <div className="text-sm text-slate-600 mt-1">
            {sow.prospect?.business_name ?? '—'} · Status:{' '}
            <span className="font-semibold">{sow.status}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          {/* Edit button — always shown */}
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="bg-slate-100 hover:bg-slate-200 rounded px-3 py-1.5 text-sm inline-flex items-center gap-1"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          )}

          {/* Preview toggle — always shown */}
          <button
            onClick={() => setShowPreview((v) => !v)}
            className="bg-slate-100 hover:bg-slate-200 rounded px-3 py-1.5 text-sm inline-flex items-center gap-1"
          >
            {showPreview ? (
              <>
                <EyeOff className="w-3.5 h-3.5" /> Hide preview
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" /> Preview
              </>
            )}
          </button>

          {/* PDF — always visible */}
          <a
            href={`/api/admin/sow/${id}/pdf`}
            target="_blank"
            rel="noopener"
            className="bg-slate-100 rounded px-3 py-1.5 text-sm inline-flex items-center gap-1"
          >
            <ExternalLink className="w-3.5 h-3.5" /> PDF
          </a>

          {/* Draft-only actions */}
          {sow.status === 'draft' && (
            <>
              <button
                onClick={deleteDraft}
                disabled={busy}
                className="bg-red-100 text-red-700 rounded px-3 py-1.5 text-sm"
              >
                Delete
              </button>
              <button
                onClick={send}
                disabled={busy}
                className="bg-teal-500 text-white rounded px-4 py-1.5 text-sm font-semibold"
              >
                Send
              </button>
            </>
          )}

          {/* Client view — non-draft only */}
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

      {/* Edit form */}
      {editing && (
        <div className="bg-white border border-teal-200 rounded-xl p-5">
          <div className="text-sm font-semibold text-teal-700 mb-4">Editing SOW</div>
          <EditClient
            sow={sow}
            onSaved={async () => {
              setEditing(false)
              await load()
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}

      {/* Read view — shown when not editing */}
      {!editing && (
        <>
          {/* Client info card */}
          {p && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm space-y-1">
              <div className="text-xs uppercase text-slate-500 mb-2">Client</div>
              {p.business_name && <div className="font-bold">{p.business_name}</div>}
              {p.owner_name && <div>{p.owner_name}</div>}
              {(p.owner_email ?? p.business_email) && (
                <div>
                  <a
                    href={`mailto:${p.owner_email ?? p.business_email}`}
                    className="text-teal-600 hover:underline"
                  >
                    {p.owner_email ?? p.business_email}
                  </a>
                </div>
              )}
              {(p.owner_phone ?? p.business_phone) && (
                <div>{p.owner_phone ?? p.business_phone}</div>
              )}
              {(p.address || p.city) && (
                <div className="text-slate-500">
                  {[p.address, p.city, p.state, p.zip].filter(Boolean).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Main SOW detail card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 text-sm">
            {/* Scope */}
            <div>
              <div className="text-xs uppercase text-slate-500 mb-1">Scope</div>
              <div>{sow.scope_summary ?? '—'}</div>
            </div>

            {/* Deliverables */}
            <div>
              <div className="text-xs uppercase text-slate-500 mb-1">
                Deliverables ({sow.deliverables.length})
              </div>
              <ul className="space-y-2">
                {sow.deliverables.map((d, i) => {
                  const hasPricing = (d.unit_price_cents ?? 0) > 0
                  const qty = d.hours ?? d.quantity ?? 1
                  const label = d.hours != null ? `${d.hours} hrs` : `${d.quantity ?? 1}×`
                  return (
                    <li key={i}>
                      <div>
                        <b>{d.name}</b> — {d.description}
                      </div>
                      {hasPricing && d.unit_price_cents != null && d.line_total_cents != null && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          {label} × {formatCents(d.unit_price_cents)} ={' '}
                          <span className="font-semibold text-slate-700">
                            {formatCents(d.line_total_cents)}
                          </span>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
              {deliverablesTotalCents > 0 && (
                <div className="mt-2 text-xs text-slate-500">
                  Deliverables total:{' '}
                  <span className="font-semibold text-slate-700">
                    {formatCents(deliverablesTotalCents)}
                  </span>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div>
              <div className="text-xs uppercase text-slate-500 mb-1">Timeline</div>
              <ul className="space-y-1">
                {sow.timeline.map((ph, i) => (
                  <li key={i}>
                    <b>{ph.name}</b> ({ph.duration_weeks}w) — {ph.description}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pricing */}
            <div>
              <div className="text-xs uppercase text-slate-500 mb-1">Pricing</div>
              <div>
                Total: {formatCents(sow.pricing.total_cents)} · Deposit ({sow.pricing.deposit_pct}%):{' '}
                {formatCents(sow.pricing.deposit_cents)}
              </div>
            </div>

            {/* Payment terms */}
            {sow.payment_terms && (
              <div>
                <div className="text-xs uppercase text-slate-500 mb-1">Payment terms</div>
                <div>{sow.payment_terms}</div>
              </div>
            )}

            {/* Guarantees */}
            {sow.guarantees && (
              <div>
                <div className="text-xs uppercase text-slate-500 mb-1">Guarantees</div>
                <div>{sow.guarantees}</div>
              </div>
            )}

            {/* Notes */}
            {sow.notes && (
              <div>
                <div className="text-xs uppercase text-slate-500 mb-1">Notes</div>
                <div>{sow.notes}</div>
              </div>
            )}

            {/* Accepted block */}
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
                    — {formatCents(detail.sow.deposit_invoice.total_due_cents)} ·{' '}
                    {detail.sow.deposit_invoice.status}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* HTML preview */}
      {showPreview && (
        <DocumentPreview
          src={`/api/admin/sow/${id}/preview`}
          title={sow.title}
        />
      )}

      {/* Sent modal */}
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
