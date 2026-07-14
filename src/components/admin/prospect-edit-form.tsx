'use client'

// Full-page prospect/client edit form. Replaces the old ProspectEditModal —
// same fields and save behavior, rendered as a page instead of a dialog, and
// with a Client Code field (drives INV/SOW/RCT numbering).
//
// Mounted by /admin/clients/[id]/edit and /admin/prospects/[id]/edit. The
// server page fetches the prospect + demos and passes them as `initial`;
// `returnTo` is where Save/Cancel navigate back to.

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Plus, Trash2, ChevronDown, ChevronRight, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STAGES, STAGE_LABELS, INDUSTRIES } from '@/types/database'
import type { Prospect, Demo, Deal } from '@/types/database'
import { countriesForPicker, isInternational } from '@/lib/countries'

type EditableProspect = Prospect & { demos?: Demo[]; deals?: Deal[] }

interface ProspectEditFormProps {
  prospect: EditableProspect
  returnTo: string
}

function SectionHeader({ title, open, toggle }: { title: string; open: boolean; toggle: () => void }) {
  return (
    <button type="button" onClick={toggle} className="flex items-center gap-2 w-full text-left py-2 border-b border-slate-200 mb-3">
      {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      <span className="text-sm font-semibold text-slate-700 uppercase tracking-wider">{title}</span>
    </button>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1', className)}>
      <label className="text-xs font-medium text-slate-500">{label}</label>
      {children}
    </div>
  )
}

const inputClass = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-[var(--teal)] bg-white'
const selectClass = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-[var(--teal)] bg-white appearance-none'
const textareaClass = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-[var(--teal)] bg-white resize-y font-mono'

export function ProspectEditForm({ prospect, returnTo }: ProspectEditFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()

  // ── Form state ──
  const [form, setForm] = useState({
    business_name: prospect.business_name,
    client_code: prospect.client_code || '',
    industry: prospect.industry || '',
    address: prospect.address || '',
    city: prospect.city || '',
    state: prospect.state || '',
    zip: prospect.zip || '',
    country: (prospect as { country?: string | null }).country || 'US',
    owner_name: prospect.owner_name || '',
    owner_email: prospect.owner_email || '',
    owner_phone: prospect.owner_phone || '',
    business_phone: prospect.business_phone || '',
    business_email: prospect.business_email || '',
    website_url: prospect.website_url || '',
    google_rating: prospect.google_rating?.toString() || '',
    google_review_count: prospect.google_review_count?.toString() || '',
    yelp_rating: prospect.yelp_rating?.toString() || '',
    yelp_review_count: prospect.yelp_review_count?.toString() || '',
    site_quality_score: prospect.site_quality_score?.toString() || '',
    stage: prospect.stage,
    source: prospect.source,
    tags: prospect.tags?.join(', ') || '',
    notes: prospect.notes || '',
  })

  const [researchJson, setResearchJson] = useState(JSON.stringify(prospect.research_data || {}, null, 2))
  const [scoreJson, setScoreJson] = useState(JSON.stringify(prospect.score_factors || {}, null, 2))

  const [demos, setDemos] = useState<(Demo & { _deleted?: boolean; _new?: boolean })[]>(
    (prospect.demos || []).map(d => ({ ...d }))
  )

  const [sections, setSections] = useState({
    core: true, contact: true, ratings: true, pipeline: true,
    research: false, scoring: false, demos: true, notes: true,
  })
  const toggle = (key: keyof typeof sections) => setSections(s => ({ ...s, [key]: !s[key] }))

  const set = (key: keyof typeof form, value: string) => setForm(f => ({ ...f, [key]: value }))

  // ── Client-code live availability check ──
  // 'idle' when blank/unchanged, 'invalid' for a bad shape, otherwise
  // 'checking' → 'available' | { taken }. Mirrors the editor pattern the
  // prospect page shipped with.
  type CodeStatus = 'idle' | 'invalid' | 'checking' | 'available' | { taken: string }
  const [codeStatus, setCodeStatus] = useState<CodeStatus>('idle')
  const codeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* eslint-disable react-hooks/set-state-in-effect --
     Synchronous status resets (idle/invalid) are intentional cheap flags, not
     cascading data updates; the async availability result is set from the
     debounced callback, which the rule permits. */
  useEffect(() => {
    if (codeDebounceRef.current) clearTimeout(codeDebounceRef.current)
    const code = form.client_code.trim().toUpperCase()
    if (!code || code === (prospect.client_code || '').toUpperCase()) {
      setCodeStatus('idle')
      return
    }
    if (!/^[A-Z]{4}$/.test(code)) {
      setCodeStatus('invalid')
      return
    }
    setCodeStatus('checking')
    codeDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/prospects/client-code-available?code=${code}&except_id=${prospect.id}`)
        const j = await res.json()
        if (j.available) setCodeStatus('available')
        else if (j.error) setCodeStatus('invalid')
        else setCodeStatus({ taken: j.taken_by?.business_name ?? 'another client' })
      } catch {
        setCodeStatus('idle') // don't block save on a lookup failure
      }
    }, 400)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.client_code, prospect.client_code, prospect.id])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Auto-suggest a code from the business name (client mirror of the server's
  // suggestClientCode: strip noise words/suffixes, take initials).
  function suggestCode() {
    const NOISE = new Set([
      'THE','AND','OF','FOR','AT','TO','OR','A','AN',
      'INC','LLC','CO','CORP','PC','PLLC','LTD','LP','CPA','CPAS','OD','DMD','DO',
    ])
    const DIGIT: Record<string, string> = {
      '0':'Z','1':'O','2':'T','3':'T','4':'F','5':'F','6':'S','7':'S','8':'E','9':'N',
    }
    const raw = (form.business_name.match(/[A-Za-z]+|[0-9]+/g) ?? [])
      .map(t => (/^[0-9]+$/.test(t) ? (DIGIT[t[0]] ?? '') : t))
      .filter(t => t.length > 0 && !/^[A-Za-z]$/.test(t) && !NOISE.has(t.toUpperCase()))
    let base: string
    if (raw.length === 0) base = 'XXXX'
    else if (raw.length === 1) base = raw[0].length >= 4 ? raw[0].slice(0, 4) : raw[0].padEnd(4, raw[0].slice(-1))
    else base = raw.map(t => t.slice(0, 2)).join('').slice(0, 4)
    if (base.length < 4) base = base.padEnd(4, base.slice(-1) || 'X')
    set('client_code', base.toUpperCase())
  }

  // ── Save ──
  const saveMutation = useMutation({
    mutationFn: async () => {
      let researchData: Record<string, any> = {}
      let scoreFactors: Record<string, any> = {}
      try { researchData = JSON.parse(researchJson) } catch { throw new Error('Invalid JSON in Research Data') }
      try { scoreFactors = JSON.parse(scoreJson) } catch { throw new Error('Invalid JSON in Score Factors') }

      // Client code — normalize; blank clears (null). Saved via the /[id]
      // endpoint below (not the collection PATCH) because that route enforces
      // the format AND collision-checks the unique index, so a duplicate
      // returns a friendly 409 instead of a raw Postgres 500.
      const codeRaw = form.client_code.trim().toUpperCase()
      if (codeRaw && !/^[A-Z]{4}$/.test(codeRaw)) {
        throw new Error('Client code must be exactly 4 letters (A–Z).')
      }
      const codeChanged = codeRaw !== (prospect.client_code || '')

      const updates: Record<string, any> = {
        id: prospect.id,
        business_name: form.business_name,
        industry: form.industry || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        zip: form.zip || null,
        country: form.country || 'US',
        owner_name: form.owner_name || null,
        owner_email: form.owner_email || null,
        owner_phone: form.owner_phone || null,
        business_phone: form.business_phone || null,
        business_email: form.business_email || null,
        website_url: form.website_url || null,
        google_rating: form.google_rating ? parseFloat(form.google_rating) : null,
        google_review_count: form.google_review_count ? parseInt(form.google_review_count) : null,
        yelp_rating: form.yelp_rating ? parseFloat(form.yelp_rating) : null,
        yelp_review_count: form.yelp_review_count ? parseInt(form.yelp_review_count) : null,
        site_quality_score: form.site_quality_score ? parseInt(form.site_quality_score) : null,
        stage: form.stage,
        source: form.source,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        notes: form.notes || null,
        research_data: researchData,
        score_factors: scoreFactors,
      }

      const hasNewDemo = demos.some(d => d._new && !d._deleted)
      if (hasNewDemo && updates.stage === 'researched') {
        updates.stage = 'demo_built'
      }

      const prospectRes = await fetch('/api/admin/prospects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!prospectRes.ok) {
        const err = await prospectRes.json()
        throw new Error(err.error || 'Failed to save prospect')
      }

      // Save client_code via /[id] (validates format + collision).
      if (codeChanged) {
        const codeRes = await fetch(`/api/admin/prospects/${prospect.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_code: codeRaw || null }),
        })
        if (!codeRes.ok) {
          const err = await codeRes.json().catch(() => ({}))
          throw new Error(err.error || 'Failed to save client code')
        }
      }

      // Save demos — create, update, delete.
      for (const demo of demos) {
        if (demo._deleted && !demo._new) {
          await fetch('/api/admin/demos', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: demo.id }),
          })
        } else if (demo._new && !demo._deleted) {
          const { _new, _deleted, id, created_at, updated_at, ...rest } = demo
          await fetch('/api/admin/demos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...rest, prospect_id: prospect.id }),
          })
        } else if (!demo._deleted && !demo._new) {
          const { _new, _deleted, created_at, updated_at, ...rest } = demo
          await fetch('/api/admin/demos', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rest),
          })
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects-all'] })
      router.push(returnTo)
      router.refresh()
    },
  })

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => router.push(returnTo)}
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600 mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Edit {prospect.business_name}</h1>
          <p className="text-xs text-slate-400 mt-1">
            ID: {prospect.id.slice(0, 8)}… · Created {new Date(prospect.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {saveMutation.isError && (
            <span className="text-xs text-red-500 mr-1 max-w-[240px] text-right">{saveMutation.error?.message}</span>
          )}
          <button
            type="button"
            onClick={() => router.push(returnTo)}
            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--teal)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--teal-dark)] transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? 'Saving…' : 'Save All'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5 space-y-4">
        {/* ── Business Info ── */}
        <SectionHeader title="Business Info" open={sections.core} toggle={() => toggle('core')} />
        {sections.core && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Business Name" className="sm:col-span-2">
              <input className={inputClass} value={form.business_name} onChange={e => set('business_name', e.target.value)} />
            </Field>
            <Field label="Client Code" className="sm:col-span-2">
              <div className="flex items-center gap-2">
                <input
                  className={cn(inputClass, 'font-mono uppercase tracking-widest max-w-[8rem]')}
                  value={form.client_code}
                  onChange={e => set('client_code', e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
                  placeholder="ABCD"
                  maxLength={4}
                  aria-describedby="client-code-help"
                />
                <button type="button" onClick={suggestCode} className="text-xs text-[var(--teal)] font-medium hover:underline whitespace-nowrap">
                  Suggest
                </button>
                {codeStatus === 'checking' && <span className="text-xs text-slate-400">Checking…</span>}
                {codeStatus === 'available' && <span className="text-xs text-green-600">✓ Available</span>}
                {codeStatus === 'invalid' && <span className="text-xs text-amber-600">Needs 4 letters</span>}
                {typeof codeStatus === 'object' && (
                  <span className="text-xs text-red-500">Taken by {codeStatus.taken}</span>
                )}
              </div>
              <p id="client-code-help" className="text-[11px] text-slate-400">
                4 uppercase letters. Used to number invoices, SOWs &amp; receipts (e.g. INV-{form.client_code || 'ABCD'}-042326A). Required before issuing documents.
              </p>
            </Field>
            <Field label="Industry">
              <select className={selectClass} value={form.industry} onChange={e => set('industry', e.target.value)}>
                <option value="">— Select —</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="Website URL">
              <input className={inputClass} value={form.website_url} onChange={e => set('website_url', e.target.value)} placeholder="https://..." />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <input className={inputClass} value={form.address} onChange={e => set('address', e.target.value)} />
            </Field>
            <Field label="City">
              <input className={inputClass} value={form.city} onChange={e => set('city', e.target.value)} />
            </Field>
            <Field label={isInternational(form.country) ? 'State / region' : 'State'}>
              <input
                className={inputClass}
                value={form.state}
                onChange={e => set('state', e.target.value)}
                maxLength={isInternational(form.country) ? undefined : 2}
                placeholder={isInternational(form.country) ? '' : 'CA'}
              />
            </Field>
            <Field label={isInternational(form.country) ? 'Postal code' : 'ZIP'}>
              <input
                className={inputClass}
                value={form.zip}
                onChange={e => set('zip', e.target.value)}
                maxLength={isInternational(form.country) ? undefined : 10}
              />
            </Field>
            <Field label="Country">
              <select className={selectClass} value={form.country} onChange={e => set('country', e.target.value)}>
                {countriesForPicker().map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Source">
              <input className={inputClass} value={form.source} onChange={e => set('source', e.target.value)} />
            </Field>
          </div>
        )}

        {/* ── Contact ── */}
        <SectionHeader title="Contact" open={sections.contact} toggle={() => toggle('contact')} />
        {sections.contact && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Owner Name">
              <input className={inputClass} value={form.owner_name} onChange={e => set('owner_name', e.target.value)} />
            </Field>
            <Field label="Owner Email">
              <input className={inputClass} type="email" value={form.owner_email} onChange={e => set('owner_email', e.target.value)} />
            </Field>
            <Field label="Owner Phone">
              <input className={inputClass} value={form.owner_phone} onChange={e => set('owner_phone', e.target.value)} />
            </Field>
            <Field label="Business Phone">
              <input className={inputClass} value={form.business_phone} onChange={e => set('business_phone', e.target.value)} />
            </Field>
            <Field label="Business Email" className="sm:col-span-2">
              <input className={inputClass} type="email" value={form.business_email} onChange={e => set('business_email', e.target.value)} />
            </Field>
          </div>
        )}

        {/* ── Ratings ── */}
        <SectionHeader title="Ratings & Quality" open={sections.ratings} toggle={() => toggle('ratings')} />
        {sections.ratings && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Google Rating">
              <input className={inputClass} type="number" step="0.1" min="0" max="5" value={form.google_rating} onChange={e => set('google_rating', e.target.value)} />
            </Field>
            <Field label="Google Reviews">
              <input className={inputClass} type="number" min="0" value={form.google_review_count} onChange={e => set('google_review_count', e.target.value)} />
            </Field>
            <Field label="Yelp Rating">
              <input className={inputClass} type="number" step="0.1" min="0" max="5" value={form.yelp_rating} onChange={e => set('yelp_rating', e.target.value)} />
            </Field>
            <Field label="Yelp Reviews">
              <input className={inputClass} type="number" min="0" value={form.yelp_review_count} onChange={e => set('yelp_review_count', e.target.value)} />
            </Field>
            <Field label="Site Quality (0-100)">
              <input className={inputClass} type="number" min="0" max="100" value={form.site_quality_score} onChange={e => set('site_quality_score', e.target.value)} />
            </Field>
          </div>
        )}

        {/* ── Pipeline ── */}
        <SectionHeader title="Pipeline & Tags" open={sections.pipeline} toggle={() => toggle('pipeline')} />
        {sections.pipeline && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Stage">
              <select className={selectClass} value={form.stage} onChange={e => set('stage', e.target.value)}>
                {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
              </select>
            </Field>
            <Field label="Tags (comma-separated)">
              <input className={inputClass} value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="whale, top-10, urgent" />
            </Field>
          </div>
        )}

        {/* ── Research Data (JSON) ── */}
        <SectionHeader title="Research Data (JSON)" open={sections.research} toggle={() => toggle('research')} />
        {sections.research && (
          <Field label="research_data">
            <textarea className={textareaClass} rows={16} value={researchJson} onChange={e => setResearchJson(e.target.value)} spellCheck={false} />
            {(() => {
              try { JSON.parse(researchJson); return <span className="text-xs text-green-500">Valid JSON</span> }
              catch (e: any) { return <span className="text-xs text-red-500">Invalid JSON: {e.message}</span> }
            })()}
          </Field>
        )}

        {/* ── Score Factors (JSON) ── */}
        <SectionHeader title="Score Factors (JSON)" open={sections.scoring} toggle={() => toggle('scoring')} />
        {sections.scoring && (
          <Field label="score_factors">
            <textarea className={textareaClass} rows={12} value={scoreJson} onChange={e => setScoreJson(e.target.value)} spellCheck={false} />
            {(() => {
              try { JSON.parse(scoreJson); return <span className="text-xs text-green-500">Valid JSON</span> }
              catch (e: any) { return <span className="text-xs text-red-500">Invalid JSON: {e.message}</span> }
            })()}
          </Field>
        )}

        {/* ── Demos ── */}
        <SectionHeader title="Demo Sites" open={sections.demos} toggle={() => toggle('demos')} />
        {sections.demos && (
          <div className="space-y-3">
            {demos.filter(d => !d._deleted).map((demo, i) => (
              <div key={demo.id || `new-${i}`} className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    {demo._new ? 'New Demo' : `Demo ${demo.id.slice(0, 8)}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDemos(ds => ds.map(d => d === demo ? { ...d, _deleted: true } : d))}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Field label="Demo URL">
                    <input className={inputClass} value={demo.demo_url} onChange={e => setDemos(ds => ds.map(d => d === demo ? { ...d, demo_url: e.target.value } : d))} />
                  </Field>
                  <Field label="Platform">
                    <input className={inputClass} value={demo.platform} onChange={e => setDemos(ds => ds.map(d => d === demo ? { ...d, platform: e.target.value } : d))} placeholder="next.js, wordpress..." />
                  </Field>
                  <Field label="Status">
                    <select className={selectClass} value={demo.status} onChange={e => setDemos(ds => ds.map(d => d === demo ? { ...d, status: e.target.value } : d))}>
                      <option value="draft">Draft</option>
                      <option value="live">Live</option>
                    </select>
                  </Field>
                  <Field label="Pages">
                    <input className={inputClass} type="number" min="0" value={demo.page_count} onChange={e => setDemos(ds => ds.map(d => d === demo ? { ...d, page_count: parseInt(e.target.value) || 0 } : d))} />
                  </Field>
                  <Field label="Generation Method">
                    <input className={inputClass} value={demo.generation_method || ''} onChange={e => setDemos(ds => ds.map(d => d === demo ? { ...d, generation_method: e.target.value } : d))} placeholder="manual, ai, vibe..." />
                  </Field>
                  <Field label="Version">
                    <input className={inputClass} type="number" min="1" value={demo.version} onChange={e => setDemos(ds => ds.map(d => d === demo ? { ...d, version: parseInt(e.target.value) || 1 } : d))} />
                  </Field>
                </div>
                <Field label="Notes">
                  <textarea className={cn(textareaClass, 'font-sans')} rows={2} value={demo.notes || ''} onChange={e => setDemos(ds => ds.map(d => d === demo ? { ...d, notes: e.target.value } : d))} />
                </Field>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setDemos(ds => [...ds, {
                id: `new-${Date.now()}`, prospect_id: prospect.id, demo_url: '', platform: 'next.js',
                status: 'draft', version: 1, page_count: 1, generation_method: 'ai',
                view_count: 0, last_viewed_at: null, unique_visitors: 0,
                screenshot_url: null, build_log: null, notes: null,
                created_at: '', updated_at: '', _new: true,
              } as any])}
              className="flex items-center gap-1.5 text-xs text-[var(--teal)] font-medium hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Add Demo
            </button>
          </div>
        )}

        {/* ── Notes ── */}
        <SectionHeader title="Notes" open={sections.notes} toggle={() => toggle('notes')} />
        {sections.notes && (
          <Field label="Free-form notes">
            <textarea className={cn(textareaClass, 'font-sans')} rows={6} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </Field>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={() => router.push(returnTo)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex items-center gap-1.5 px-4 py-2 bg-[var(--teal)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--teal-dark)] transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Saving…' : 'Save All'}
        </button>
      </div>
    </div>
  )
}
