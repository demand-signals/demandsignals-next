'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Globe, Star, Phone, Mail, MapPin, User, Target, Zap, TrendingUp, Shield, DollarSign, AlertTriangle, CheckCircle, XCircle, ExternalLink, Lock, Unlock, Monitor, Share2, Copy, Check, Download } from 'lucide-react'
import Link from 'next/link'
import { ProspectScoreBadge, TierBadge } from '@/components/admin/prospect-score-badge'
import { ActivityTimeline } from '@/components/admin/activity-timeline'
import { ProspectMap } from '@/components/admin/prospect-map'
import { STAGES, STAGE_LABELS } from '@/types/database'
import type { Prospect, Demo, Activity } from '@/types/database'
import { cn } from '@/lib/utils'

const STAGE_BADGE_COLORS: Record<string, string> = {
  researched: 'bg-slate-500/10 border-slate-300 text-slate-600',
  demo_built: 'bg-blue-500/10 border-blue-300 text-blue-700',
  outreach: 'bg-purple-500/10 border-purple-300 text-purple-700',
  engaged: 'bg-yellow-500/10 border-yellow-300 text-yellow-700',
  meeting: 'bg-orange-500/10 border-orange-300 text-orange-700',
  proposal: 'bg-teal-500/10 border-teal-300 text-teal-700',
  won: 'bg-green-500/10 border-green-300 text-green-700',
  lost: 'bg-red-500/10 border-red-300 text-red-700',
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
    <div className={cn('bg-white border border-slate-200 rounded-xl p-4 shadow-sm', className)}>
      {children}
    </div>
  )
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">{children}</h3>
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="w-4 h-4 text-slate-300 mt-0.5 flex-shrink-0" />
      <div>
        <span className="text-slate-400 text-xs block">{label}</span>
        <span className="text-slate-700">{value}</span>
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

  // Activity form state
  const [newActivityType, setNewActivityType] = useState('note')
  const [newActivityBody, setNewActivityBody] = useState('')

  const addActivityMutation = useMutation({
    mutationFn: async () => {
      const typeLabels: Record<string, string> = { note: 'Note', call: 'Phone Call', email: 'Email', meeting: 'Meeting', stage_change: 'Stage Change' }
      const res = await fetch('/api/admin/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect_id: id,
          type: newActivityType,
          subject: typeLabels[newActivityType] || 'Note',
          body: newActivityBody.trim(),
          created_by: 'admin',
        }),
      })
      if (!res.ok) throw new Error('Failed to add activity')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', id] })
      setNewActivityBody('')
    },
  })

  const prospect = prospectsQuery.data?.data.find(p => p.id === id)
  const activities = activitiesQuery.data?.data ?? []

  if (prospectsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Loading…
      </div>
    )
  }

  if (!prospect) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <p className="text-red-500">Prospect not found.</p>
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
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Prospects
        </button>

        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-800 leading-tight">{prospect.business_name}</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {[locationLine, prospect.industry].filter(Boolean).join(' · ')}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Score — temperature-coded */}
            {(() => {
              const s = prospect.prospect_score ?? 0
              const tempStyle = s >= 80
                ? 'bg-red-500/10 border-red-300 text-red-700'
                : s >= 65
                ? 'bg-orange-500/10 border-orange-300 text-orange-700'
                : s >= 50
                ? 'bg-amber-500/10 border-amber-300 text-amber-700'
                : s >= 35
                ? 'bg-sky-500/10 border-sky-300 text-sky-700'
                : 'bg-blue-500/10 border-blue-300 text-blue-700'
              const tierIcon = s >= 75 ? '♦' : s >= 60 ? '★' : s >= 40 ? '●' : '○'
              return (
                <span className={cn(
                  'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border backdrop-blur-sm text-sm font-bold font-mono',
                  tempStyle,
                )}>
                  <span className="text-xs">{tierIcon}</span>
                  {prospect.prospect_score ?? '--'}
                </span>
              )
            })()}

            {/* Stage selector */}
            <select
              value={prospect.stage}
              onChange={e => stageMutation.mutate(e.target.value)}
              disabled={stageMutation.isPending}
              className={cn(
                'h-9 px-3.5 rounded-lg border backdrop-blur-sm text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--teal)] appearance-none disabled:opacity-50 cursor-pointer',
                STAGE_BADGE_COLORS[prospect.stage] ?? 'bg-slate-50 border-slate-200 text-slate-500'
              )}
            >
              {STAGES.map(s => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>

            {/* Profile download */}
            <a
              href={`/api/admin/prospects/${id}/profile`}
              download
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-slate-300 bg-slate-500/10 backdrop-blur-sm text-slate-700 text-sm font-semibold hover:bg-slate-500/20 transition-colors"
              title="Download prospect profile for demo generator"
            >
              <Download className="w-3.5 h-3.5" />
              Profile.md
            </a>
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
                  <Globe className="w-4 h-4 text-slate-300 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-slate-400 text-xs block">Website</span>
                    <a
                      href={prospect.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--teal-dark)] hover:underline break-all"
                    >
                      {prospect.website_url}
                    </a>
                  </div>
                </div>
              )}
              {prospect.google_rating != null && (
                <div className="flex items-start gap-2 text-sm">
                  <Star className="w-4 h-4 text-slate-300 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-slate-400 text-xs block">Google Rating</span>
                    <span className="text-slate-700">
                      {prospect.google_rating}★{' '}
                      <span className="text-slate-400 text-xs">({prospect.google_review_count ?? 0} reviews)</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Intelligence Card */}
          <Card>
            <CardTitle>Intelligence</CardTitle>
            {(() => {
              const sf = prospect.score_factors || {}
              const rd = prospect.research_data || {}
              const signals = [
                { label: 'Review Authority', value: sf.review_authority, icon: Star, color: 'text-amber-500' },
                { label: 'Digital Vulnerability', value: sf.digital_vulnerability, icon: Shield, color: 'text-red-500' },
                { label: 'Industry Value', value: sf.industry_value, icon: DollarSign, color: 'text-green-500' },
                { label: 'Close Probability', value: sf.close_probability, icon: Target, color: 'text-blue-500' },
                { label: 'Revenue Potential', value: sf.revenue_potential, icon: TrendingUp, color: 'text-purple-500' },
              ]
              return (
                <div className="space-y-4">
                  {/* Tier badge */}
                  <div className="flex items-center gap-3">
                    <TierBadge tier={sf.tier || null} />
                    {sf.close_signals?.length > 0 && (
                      <div className="flex gap-1">
                        {sf.close_signals.map((s: string) => (
                          <span key={s} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[0.6rem] font-mono">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Signal bars */}
                  <div className="space-y-2">
                    {signals.map(({ label, value, icon: Icon, color }) => (
                      <div key={label} className="flex items-center gap-2">
                        <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', color)} />
                        <span className="text-xs text-slate-500 w-32 flex-shrink-0">{label}</span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              (value ?? 0) >= 75 ? 'bg-green-400' :
                              (value ?? 0) >= 50 ? 'bg-yellow-400' :
                              (value ?? 0) >= 25 ? 'bg-orange-400' : 'bg-red-300'
                            )}
                            style={{ width: `${value ?? 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-slate-400 w-6 text-right">{value ?? '-'}</span>
                      </div>
                    ))}
                  </div>

                  {/* Pitch angle */}
                  {rd.pitch_angle && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Zap className="w-3 h-3 text-amber-500" />
                        <span className="text-[0.65rem] font-semibold text-slate-500 uppercase tracking-wider">Pitch Angle</span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{rd.pitch_angle}</p>
                    </div>
                  )}

                  {/* Opportunities */}
                  {rd.opportunities?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {rd.opportunities.map((opp: string) => (
                        <span key={opp} className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[0.65rem] border border-teal-200">
                          {opp.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}
          </Card>

          {/* Digital Health Card */}
          {(() => {
            const rd = prospect.research_data || {}
            const website = rd.website || {}
            const sf = prospect.score_factors || {}
            const vd = sf.vulnerability_detail || {}
            const siteScore = prospect.site_quality_score ?? null
            const hasWebsiteData = website.platform || website.issues?.length || website.ssl_valid !== undefined || siteScore !== null

            if (!hasWebsiteData) return null

            const qualityLabel = siteScore === null ? null :
              siteScore <= 20 ? 'Critical' : siteScore <= 40 ? 'Poor' :
              siteScore <= 60 ? 'Fair' : siteScore <= 80 ? 'Good' : 'Strong'
            const qualityColor = siteScore === null ? '' :
              siteScore <= 20 ? 'text-red-600 bg-red-50' : siteScore <= 40 ? 'text-orange-600 bg-orange-50' :
              siteScore <= 60 ? 'text-yellow-600 bg-yellow-50' : siteScore <= 80 ? 'text-green-600 bg-green-50' : 'text-emerald-600 bg-emerald-50'
            const barColor = siteScore === null ? 'bg-slate-300' :
              siteScore <= 20 ? 'bg-red-400' : siteScore <= 40 ? 'bg-orange-400' :
              siteScore <= 60 ? 'bg-yellow-400' : siteScore <= 80 ? 'bg-green-400' : 'bg-emerald-400'

            return (
              <Card>
                <CardTitle>Digital Health</CardTitle>
                <div className="space-y-3">
                  {/* Site Quality Score */}
                  {siteScore !== null && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-500">Site Quality</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-semibold text-slate-700">{siteScore}/100</span>
                            <span className={cn('text-[0.65rem] font-semibold px-1.5 py-0.5 rounded', qualityColor)}>
                              {qualityLabel}
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full', barColor)} style={{ width: `${siteScore}%` }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SSL Status */}
                  {website.ssl_valid !== undefined && (
                    <div className="flex items-center gap-2">
                      {website.ssl_valid === false ? (
                        <>
                          <Unlock className="w-4 h-4 text-red-500" />
                          <span className="text-sm font-medium text-red-600">SSL: BROKEN</span>
                          <span className="text-xs text-red-400">— browsers block visitors</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600">SSL: Valid</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Platform */}
                  {website.platform && (
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">
                        Platform: <span className="font-medium">{website.platform}</span>
                      </span>
                      {vd.platform_weakness != null && vd.platform_weakness >= 65 && (
                        <span className="text-[0.6rem] px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 font-medium">Weak</span>
                      )}
                    </div>
                  )}

                  {/* E-commerce */}
                  {rd.ecommerce && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">
                        E-commerce: <span className="font-medium">{rd.ecommerce.platform || 'Unknown'}</span>
                      </span>
                      {rd.ecommerce.url && (
                        <a href={rd.ecommerce.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--teal-dark)] hover:underline flex items-center gap-0.5">
                          {rd.ecommerce.url.replace(/^https?:\/\//, '')} <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Issues */}
                  {website.issues?.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-slate-500 font-medium">Issues Found:</span>
                      <ul className="mt-1 space-y-1">
                        {website.issues.map((issue: string, i: number) => {
                          const isCritical = issue.toLowerCase().includes('ssl') || issue.toLowerCase().includes('broken') || issue.toLowerCase().includes('no_website')
                          return (
                            <li key={i} className="flex items-start gap-1.5 text-sm">
                              <AlertTriangle className={cn('w-3.5 h-3.5 mt-0.5 flex-shrink-0', isCritical ? 'text-red-400' : 'text-yellow-400')} />
                              <span className={cn(isCritical ? 'text-red-600' : 'text-slate-600')}>
                                {issue.replace(/_/g, ' ')}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}

                  {/* Website link */}
                  {website.url && (
                    <a href={website.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[var(--teal-dark)] hover:underline mt-1">
                      {website.url.replace(/^https?:\/\//, '')} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </Card>
            )
          })()}

          {/* Social & Reviews Card */}
          {(() => {
            const rd = prospect.research_data || {}
            const reviews = rd.reviews || {}
            const social = rd.social || {}
            const hasSocialData = Object.keys(social).length > 0 || Object.keys(reviews).length > 0

            if (!hasSocialData) return null

            // Collect review platforms
            const reviewPlatforms: { name: string; rating: number | null; count: number | null }[] = []
            if (reviews.google) reviewPlatforms.push({ name: 'Google', rating: reviews.google.rating, count: reviews.google.count })
            else if (prospect.google_rating) reviewPlatforms.push({ name: 'Google', rating: prospect.google_rating, count: prospect.google_review_count })
            if (reviews.yelp) reviewPlatforms.push({ name: 'Yelp', rating: reviews.yelp.rating, count: reviews.yelp.count })
            else if (prospect.yelp_rating) reviewPlatforms.push({ name: 'Yelp', rating: prospect.yelp_rating, count: prospect.yelp_review_count })
            if (Array.isArray(reviews.other)) {
              for (const r of reviews.other) {
                if (r?.platform) reviewPlatforms.push({ name: r.platform, rating: r.rating, count: r.count })
              }
            }

            const totalReviews = reviewPlatforms.reduce((sum, r) => sum + (r.count || 0), 0)

            // Social channels
            const socialChannels = Object.entries(social).map(([key, val]) => ({
              name: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
              value: val as string | boolean | null,
              isPresent: val === true || (typeof val === 'string' && val.length > 0),
              url: typeof val === 'string' && val.startsWith('http') ? val as string : null,
            }))

            return (
              <Card>
                <CardTitle>Social & Reviews</CardTitle>
                <div className="space-y-4">
                  {/* Review Platforms */}
                  {reviewPlatforms.length > 0 && (
                    <div className="space-y-2">
                      {reviewPlatforms.map(r => (
                        <div key={r.name} className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 w-20 flex-shrink-0">{r.name}</span>
                          {r.rating != null && (
                            <span className="text-sm font-medium text-amber-600 w-10">{r.rating}★</span>
                          )}
                          {r.count != null && (
                            <>
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
                                <div className="h-full rounded-full bg-amber-300" style={{ width: `${Math.min(100, (r.count / 5))}%` }} />
                              </div>
                              <span className="text-xs text-slate-400">({r.count})</span>
                            </>
                          )}
                        </div>
                      ))}
                      <div className="text-xs text-slate-400 mt-1">
                        Total: {totalReviews} reviews across {reviewPlatforms.length} platform{reviewPlatforms.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )}

                  {/* Social Presence */}
                  {socialChannels.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <span className="text-xs text-slate-500 font-medium">Social Presence</span>
                      {socialChannels.map(ch => (
                        <div key={ch.name} className="flex items-center gap-2">
                          {ch.isPresent ? (
                            <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-red-300 flex-shrink-0" />
                          )}
                          <span className={cn('text-sm', ch.isPresent ? 'text-slate-700' : 'text-slate-400')}>
                            {ch.name}
                          </span>
                          {ch.url && (
                            <a href={ch.url} target="_blank" rel="noopener noreferrer"
                              className="text-[0.65rem] text-[var(--teal-dark)] hover:underline truncate max-w-[200px] flex items-center gap-0.5">
                              {ch.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                              <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                            </a>
                          )}
                          {!ch.isPresent && (
                            <span className="text-[0.6rem] text-red-400">Missing</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Deal Estimate */}
                  {rd.deal_estimate && (
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium text-slate-700">Deal Estimate: </span>
                      <span className="text-sm font-semibold text-green-600">{rd.deal_estimate}</span>
                    </div>
                  )}

                  {/* Hours / Established */}
                  {(rd.hours || rd.established) && (
                    <div className="pt-2 border-t border-slate-100 space-y-1 text-xs text-slate-500">
                      {rd.hours && <div>Hours: {rd.hours}</div>}
                      {rd.established && <div>Established: {rd.established}</div>}
                    </div>
                  )}
                </div>
              </Card>
            )
          })()}

          {/* Tags */}
          {prospect.tags && prospect.tags.length > 0 && (
            <Card>
              <CardTitle>Tags</CardTitle>
              <div className="flex flex-wrap gap-2">
                {prospect.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs"
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
              <p className="text-slate-400 text-sm">No demos yet</p>
            ) : (
              <div className="space-y-2">
                {prospect.demos.map(demo => (
                  <div key={demo.id} className="flex items-center justify-between">
                    <a
                      href={demo.demo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[var(--teal-dark)] hover:underline truncate"
                    >
                      {demo.demo_url}
                    </a>
                    <span
                      className={cn(
                        'ml-3 flex-shrink-0 text-xs px-2 py-0.5 rounded',
                        demo.status === 'live' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'
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
              <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{prospect.notes}</p>
            </Card>
          )}
        </div>

        {/* Right col */}
        <div className="space-y-4">
          {/* Location Map */}
          <Card>
            <CardTitle>Location</CardTitle>
            <ProspectMap address={addressLine || null} businessName={prospect.business_name} />
          </Card>

          {/* Activity + Add Form */}
          <Card>
            <CardTitle>Activity</CardTitle>

            {/* Add activity form */}
            <div className="mb-4 border-b border-slate-100 pb-4">
              <div className="flex gap-2 mb-2">
                <select
                  value={newActivityType}
                  onChange={e => setNewActivityType(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
                >
                  <option value="note">Note</option>
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                </select>
              </div>
              <textarea
                value={newActivityBody}
                onChange={e => setNewActivityBody(e.target.value)}
                placeholder="Add a note or log an activity…"
                rows={3}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[var(--teal)] resize-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => addActivityMutation.mutate()}
                  disabled={!newActivityBody.trim() || addActivityMutation.isPending}
                  className="px-3 py-1.5 bg-[var(--teal)] text-white text-xs font-medium rounded-lg hover:bg-[var(--teal-dark)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {addActivityMutation.isPending ? 'Adding…' : 'Add'}
                </button>
              </div>
            </div>

            {/* Timeline */}
            {activitiesQuery.isLoading ? (
              <p className="text-slate-400 text-sm py-4 text-center">Loading…</p>
            ) : (
              <ActivityTimeline activities={activities} />
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
