'use client'

import { useRouter } from 'next/navigation'
import { Anchor, AlertCircle, CheckCircle } from 'lucide-react'
import { ProspectScoreBadge } from './prospect-score-badge'
import { cn } from '@/lib/utils'

const STAGE_LABELS: Record<string, string> = {
  researched: 'Researched',
  demo_built: 'Demo Built',
  outreach: 'Outreach',
  engaged: 'Engaged',
  meeting: 'Meeting',
  proposal: 'Proposal',
  won: 'Won',
  lost: 'Lost',
}

type WhaleProspect = {
  id: string
  business_name: string
  owner_name: string | null
  industry: string | null
  city: string | null
  stage: string
  prospect_score: number | null
  score_factors: Record<string, any> | null
  research_data: Record<string, any> | null
  tags: string[] | null
  demos?: { id: string }[]
  has_complete_research?: boolean
}

interface WhaleDealsProps {
  whales: WhaleProspect[]
}

export function WhaleDeals({ whales }: WhaleDealsProps) {
  const router = useRouter()

  if (whales.length === 0) {
    return (
      <div className="text-slate-400 text-sm py-4">No whale prospects tagged yet.</div>
    )
  }

  // Group by platt-group tag
  const plattGroup = whales.filter(w => w.tags?.includes('platt-group'))
  const otherWhales = whales.filter(w => !w.tags?.includes('platt-group'))

  return (
    <div className="space-y-3">
      {plattGroup.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Anchor className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">
              Platt Group — {plattGroup.length} Location{plattGroup.length > 1 ? 's' : ''}
            </span>
            {plattGroup[0]?.research_data?.deal_estimate && (
              <span className="ml-auto text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                {plattGroup[0].research_data.deal_estimate}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {plattGroup.map(w => (
              <WhaleRow key={w.id} whale={w} onClick={() => router.push(`/admin/prospects/${w.id}`)} />
            ))}
          </div>
        </div>
      )}

      {otherWhales.map(w => (
        <WhaleRow
          key={w.id}
          whale={w}
          onClick={() => router.push(`/admin/prospects/${w.id}`)}
          standalone
        />
      ))}
    </div>
  )
}

function WhaleRow({ whale: w, onClick, standalone }: { whale: WhaleProspect; onClick: () => void; standalone?: boolean }) {
  const dealEstimate = w.research_data?.deal_estimate
  const demoCount = w.demos?.length ?? 0
  const tier = w.score_factors?.tier || 'bronze'

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:shadow-sm',
        standalone
          ? 'bg-white border border-slate-200 hover:border-slate-300'
          : 'bg-white/60 hover:bg-white'
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-slate-800 text-sm">{w.business_name}</span>
          <ProspectScoreBadge score={w.prospect_score} tier={tier} className="text-[0.65rem]" />
          <span className="text-xs text-slate-400">
            {STAGE_LABELS[w.stage] ?? w.stage}
          </span>
        </div>
        <div className="text-xs text-slate-400 mt-0.5">
          {[w.industry, w.city].filter(Boolean).join(' · ')}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {dealEstimate && (
          <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">
            {dealEstimate}
          </span>
        )}
        {demoCount > 0 ? (
          <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
            {demoCount} demo{demoCount > 1 ? 's' : ''}
          </span>
        ) : null}
        {w.has_complete_research === false ? (
          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded" title="Missing research data — reviews, social, or pitch angle">
            <AlertCircle className="w-3 h-3" />
            Needs Research
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle className="w-3 h-3" />
          </span>
        )}
      </div>
    </div>
  )
}
