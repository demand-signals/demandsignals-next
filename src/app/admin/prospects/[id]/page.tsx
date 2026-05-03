'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Globe, Star, Phone, Mail, MapPin, User, Target, Zap, TrendingUp, Shield, DollarSign, AlertTriangle, CheckCircle, XCircle, ExternalLink, Lock, Unlock, Monitor, Check, Download, Pencil, Trash2, Search, Loader2, Tag, CircleAlert, Plus, X, ChevronDown, ChevronUp, Link2 } from 'lucide-react'
import {
  REVIEW_CHANNELS,
  SIMPLE_CHANNELS,
  normalizeReviewChannel,
  type ProspectChannels,
  type ReviewChannelEntry,
} from '@/lib/prospect-channels'
import Link from 'next/link'
import { ProspectScoreBadge, TierBadge } from '@/components/admin/prospect-score-badge'
import { BookingCard } from '@/components/admin/BookingCard'
import { LatestQuotePanel } from '@/components/admin/LatestQuotePanel'
// suggestClientCode removed — now using the server-side suggest endpoint
import { ProspectEditModal } from '@/components/admin/prospect-edit-modal'
import { ActivityTimeline } from '@/components/admin/activity-timeline'
import { ProspectMap } from '@/components/admin/prospect-map'
import { STAGES, STAGE_LABELS } from '@/types/database'
import type { Prospect, Demo, Activity } from '@/types/database'
import { cn } from '@/lib/utils'
import { countryName } from '@/lib/countries'

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

  const clientToggleMutation = useMutation({
    mutationFn: async (next: boolean) => {
      const res = await fetch(`/api/admin/prospects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_client: next }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Toggle failed')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects-all'] })
      queryClient.invalidateQueries({ queryKey: ['prospect', id] })
    },
    onError: (e: Error) => alert(e.message),
  })

  // Research deep-dive
  const researchMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/prospects/${id}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Research failed')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects-all'] })
      queryClient.invalidateQueries({ queryKey: ['activities', id] })
    },
  })

  // Edit modal + delete state
  const [showEdit, setShowEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/prospects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects-all'] })
      router.push('/admin/prospects')
    },
  })

  // Activity form state
  const [newActivityType, setNewActivityType] = useState('note')
  const [newActivityBody, setNewActivityBody] = useState('')

  // Client code editing state
  const [clientCodeInput, setClientCodeInput] = useState<string>('')
  const [clientCodeEditing, setClientCodeEditing] = useState(false)
  const [clientCodeSaving, setClientCodeSaving] = useState(false)
  const [clientCodeError, setClientCodeError] = useState<string | null>(null)
  const [clientCodeSaved, setClientCodeSaved] = useState(false)
  const [clientCodeSuggesting, setClientCodeSuggesting] = useState(false)

  // Channels editor state
  const [channelsEditing, setChannelsEditing] = useState(false)
  const [channelsData, setChannelsData] = useState<ProspectChannels>({})
  const [channelsSaving, setChannelsSaving] = useState(false)
  const [channelsSaved, setChannelsSaved] = useState(false)
  const [channelsError, setChannelsError] = useState<string | null>(null)

  // Availability check state
  type AvailStatus = 'idle' | 'checking' | 'available' | 'taken' | 'format_error'
  const [codeAvail, setCodeAvail] = useState<{
    status: AvailStatus
    takenBy?: { id: string; business_name: string }
  }>({ status: 'idle' })
  const availDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Latest booking + latest quote for prospect-record surfacing.
  const [latestBooking, setLatestBooking] = useState<{
    id: string; start_at: string; end_at: string; attendee_email: string;
    attendee_phone: string | null; google_meet_link: string | null; status: string
  } | null>(null)
  const [latestQuote, setLatestQuote] = useState<Parameters<typeof LatestQuotePanel>[0]['quote'] | null>(null)

  useEffect(() => {
    if (!prospect?.id) return
    let cancelled = false
    ;(async () => {
      try {
        const [b, q] = await Promise.all([
          fetch(`/api/admin/prospects/${prospect.id}/latest-booking`).then((r) => r.json()).catch(() => ({ booking: null })),
          fetch(`/api/admin/prospects/${prospect.id}/latest-quote`).then((r) => r.json()).catch(() => ({ quote: null })),
        ])
        if (cancelled) return
        setLatestBooking(b.booking ?? null)
        setLatestQuote(q.quote ?? null)
      } catch {
        if (!cancelled) { setLatestBooking(null); setLatestQuote(null) }
      }
    })()
    return () => { cancelled = true }
  }, [prospect?.id])

  // Sync clientCodeInput when prospect loads/changes
  useEffect(() => {
    if (prospect) setClientCodeInput((prospect as any).client_code ?? '')
  }, [prospect?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync channels when prospect loads/changes
  useEffect(() => {
    if (prospect) setChannelsData((prospect.channels as ProspectChannels) ?? {})
  }, [prospect?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced availability check whenever the input changes while editing
  useEffect(() => {
    if (!clientCodeEditing) return
    if (availDebounceRef.current) clearTimeout(availDebounceRef.current)

    const code = clientCodeInput.toUpperCase().trim()
    if (code.length === 0) {
      setCodeAvail({ status: 'idle' })
      return
    }
    if (code.length < 4 || !/^[A-Z]{4}$/.test(code)) {
      setCodeAvail({ status: 'format_error' })
      return
    }

    setCodeAvail({ status: 'checking' })
    availDebounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ code })
        if (id) params.set('except_id', id)
        const res = await fetch(`/api/admin/prospects/client-code-available?${params}`)
        const json = await res.json()
        if (json.available) {
          setCodeAvail({ status: 'available' })
        } else if (json.error) {
          setCodeAvail({ status: 'format_error' })
        } else {
          setCodeAvail({ status: 'taken', takenBy: json.taken_by })
        }
      } catch {
        setCodeAvail({ status: 'idle' })
      }
    }, 500)
  }, [clientCodeInput, clientCodeEditing, id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function saveClientCode() {
    if (!prospect) return
    setClientCodeSaving(true)
    setClientCodeError(null)
    const code = clientCodeInput.toUpperCase().trim().slice(0, 4)
    try {
      const res = await fetch(`/api/admin/prospects/${prospect.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_code: code || null }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Save failed')
      }
      setClientCodeEditing(false)
      setClientCodeSaved(true)
      setCodeAvail({ status: 'idle' })
      setTimeout(() => setClientCodeSaved(false), 2500)
      queryClient.invalidateQueries({ queryKey: ['prospects-all'] })
    } catch (e) {
      setClientCodeError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setClientCodeSaving(false)
    }
  }

  async function saveChannels() {
    if (!prospect) return
    setChannelsSaving(true)
    setChannelsError(null)
    try {
      const res = await fetch(`/api/admin/prospects/${prospect.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: channelsData }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Save failed')
      }
      setChannelsEditing(false)
      setChannelsSaved(true)
      setTimeout(() => setChannelsSaved(false), 2500)
      queryClient.invalidateQueries({ queryKey: ['prospects-all'] })
    } catch (e) {
      setChannelsError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setChannelsSaving(false)
    }
  }

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

  // Address line includes country only when non-US, per international
  // postal convention (country last, all-caps in PDFs; here we just
  // append the country name).
  const prospectCountry = (prospect as { country?: string | null }).country ?? 'US'
  const addressParts = [prospect.address, prospect.city, prospect.state, prospect.zip].filter(Boolean)
  const addressLine = addressParts.join(', ')
  const addressLineWithCountry =
    prospectCountry && prospectCountry !== 'US'
      ? [addressLine, countryName(prospectCountry)].filter(Boolean).join(', ')
      : addressLine

  const locationLine = [prospect.city, prospect.state].filter(Boolean).join(', ')

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Booking card — prominent at top when an upcoming confirmed booking exists */}
      {latestBooking && latestBooking.status === 'confirmed' && new Date(latestBooking.start_at) > new Date() && (
        <BookingCard
          booking={latestBooking}
          onChange={() => {
            // Refetch booking on change (cancel / reschedule)
            if (prospect?.id) {
              fetch(`/api/admin/prospects/${prospect.id}/latest-booking`)
                .then((r) => r.json())
                .then((d) => setLatestBooking(d.booking ?? null))
                .catch(() => setLatestBooking(null))
            }
          }}
        />
      )}

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
                ? 'bg-emerald-500/10 border-emerald-300 text-emerald-700'
                : s >= 65
                ? 'bg-green-500/10 border-green-300 text-green-700'
                : s >= 50
                ? 'bg-amber-500/10 border-amber-300 text-amber-700'
                : s >= 35
                ? 'bg-orange-500/10 border-orange-300 text-orange-700'
                : 'bg-red-500/10 border-red-300 text-red-700'
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

            {/* Deep Dive Research */}
            <button
              onClick={() => researchMutation.mutate()}
              disabled={researchMutation.isPending}
              className={cn(
                'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border backdrop-blur-sm text-sm font-semibold transition-colors',
                researchMutation.isPending
                  ? 'border-purple-300 bg-purple-500/10 text-purple-600 cursor-wait'
                  : researchMutation.isSuccess
                  ? 'border-green-300 bg-green-500/10 text-green-700'
                  : 'border-purple-300 bg-purple-500/10 text-purple-700 hover:bg-purple-500/20'
              )}
              title="AI deep-dive: research reviews, socials, website, competitors, and score"
            >
              {researchMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : researchMutation.isSuccess ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              {researchMutation.isPending ? 'Researching…' : researchMutation.isSuccess ? `Done (${researchMutation.data?.score})` : 'Research'}
            </button>

            {/* Promote / Demote client */}
            <button
              onClick={() => clientToggleMutation.mutate(!(prospect as any).is_client)}
              disabled={clientToggleMutation.isPending}
              className={cn(
                'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border backdrop-blur-sm text-sm font-semibold transition-colors disabled:opacity-50',
                (prospect as any).is_client
                  ? 'border-amber-300 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20'
                  : 'border-emerald-300 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20',
              )}
              title={(prospect as any).is_client ? 'Demote back to prospect' : 'Promote to client'}
            >
              {clientToggleMutation.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : (prospect as any).is_client ? 'Demote' : 'Promote'}
            </button>

            {/* Edit */}
            <button
              onClick={() => setShowEdit(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-slate-300 bg-slate-500/10 backdrop-blur-sm text-slate-700 text-sm font-semibold hover:bg-slate-500/20 transition-colors"
              title="Edit all prospect details"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>

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

            {/* Delete */}
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center h-9 px-2.5 rounded-lg border border-red-200 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                title="Delete prospect"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-red-300 bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Confirm Delete'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Research result banner */}
      {researchMutation.isSuccess && researchMutation.data && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-800">Deep Dive Complete</span>
            <span className="text-xs text-purple-500 ml-auto">Score: {researchMutation.data.score} ({researchMutation.data.tier})</span>
          </div>
          {researchMutation.data.executive_summary && (
            <p className="text-sm text-purple-700 leading-relaxed">{researchMutation.data.executive_summary}</p>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-purple-600">
            {researchMutation.data.deal_estimate && <span>Deal: {researchMutation.data.deal_estimate}</span>}
            {researchMutation.data.urgency && <span>Urgency: {researchMutation.data.urgency}</span>}
            {researchMutation.data.opportunities?.length > 0 && (
              <span>{researchMutation.data.opportunities.length} opportunities</span>
            )}
          </div>
          {researchMutation.data.pitch_angle && (
            <div className="pt-2 border-t border-purple-200">
              <span className="text-[0.65rem] font-semibold text-purple-500 uppercase tracking-wider">Pitch</span>
              <p className="text-sm text-purple-800 mt-0.5">{researchMutation.data.pitch_angle}</p>
            </div>
          )}
        </div>
      )}
      {researchMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{researchMutation.error?.message || 'Research failed'}</span>
        </div>
      )}

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
              <InfoRow icon={MapPin} label="Address" value={addressLineWithCountry || null} />
            </div>
          </Card>

          {/* Channels Card */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <CardTitle>Channels</CardTitle>
              <div className="flex items-center gap-2">
                {channelsSaved && <Check className="w-4 h-4 text-green-500" />}
                {!channelsEditing ? (
                  <button
                    onClick={() => setChannelsEditing(true)}
                    className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={saveChannels}
                      disabled={channelsSaving}
                      className="px-2.5 py-1 bg-[var(--teal)] text-white text-xs font-semibold rounded hover:bg-[var(--teal-dark)] disabled:opacity-40"
                    >
                      {channelsSaving ? '…' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setChannelsEditing(false)
                        setChannelsError(null)
                        setChannelsData((prospect.channels as ProspectChannels) ?? {})
                      }}
                      className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 rounded border border-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
            {channelsError && (
              <p className="text-xs text-red-500 mb-2">{channelsError}</p>
            )}
            {channelsEditing ? (
              <div className="space-y-4">
                {/* Simple channels — URL only */}
                <div>
                  <p className="text-[0.65rem] font-semibold text-slate-400 uppercase tracking-wider mb-2">Website &amp; Social</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SIMPLE_CHANNELS.map(ch => (
                      <div key={ch.key} className="space-y-0.5">
                        <label className="text-xs text-slate-500 font-medium">{ch.label}</label>
                        <input
                          type="url"
                          value={(channelsData[ch.key] as string | null | undefined) ?? ''}
                          onChange={e => setChannelsData(prev => ({ ...prev, [ch.key]: e.target.value || null }))}
                          placeholder={ch.placeholder}
                          className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Review channels — URL + rating + review_count */}
                <div>
                  <p className="text-[0.65rem] font-semibold text-slate-400 uppercase tracking-wider mb-2">Review Platforms</p>
                  <div className="space-y-3">
                    {REVIEW_CHANNELS.map(ch => {
                      const entry = normalizeReviewChannel(channelsData[ch.key])
                      function updateEntry(patch: Partial<ReviewChannelEntry>) {
                        const next = { ...normalizeReviewChannel(channelsData[ch.key]), ...patch }
                        // If all meaningful fields are cleared, set null
                        const isEmpty = !next.url && next.rating === null && next.review_count === null
                        setChannelsData(prev => ({ ...prev, [ch.key]: isEmpty ? null : next }))
                      }
                      return (
                        <div key={ch.key} className="border border-slate-100 rounded-lg p-2.5 space-y-2">
                          <p className="text-xs font-semibold text-slate-600">{ch.label}</p>
                          <input
                            type="url"
                            value={entry.url ?? ''}
                            onChange={e => updateEntry({ url: e.target.value || null })}
                            placeholder={ch.placeholder}
                            className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
                          />
                          <div className="flex gap-2">
                            <div className="flex-1 space-y-0.5">
                              <label className="text-[0.6rem] text-slate-400">Rating (0–5)</label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="5"
                                value={entry.rating ?? ''}
                                onChange={e => updateEntry({ rating: e.target.value ? parseFloat(e.target.value) : null })}
                                placeholder="4.8"
                                className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
                              />
                            </div>
                            <div className="flex-1 space-y-0.5">
                              <label className="text-[0.6rem] text-slate-400">Reviews</label>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={entry.review_count ?? ''}
                                onChange={e => updateEntry({ review_count: e.target.value ? parseInt(e.target.value, 10) : null })}
                                placeholder="125"
                                className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
                              />
                            </div>
                          </div>
                          {entry.last_synced_at && (
                            <p className="text-[0.6rem] text-slate-400">
                              Last synced {new Date(entry.last_synced_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Other links */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500 font-medium">Other Links</span>
                    <button
                      onClick={() => setChannelsData(prev => ({
                        ...prev,
                        other: [...(prev.other ?? []), { label: '', url: '' }],
                      }))}
                      className="text-xs text-[var(--teal)] hover:text-[var(--teal-dark)] flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
                  {(channelsData.other ?? []).map((link, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={link.label}
                        onChange={e => {
                          const other = [...(channelsData.other ?? [])]
                          other[i] = { ...other[i], label: e.target.value }
                          setChannelsData(prev => ({ ...prev, other }))
                        }}
                        placeholder="Label"
                        className="w-28 flex-shrink-0 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
                      />
                      <input
                        type="url"
                        value={link.url}
                        onChange={e => {
                          const other = [...(channelsData.other ?? [])]
                          other[i] = { ...other[i], url: e.target.value }
                          setChannelsData(prev => ({ ...prev, other }))
                        }}
                        placeholder="https://..."
                        className="flex-1 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
                      />
                      <button
                        onClick={() => {
                          const other = (channelsData.other ?? []).filter((_, j) => j !== i)
                          setChannelsData(prev => ({ ...prev, other }))
                        }}
                        className="text-red-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Simple channels — URL string */}
                {SIMPLE_CHANNELS.filter(ch => channelsData[ch.key]).map(ch => {
                  const url = channelsData[ch.key] as string
                  return (
                    <div key={ch.key} className="flex items-center gap-2 text-sm">
                      <Link2 className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                      <span className="text-xs text-slate-400 w-24 flex-shrink-0">{ch.label}</span>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--teal-dark)] hover:underline truncate text-xs flex items-center gap-0.5"
                      >
                        {url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                        <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 ml-0.5" />
                      </a>
                    </div>
                  )
                })}
                {/* Review channels — object with optional rating/count */}
                {REVIEW_CHANNELS.filter(ch => {
                  const v = channelsData[ch.key]
                  if (!v) return false
                  const e = normalizeReviewChannel(v)
                  return e.url || e.rating !== null || e.review_count !== null
                }).map(ch => {
                  const entry = normalizeReviewChannel(channelsData[ch.key])
                  return (
                    <div key={ch.key} className="flex items-center gap-2 text-sm flex-wrap">
                      <Link2 className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                      <span className="text-xs text-slate-400 w-24 flex-shrink-0">{ch.label}</span>
                      {entry.url ? (
                        <a
                          href={entry.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--teal-dark)] hover:underline truncate text-xs flex items-center gap-0.5"
                        >
                          {entry.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                          <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 ml-0.5" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-300">no URL</span>
                      )}
                      {entry.rating !== null && (
                        <span className="text-xs font-semibold text-amber-500 ml-auto">
                          {entry.rating}★
                          {entry.review_count !== null && (
                            <span className="text-slate-400 font-normal ml-1">({entry.review_count})</span>
                          )}
                        </span>
                      )}
                    </div>
                  )
                })}
                {(channelsData.other ?? []).filter(l => l.url).map((link, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Link2 className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                    <span className="text-xs text-slate-400 w-24 flex-shrink-0">{link.label || 'Other'}</span>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--teal-dark)] hover:underline truncate text-xs flex items-center gap-0.5"
                    >
                      {link.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                      <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 ml-0.5" />
                    </a>
                  </div>
                ))}
                {!SIMPLE_CHANNELS.some(ch => channelsData[ch.key]) &&
                  !REVIEW_CHANNELS.some(ch => {
                    const v = channelsData[ch.key]
                    if (!v) return false
                    const e = normalizeReviewChannel(v)
                    return e.url || e.rating !== null || e.review_count !== null
                  }) &&
                  !(channelsData.other?.length) && (
                  <p className="text-xs text-slate-400">No channels linked yet. Click Edit to add.</p>
                )}
              </div>
            )}
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
          <ProspectDemos prospectId={id} initialDemos={prospect.demos ?? []} />

          {/* Notes Timeline */}
          <ProspectNotes prospectId={id} legacyNotes={prospect.notes ?? null} />
        </div>

        {/* Right col */}
        <div className="space-y-4">
          {/* Client Code Card */}
          <Card>
            <CardTitle>Client Code</CardTitle>
            <div className="space-y-2">
              <p className="text-xs text-slate-400 leading-relaxed">
                4-letter code used in all document numbers (e.g. INV-<span className="font-mono font-semibold text-slate-600">{(prospect as any).client_code || 'HANG'}</span>-042326A).
                Required before issuing SOWs, invoices, or receipts.
              </p>
              {clientCodeEditing ? (
                <div className="space-y-1.5">
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={clientCodeInput}
                      onChange={e => setClientCodeInput(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
                      placeholder="HANG"
                      maxLength={4}
                      className={cn(
                        'flex-1 border rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 uppercase tracking-widest',
                        codeAvail.status === 'taken' || codeAvail.status === 'format_error'
                          ? 'border-red-300 focus:ring-red-400'
                          : codeAvail.status === 'available'
                          ? 'border-green-400 focus:ring-green-400'
                          : 'border-slate-300 focus:ring-[var(--teal)]',
                      )}
                    />
                    <button
                      onClick={saveClientCode}
                      disabled={
                        clientCodeSaving ||
                        codeAvail.status === 'taken' ||
                        codeAvail.status === 'format_error' ||
                        codeAvail.status === 'checking'
                      }
                      className="px-2.5 py-1.5 bg-[var(--teal)] text-white text-xs font-semibold rounded hover:bg-[var(--teal-dark)] disabled:opacity-40"
                    >
                      {clientCodeSaving ? '…' : 'Save'}
                    </button>
                    <button
                      onClick={async () => {
                        setClientCodeSuggesting(true)
                        setClientCodeError(null)
                        try {
                          const res = await fetch(`/api/admin/prospects/${id}/suggest-client-code`)
                          const json = await res.json()
                          if (json.code) setClientCodeInput(json.code)
                        } catch {
                          // ignore — leave current input unchanged
                        } finally {
                          setClientCodeSuggesting(false)
                        }
                      }}
                      disabled={clientCodeSuggesting}
                      className="text-xs text-[var(--teal)] hover:text-[var(--teal-dark)] flex items-center gap-1 disabled:opacity-50"
                      title="Auto-suggest an available code"
                    >
                      {clientCodeSuggesting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Tag className="w-3 h-3" />
                      )}
                      Suggest
                    </button>
                    <button
                      onClick={() => {
                        setClientCodeEditing(false)
                        setClientCodeError(null)
                        setCodeAvail({ status: 'idle' })
                      }}
                      className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 rounded border border-slate-200"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Availability indicator */}
                  {codeAvail.status === 'checking' && (
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Checking…
                    </p>
                  )}
                  {codeAvail.status === 'available' && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Available
                    </p>
                  )}
                  {codeAvail.status === 'taken' && codeAvail.takenBy && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <CircleAlert className="w-3 h-3 flex-shrink-0" />
                      Taken by{' '}
                      <a
                        href={`/admin/prospects/${codeAvail.takenBy.id}`}
                        className="underline hover:text-red-800"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {codeAvail.takenBy.business_name}
                      </a>
                    </p>
                  )}
                  {codeAvail.status === 'format_error' && clientCodeInput.length > 0 && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <CircleAlert className="w-3 h-3" /> Must be 4 letters A-Z
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'flex-1 font-mono text-base font-bold tracking-widest px-2 py-1 rounded',
                    (prospect as any).client_code
                      ? 'text-[var(--teal)] bg-[var(--teal-light)]'
                      : 'text-slate-300 bg-slate-50'
                  )}>
                    {(prospect as any).client_code || '—'}
                  </span>
                  {clientCodeSaved && <Check className="w-4 h-4 text-green-500" />}
                  <button
                    onClick={() => { setClientCodeEditing(true); setClientCodeSaved(false) }}
                    className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                  {!((prospect as any).client_code) && (
                    <button
                      onClick={async () => {
                        setClientCodeSuggesting(true)
                        setClientCodeEditing(true)
                        setClientCodeSaved(false)
                        try {
                          const res = await fetch(`/api/admin/prospects/${id}/suggest-client-code`)
                          const json = await res.json()
                          if (json.code) setClientCodeInput(json.code)
                        } catch {
                          // leave input blank — admin can type manually
                        } finally {
                          setClientCodeSuggesting(false)
                        }
                      }}
                      disabled={clientCodeSuggesting}
                      className="text-xs text-[var(--teal)] hover:text-[var(--teal-dark)] flex items-center gap-1 disabled:opacity-50"
                      title="Auto-suggest an available code"
                    >
                      {clientCodeSuggesting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Tag className="w-3 h-3" />
                      )}
                      Suggest
                    </button>
                  )}
                </div>
              )}
              {clientCodeError && (
                <p className="text-xs text-red-500">{clientCodeError}</p>
              )}
            </div>
          </Card>

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

      {/* Latest Quote summary — surfaces conversation context above documents */}
      {latestQuote && (
        <div className="mb-4">
          <LatestQuotePanel quote={latestQuote} />
        </div>
      )}

      {/* Documents (invoices + SOWs for this prospect) */}
      <ProspectDocuments prospectId={prospect.id} />

      {/* Edit Modal */}
      {showEdit && (
        <ProspectEditModal prospect={prospect} onClose={() => setShowEdit(false)} />
      )}
    </div>
  )
}

const DEMO_STATUS_COLORS: Record<string, string> = {
  published: 'bg-green-100 text-green-700',
  draft: 'bg-slate-100 text-slate-500',
  archived: 'bg-red-50 text-red-500',
  live: 'bg-green-100 text-green-700',
}

function ProspectDemos({ prospectId, initialDemos }: { prospectId: string; initialDemos: Demo[] }) {
  const queryClient = useQueryClient()
  const [demos, setDemos] = useState<Demo[]>(initialDemos)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({
    demo_url: '',
    platform: 'other' as 'verpex' | 'vercel' | 'netlify' | 'other',
    status: 'published' as 'draft' | 'published' | 'archived',
    page_count: '',
    notes: '',
  })
  const [addError, setAddError] = useState<string | null>(null)
  const [addSaving, setAddSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Keep demos in sync when initial data changes
  useEffect(() => setDemos(initialDemos), [initialDemos])

  async function addDemo() {
    setAddSaving(true)
    setAddError(null)
    try {
      const res = await fetch(`/api/admin/prospects/${prospectId}/demos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          demo_url: addForm.demo_url,
          platform: addForm.platform,
          status: addForm.status,
          page_count: addForm.page_count ? parseInt(addForm.page_count) : null,
          notes: addForm.notes || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to add demo')
      }
      const { demo } = await res.json()
      setDemos(prev => [demo, ...prev])
      setShowAdd(false)
      setAddForm({ demo_url: '', platform: 'other', status: 'published', page_count: '', notes: '' })
      queryClient.invalidateQueries({ queryKey: ['prospects-all'] })
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Failed to add demo')
    } finally {
      setAddSaving(false)
    }
  }

  async function deleteDemo(demoId: string) {
    setDeletingId(demoId)
    try {
      const res = await fetch(`/api/admin/prospects/${prospectId}/demos/${demoId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setDemos(prev => prev.filter(d => d.id !== demoId))
      setConfirmDeleteId(null)
      queryClient.invalidateQueries({ queryKey: ['prospects-all'] })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <CardTitle>Demos</CardTitle>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="text-xs text-[var(--teal)] hover:text-[var(--teal-dark)] flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Link Demo
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
          <div>
            <label className="text-xs text-slate-500 font-medium">Demo URL *</label>
            <input
              type="url"
              value={addForm.demo_url}
              onChange={e => setAddForm(f => ({ ...f, demo_url: e.target.value }))}
              placeholder="https://..."
              className="mt-0.5 w-full border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500 font-medium">Platform</label>
              <select
                value={addForm.platform}
                onChange={e => setAddForm(f => ({ ...f, platform: e.target.value as typeof addForm.platform }))}
                className="mt-0.5 w-full border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
              >
                <option value="verpex">Verpex</option>
                <option value="vercel">Vercel</option>
                <option value="netlify">Netlify</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">Status</label>
              <select
                value={addForm.status}
                onChange={e => setAddForm(f => ({ ...f, status: e.target.value as typeof addForm.status }))}
                className="mt-0.5 w-full border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium">Page count</label>
            <input
              type="number"
              value={addForm.page_count}
              onChange={e => setAddForm(f => ({ ...f, page_count: e.target.value }))}
              placeholder="e.g. 5"
              min={0}
              className="mt-0.5 w-full border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium">Notes</label>
            <textarea
              value={addForm.notes}
              onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes…"
              rows={2}
              className="mt-0.5 w-full border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[var(--teal)] resize-none"
            />
          </div>
          {addError && <p className="text-xs text-red-500">{addError}</p>}
          <div className="flex gap-2">
            <button
              onClick={addDemo}
              disabled={!addForm.demo_url || addSaving}
              className="px-2.5 py-1.5 bg-[var(--teal)] text-white text-xs font-semibold rounded hover:bg-[var(--teal-dark)] disabled:opacity-40"
            >
              {addSaving ? '…' : 'Link Demo'}
            </button>
            <button
              onClick={() => { setShowAdd(false); setAddError(null) }}
              className="px-2.5 py-1.5 text-xs text-slate-500 border border-slate-200 rounded hover:border-slate-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {demos.length === 0 ? (
        <p className="text-slate-400 text-sm">No demos linked yet.</p>
      ) : (
        <div className="space-y-3">
          {demos.map(demo => (
            <div key={demo.id} className="group border border-slate-100 rounded-lg overflow-hidden">
              {/* Screenshot thumbnail */}
              {demo.screenshot_url && (
                <div className="border-b border-slate-100">
                  <img
                    src={demo.screenshot_url}
                    alt="Demo screenshot"
                    className="w-full h-28 object-cover object-top"
                  />
                </div>
              )}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <a
                      href={demo.demo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[var(--teal-dark)] hover:underline flex items-center gap-1 truncate"
                    >
                      <span className="truncate">{demo.demo_url}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className={cn(
                        'text-[0.65rem] px-1.5 py-0.5 rounded font-medium',
                        DEMO_STATUS_COLORS[demo.status] ?? 'bg-slate-100 text-slate-500'
                      )}>
                        {demo.status}
                      </span>
                      {demo.platform && (
                        <span className="text-[0.65rem] text-slate-500">{demo.platform}</span>
                      )}
                      {demo.version > 0 && (
                        <span className="text-[0.65rem] text-slate-500">v{demo.version}</span>
                      )}
                      {demo.page_count > 0 && (
                        <span className="text-[0.65rem] text-slate-500">{demo.page_count} pages</span>
                      )}
                      {demo.view_count > 0 && (
                        <span className="text-[0.65rem] text-slate-500">{demo.view_count} views</span>
                      )}
                      {demo.last_viewed_at && (
                        <span className="text-[0.65rem] text-slate-400">
                          last viewed {new Date(demo.last_viewed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {demo.notes && (
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{demo.notes}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {confirmDeleteId === demo.id ? (
                      <button
                        onClick={() => deleteDemo(demo.id)}
                        disabled={deletingId === demo.id}
                        className="text-xs text-red-600 font-semibold hover:text-red-800"
                      >
                        {deletingId === demo.id ? '…' : 'Confirm?'}
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(demo.id)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

interface ProspectNote {
  id: string
  body: string
  created_by: string | null
  created_at: string
  updated_at: string
}

function formatTimestampFull(ts: string) {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHr = Math.floor(diffMs / 3_600_000)
  const diffDay = Math.floor(diffMs / 86_400_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ProspectNotes({ prospectId, legacyNotes }: { prospectId: string; legacyNotes: string | null }) {
  const queryClient = useQueryClient()
  const [newBody, setNewBody] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const notesQuery = useQuery({
    queryKey: ['prospect-notes', prospectId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/prospects/${prospectId}/notes`)
      if (!res.ok) throw new Error('Failed to fetch notes')
      return res.json() as Promise<{ notes: ProspectNote[] }>
    },
    enabled: !!prospectId,
  })

  const addMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await fetch(`/api/admin/prospects/${prospectId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to add note')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospect-notes', prospectId] })
      setNewBody('')
      setAddError(null)
    },
    onError: (e: Error) => setAddError(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const res = await fetch(`/api/admin/prospects/${prospectId}/notes/${noteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete note')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospect-notes', prospectId] })
      setConfirmDeleteId(null)
    },
  })

  async function saveEdit(noteId: string) {
    if (!editBody.trim()) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/admin/prospects/${prospectId}/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: editBody.trim() }),
      })
      if (!res.ok) throw new Error('Failed to update note')
      queryClient.invalidateQueries({ queryKey: ['prospect-notes', prospectId] })
      setEditingId(null)
    } finally {
      setSavingEdit(false)
    }
  }

  const notes = notesQuery.data?.notes ?? []

  return (
    <Card>
      <CardTitle>Notes</CardTitle>

      {/* Add note form */}
      <div className="mb-4 pb-4 border-b border-slate-100">
        <textarea
          value={newBody}
          onChange={e => setNewBody(e.target.value)}
          placeholder="Add a note…"
          rows={3}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[var(--teal)] resize-none"
        />
        {addError && <p className="text-xs text-red-500 mt-1">{addError}</p>}
        <div className="flex justify-end mt-2">
          <button
            onClick={() => addMutation.mutate(newBody.trim())}
            disabled={!newBody.trim() || addMutation.isPending}
            className="px-3 py-1.5 bg-[var(--teal)] text-white text-xs font-medium rounded-lg hover:bg-[var(--teal-dark)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {addMutation.isPending ? 'Adding…' : 'Add Note'}
          </button>
        </div>
      </div>

      {/* Notes list */}
      {notesQuery.isLoading ? (
        <p className="text-slate-400 text-sm text-center py-4">Loading…</p>
      ) : notes.length === 0 && !legacyNotes ? (
        <p className="text-slate-400 text-sm text-center py-2">No notes yet.</p>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div key={note.id} className="group border border-slate-100 rounded-lg p-3 bg-slate-50">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editBody}
                    onChange={e => setEditBody(e.target.value)}
                    rows={4}
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-[var(--teal)] resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(note.id)}
                      disabled={savingEdit || !editBody.trim()}
                      className="px-2.5 py-1 bg-[var(--teal)] text-white text-xs font-semibold rounded hover:bg-[var(--teal-dark)] disabled:opacity-40"
                    >
                      {savingEdit ? '…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2.5 py-1 text-xs text-slate-500 border border-slate-200 rounded hover:border-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{note.body}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-xs text-slate-400 cursor-default"
                        title={new Date(note.created_at).toLocaleString()}
                      >
                        {formatTimestampFull(note.created_at)}
                      </span>
                      {note.created_by && (
                        <>
                          <span className="text-slate-300 text-xs">·</span>
                          <span className="text-xs text-slate-400">{note.created_by}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingId(note.id); setEditBody(note.body) }}
                        className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-0.5"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      {confirmDeleteId === note.id ? (
                        <button
                          onClick={() => deleteMutation.mutate(note.id)}
                          disabled={deleteMutation.isPending}
                          className="text-xs text-red-600 font-semibold hover:text-red-800"
                        >
                          Confirm?
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(note.id)}
                          className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-0.5"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Legacy notes (read-only) */}
          {legacyNotes && (
            <div className="border border-dashed border-slate-200 rounded-lg p-3 bg-white">
              <p className="text-[0.65rem] font-semibold text-slate-400 uppercase tracking-wider mb-1">Legacy Notes (read-only)</p>
              <p className="text-sm text-slate-500 whitespace-pre-wrap leading-relaxed">{legacyNotes}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function ProspectDocuments({ prospectId }: { prospectId: string }) {
  const [invoices, setInvoices] = useState<
    Array<{
      id: string
      invoice_number: string
      kind: string
      status: string
      total_due_cents: number
      created_at: string
    }>
  >([])
  const [sows, setSows] = useState<
    Array<{
      id: string
      sow_number: string
      title: string
      status: string
      pricing: { total_cents: number }
      created_at: string
    }>
  >([])
  const [quotes, setQuotes] = useState<
    Array<{
      id: string
      doc_number: string | null
      status: string
      estimate_low: number | null
      estimate_high: number | null
      created_at: string
    }>
  >([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/invoices?prospect_id=${prospectId}&limit=50`).then((r) => r.json()),
      fetch(`/api/admin/sow?prospect_id=${prospectId}`).then((r) => r.json()),
      fetch(`/api/admin/prospects/${prospectId}/quotes`).then((r) => r.json()),
    ])
      .then(([invData, sowData, qData]) => {
        setInvoices(invData.invoices ?? [])
        setSows(sowData.sows ?? [])
        setQuotes(qData.quotes ?? [])
      })
      .finally(() => setLoading(false))
  }, [prospectId])

  if (loading) return null
  if (invoices.length === 0 && sows.length === 0 && quotes.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 mt-6">
        <h2 className="font-semibold text-slate-900 mb-2">Documents</h2>
        <p className="text-sm text-slate-400">No invoices or SOWs yet.</p>
        <div className="flex gap-2 mt-3">
          <Link
            href={`/admin/invoices/new?prospect_id=${prospectId}`}
            className="bg-teal-500 text-white rounded px-3 py-1 text-xs font-semibold"
          >
            + New Invoice
          </Link>
          <Link
            href={`/admin/sow/new?prospect_id=${prospectId}`}
            className="bg-slate-100 hover:bg-slate-200 rounded px-3 py-1 text-xs font-semibold"
          >
            + New SOW
          </Link>
        </div>
      </div>
    )
  }

  const statusColor = (s: string) => {
    if (s === 'paid' || s === 'accepted') return 'bg-emerald-100 text-emerald-700'
    if (s === 'void' || s === 'declined') return 'bg-red-100 text-red-700'
    if (s === 'sent' || s === 'viewed') return 'bg-blue-100 text-blue-700'
    return 'bg-slate-100 text-slate-700'
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Documents</h2>
        <div className="flex gap-2">
          <Link
            href={`/admin/invoices/new?prospect_id=${prospectId}`}
            className="bg-teal-500 text-white rounded px-3 py-1 text-xs font-semibold"
          >
            + Invoice
          </Link>
          <Link
            href={`/admin/sow/new?prospect_id=${prospectId}`}
            className="bg-slate-100 hover:bg-slate-200 rounded px-3 py-1 text-xs font-semibold"
          >
            + SOW
          </Link>
        </div>
      </div>

      {quotes.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Quotes (EST)</div>
          <div className="space-y-1">
            {quotes.map((q) => (
              <Link
                key={q.id}
                href={`/admin/quotes/${q.id}`}
                className="flex items-center justify-between text-sm hover:bg-slate-50 -mx-2 px-2 py-1 rounded"
              >
                <span className="font-mono text-xs text-slate-600">{q.doc_number ?? '—'}</span>
                <span className="flex-1 mx-3 text-xs text-slate-500">{q.status}</span>
                <span>
                  {q.estimate_low != null && q.estimate_high != null
                    ? `$${Math.round(q.estimate_low / 100)}-$${Math.round(q.estimate_high / 100)}`
                    : '—'}
                </span>
                <span className="ml-3 text-[10px] text-slate-400">
                  {new Date(q.created_at).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {sows.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">SOWs</div>
          <div className="space-y-1">
            {sows.map((s) => (
              <Link
                key={s.id}
                href={`/admin/sow/${s.id}`}
                className="flex items-center justify-between text-sm hover:bg-slate-50 -mx-2 px-2 py-1 rounded"
              >
                <span className="font-mono text-xs text-slate-600">{s.sow_number}</span>
                <span className="flex-1 truncate mx-3">{s.title}</span>
                <span>${(s.pricing.total_cents / 100).toLocaleString()}</span>
                <span className={`ml-3 text-[10px] rounded px-1.5 py-0.5 ${statusColor(s.status)}`}>
                  {s.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {invoices.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Invoices</div>
          <div className="space-y-1">
            {invoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/admin/invoices/${inv.id}`}
                className="flex items-center justify-between text-sm hover:bg-slate-50 -mx-2 px-2 py-1 rounded"
              >
                <span className="font-mono text-xs text-slate-600">{inv.invoice_number}</span>
                <span className="flex-1 mx-3 text-xs text-slate-500">{inv.kind}</span>
                <span>${(inv.total_due_cents / 100).toFixed(2)}</span>
                <span className={`ml-3 text-[10px] rounded px-1.5 py-0.5 ${statusColor(inv.status)}`}>
                  {inv.status}
                </span>
                <span className="ml-2 text-[10px] text-slate-400">
                  {new Date(inv.created_at).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
