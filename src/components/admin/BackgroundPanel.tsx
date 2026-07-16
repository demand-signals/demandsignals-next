'use client'

// ── BackgroundPanel ──────────────────────────────────────────────────
// Collapsible acquisition/background summary for a client — the key
// prospect intel (scores, ratings, research summary) inline, so you don't
// have to click through to the full prospect view. Links to the full view
// for the complete picture.

import { useEffect, useState } from 'react'
import { Loader2, ChevronDown, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface ProspectIntel {
  industry: string | null
  google_rating: number | null
  yelp_rating: number | null
  site_quality_score: number | null
  prospect_score: number | null
  research_completed_at: string | null
  research_data: unknown
}

export function BackgroundPanel({ prospectId }: { prospectId: string }) {
  const [p, setP] = useState<ProspectIntel | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/prospects/${prospectId}`)
      .then((r) => r.json())
      .then((d) => setP((d.prospect ?? d.data ?? d) as ProspectIntel))
      .finally(() => setLoading(false))
  }, [prospectId])

  const researchSummary = (() => {
    const rd = p?.research_data
    if (!rd || typeof rd !== 'object') return null
    const obj = rd as Record<string, unknown>
    const s = obj.summary ?? obj.overview ?? obj.description
    return typeof s === 'string' ? s : null
  })()

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 select-none">
        <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">Background</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </summary>

      <div className="px-4 pb-4 text-sm">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-teal-500" />
        ) : !p ? (
          <p className="text-slate-400">No background data.</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {p.industry && (<><span className="text-slate-400">Industry</span><span className="text-slate-700">{p.industry}</span></>)}
              {p.prospect_score != null && (<><span className="text-slate-400">Prospect score</span><span className="text-slate-700">{p.prospect_score}</span></>)}
              {p.google_rating != null && (<><span className="text-slate-400">Google rating</span><span className="text-slate-700">{p.google_rating} ★</span></>)}
              {p.yelp_rating != null && (<><span className="text-slate-400">Yelp rating</span><span className="text-slate-700">{p.yelp_rating} ★</span></>)}
              {p.site_quality_score != null && (<><span className="text-slate-400">Site quality</span><span className="text-slate-700">{p.site_quality_score}</span></>)}
            </div>
            {researchSummary && (
              <p className="text-xs leading-relaxed text-slate-600">{researchSummary.slice(0, 400)}{researchSummary.length > 400 ? '…' : ''}</p>
            )}
            <Link href={`/admin/prospects/${prospectId}?keepView=1`} className="inline-flex items-center gap-1 text-xs text-teal-600 hover:underline">
              Open full prospect view <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>
    </details>
  )
}
