'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Globe, Star, Phone, Mail, MapPin, User } from 'lucide-react'
import Link from 'next/link'
import { ProspectScoreBadge } from '@/components/admin/prospect-score-badge'
import { ActivityTimeline } from '@/components/admin/activity-timeline'
import { STAGES, STAGE_LABELS } from '@/types/database'
import type { Prospect, Demo, Activity } from '@/types/database'
import { cn } from '@/lib/utils'

const STAGE_BADGE_COLORS: Record<string, string> = {
  researched: 'bg-white/10 text-white/60',
  demo_built: 'bg-blue-500/20 text-blue-400',
  outreach: 'bg-purple-500/20 text-purple-400',
  engaged: 'bg-yellow-500/20 text-yellow-400',
  meeting: 'bg-orange-500/20 text-orange-400',
  proposal: 'bg-teal-500/20 text-teal-400',
  won: 'bg-green-500/20 text-green-400',
  lost: 'bg-red-500/20 text-red-400',
}

async function fetchAllProspects(): Promise<{ data: (Prospect & { demos?: Demo[] })[] }> {
  const res = await fetch('/api/admin/prospects?limit=500&sort=prospect_score&order=desc')
  if (!res.ok) throw new Error('Failed to fetch prospects')
  return res.json()
}

async function fetchActivities(prospectId: string): Promise<{ data: Activity[] }> {
  const res = await fetch(`/api/admin/activities?prospect_id=${prospectId}`)
  if (!res.ok) throw new Error('Failed to fetch activities')
  return res.json()
}

async function patchProspectStage(id: string, stage: string): Promise<void> {
  const res = await fetch('/api/admin/prospects', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, stage }),
  })
  if (!res.ok) throw new Error('Failed to update stage')
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white/5 border border-white/10 rounded-xl p-4', className)}>
      {children}
    </div>
  )
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">{children}</h3>
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
      <div>
        <span className="text-white/40 text-xs block">{label}</span>
        <span className="text-white/80">{value}</span>
      </div>
    </div>
  )
}

export default function ProspectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const prospectsQuery = useQuery({
    queryKey: ['prospects-all'],
    queryFn: fetchAllProspects,
    staleTime: 30_000,
  })

  const activitiesQuery = useQuery({
    queryKey: ['activities', id],
    queryFn: () => fetchActivities(id),
    enabled: !!id,
  })

  const stageMutation = useMutation({
    mutationFn: (stage: string) => patchProspectStage(id, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects-all'] })
      queryClient.invalidateQueries({ queryKey: ['activities', id] })
    },
  })

  const prospect = prospectsQuery.data?.data.find(p => p.id === id)
  const activities = activitiesQuery.data?.data ?? []

  if (prospectsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-white/40">
        Loading…
      </div>
    )
  }

  if (!prospect) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <p className="text-red-400">Prospect not found.</p>
      </div>
    )
  }

  const addressLine = [prospect.address, prospect.city, prospect.state, prospect.zip]
    .filter(Boolean)
    .join(', ')

  const locationLine = [prospect.city, prospect.state].filter(Boolean).join(', ')

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="space-y-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Prospects
        </button>

        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white leading-tight">{prospect.business_name}</h1>
            <p className="text-white/50 text-sm mt-0.5">
              {[locationLine, prospect.industry].filter(Boolean).join(' · ')}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <ProspectScoreBadge score={prospect.prospect_score} className="text-base px-3 py-1" />

            <select
              value={prospect.stage}
              onChange={e => stageMutation.mutate(e.target.value)}
              disabled={stageMutation.isPending}
              className={cn(
                'bg-white/5 border border-white/10 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--teal)] appearance-none disabled:opacity-50',
                STAGE_BADGE_COLORS[prospect.stage] ?? 'text-white/60'
              )}
            >
              {STAGES.map(s => (
                <option key={s} value={s} className="bg-[#1a1a2e] text-white">
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left col (col-span-2) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Contact card */}
          <Card>
            <CardTitle>Contact</CardTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow icon={User} label="Owner" value={prospect.owner_name} />
              <InfoRow icon={Mail} label="Owner Email" value={prospect.owner_email} />
              <InfoRow icon={Phone} label="Owner Phone" value={prospect.owner_phone} />
              <InfoRow icon={Phone} label="Business Phone" value={prospect.business_phone} />
              <InfoRow icon={Mail} label="Business Email" value={prospect.business_email} />
              <InfoRow icon={MapPin} label="Address" value={addressLine || null} />
              {prospect.website_url && (
                <div className="flex items-start gap-2 text-sm">
                  <Globe className="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-white/40 text-xs block">Website</span>
                    <a
                      href={prospect.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--teal)] hover:underline break-all"
                    >
                      {prospect.website_url}
                    </a>
                  </div>
                </div>
              )}
              {prospect.google_rating != null && (
                <div className="flex items-start gap-2 text-sm">
                  <Star className="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-white/40 text-xs block">Google Rating</span>
                    <span className="text-white/80">
                      {prospect.google_rating}★{' '}
                      <span className="text-white/40 text-xs">({prospect.google_review_count ?? 0} reviews)</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Tags */}
          {prospect.tags && prospect.tags.length > 0 && (
            <Card>
              <CardTitle>Tags</CardTitle>
              <div className="flex flex-wrap gap-2">
                {prospect.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/60 text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Demos */}
          <Card>
            <CardTitle>Demos</CardTitle>
            {!prospect.demos || prospect.demos.length === 0 ? (
              <p className="text-white/30 text-sm">No demos yet</p>
            ) : (
              <div className="space-y-2">
                {prospect.demos.map(demo => (
                  <div key={demo.id} className="flex items-center justify-between">
                    <a
                      href={demo.demo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[var(--teal)] hover:underline truncate"
                    >
                      {demo.demo_url}
                    </a>
                    <span
                      className={cn(
                        'ml-3 flex-shrink-0 text-xs px-2 py-0.5 rounded',
                        demo.status === 'live' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'
                      )}
                    >
                      {demo.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Notes */}
          {prospect.notes && (
            <Card>
              <CardTitle>Notes</CardTitle>
              <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">{prospect.notes}</p>
            </Card>
          )}
        </div>

        {/* Right col */}
        <div className="space-y-4">
          <Card>
            <CardTitle>Activity</CardTitle>
            {activitiesQuery.isLoading ? (
              <p className="text-white/30 text-sm py-4 text-center">Loading…</p>
            ) : (
              <ActivityTimeline activities={activities} />
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
