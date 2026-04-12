'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Mail, Phone, Copy, Check, ArrowRight } from 'lucide-react'
import { ProspectScoreBadge, TierBadge } from './prospect-score-badge'
import { cn } from '@/lib/utils'

type PriorityProspect = {
  id: string
  business_name: string
  owner_name: string | null
  owner_email: string | null
  owner_phone: string | null
  business_email: string | null
  business_phone: string | null
  industry: string | null
  city: string | null
  stage: string
  prospect_score: number | null
  score_factors: Record<string, any> | null
  research_data: Record<string, any> | null
  demos?: { id: string; demo_url: string | null; status: string }[]
  deals?: { id: string; value_estimate: number | null; stage: string }[]
}

interface PriorityQueueProps {
  prospects: PriorityProspect[]
  onStartOutreach?: (id: string) => void
}

export function PriorityQueue({ prospects, onStartOutreach }: PriorityQueueProps) {
  const router = useRouter()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function copyPitch(id: string, pitch: string) {
    navigator.clipboard.writeText(pitch)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const email = (p: PriorityProspect) => p.owner_email || p.business_email
  const phone = (p: PriorityProspect) => p.owner_phone || p.business_phone

  if (prospects.length === 0) {
    return (
      <div className="text-slate-400 text-sm py-4">No priority prospects right now.</div>
    )
  }

  return (
    <div className="space-y-3">
      {prospects.slice(0, 5).map((p, i) => {
        const pitch = p.research_data?.pitch_angle || ''
        const tier = p.score_factors?.tier || 'bronze'
        const demoCount = p.demos?.length ?? 0

        return (
          <div
            key={p.id}
            className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer"
            onClick={() => router.push(`/admin/prospects/${p.id}`)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 truncate">{p.business_name}</span>
                    <TierBadge tier={tier} />
                    {demoCount > 0 && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                        {demoCount} demo{demoCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {[p.industry, p.city].filter(Boolean).join(' · ')}
                    {p.owner_name && ` · ${p.owner_name}`}
                  </div>
                </div>
              </div>
              <ProspectScoreBadge score={p.prospect_score} tier={tier} />
            </div>

            {pitch && (
              <p className="text-sm text-slate-500 mt-2 line-clamp-2 italic">
                &ldquo;{pitch}&rdquo;
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3" onClick={e => e.stopPropagation()}>
              {p.stage !== 'outreach' && p.stage !== 'engaged' && p.stage !== 'meeting' && p.stage !== 'proposal' && p.stage !== 'won' && onStartOutreach && (
                <button
                  onClick={() => onStartOutreach(p.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#68c5ad] text-white text-xs font-medium rounded-lg hover:bg-[#4fa894] transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Start Outreach
                </button>
              )}
              {pitch && (
                <button
                  onClick={() => copyPitch(p.id, pitch)}
                  className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 text-slate-500 text-xs rounded-lg hover:bg-slate-50 transition-colors"
                >
                  {copiedId === p.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === p.id ? 'Copied' : 'Copy Pitch'}
                </button>
              )}
              {email(p) && (
                <a
                  href={`mailto:${email(p)}`}
                  className="p-1.5 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                  title={email(p)!}
                >
                  <Mail className="w-3.5 h-3.5" />
                </a>
              )}
              {phone(p) && (
                <a
                  href={`tel:${phone(p)}`}
                  className="p-1.5 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                  title={phone(p)!}
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
