'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Save, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STAGES, STAGE_LABELS, INDUSTRIES } from '@/types/database'
import type { Prospect, Demo, Deal } from '@/types/database'
import { countriesForPicker, isInternational } from '@/lib/countries'

// ─── Types ──────────────────────────────────────────────────

type EditableProspect = Prospect & { demos?: Demo[]; deals?: Deal[] }

interface ProspectEditModalProps {
  prospect: EditableProspect
  onClose: () => void
}

// ─── Helpers ────────────────────────────────────────────────

function SectionHeader({ title, open, toggle }: { title: string; open: boolean; toggle: () => void }) {
  return (
    <button onClick={toggle} className="flex items-center gap-2 w-full text-left py-2 border-b border-slate-200 mb-3">
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

// ─── Component ──────────────────────────────────────────────

export function ProspectEditModal({ prospect, onClose }: ProspectEditModalProps) {
  const queryClient = useQueryClient()

  // ── Form state ──
  const [form, setForm] = useState({
    business_name: prospect.business_name,
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

  const [researchJson, setResearchJson] = useState(
    JSON.stringify(prospect.research_data || {}, null, 2)
  )
  const [scoreJson, setScoreJson] = useState(
    JSON.stringify(prospect.score_factors || {}, null, 2)
  )

  // Demo editing
  const [demos, setDemos] = useState<(Demo & { _deleted?: boolean; _new?: boolean })[]>(
    (prospect.demos || []).map(d => ({ ...d }))
  )

  // Section toggles
  const [sections, setSections] = useState({
    core: true, contact: true, ratings: true, pipeline: true,
    research: false, scoring: false, demos: true, notes: true,
  })
  const toggle = (key: keyof typeof sections) => setSections(s => ({ ...s, [key]: !s[key] }))

  // ── Mutations ──
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Parse JSON fields
      let researchData: Record<string, any> = {}
      let scoreFactors: Record<string, any> = {}
      try { researchData = JSON.parse(researchJson) } catch { throw new Error('Invalid JSON in Research Data') }
      try { scoreFactors = JSON.parse(scoreJson) } catch { throw new Error('Invalid JSON in Score Factors') }

      // Build prospect update
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

      // Auto-advance stage to demo_built if adding a new demo and still on researched
      const hasNewDemo = demos.some(d => d._new && !d._deleted)
      if (hasNewDemo && updates.stage === 'researched') {
        updates.stage = 'demo_built'
      }

      // Save prospect
      const prospectRes = await fetch('/api/admin/prospects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!prospectRes.ok) {
        const err = await prospectRes.json()
        throw new Error(err.error || 'Failed to save prospect')
      }

      // Save demos — create, update, delete
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
      onClose()
    },
  })

  const set = (key: keyof typeof form, value: string) => setForm(f => ({ ...f, [key]: value }))

  // ── Escape key ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[calc(100vh-4rem)] overflow-y-auto border border-slate-200">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
          <h2 className="text-lg font-bold text-slate-800">Edit Prospect</h2>
          <div className="flex items-center gap-2">
            {saveMutation.isError && (
              <span className="text-xs text-red-500 mr-2">{saveMutation.error?.message}</span>
            )}
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-[var(--teal)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--teal-dark)] transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? 'Saving…' : 'Save All'}
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* ── Core Info ── */}
          <SectionHeader title="Business Info" open={sections.core} toggle={() => toggle('core')} />
          {sections.core && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Business Name" className="sm:col-span-2">
                <input className={inputClass} value={form.business_name} onChange={e => set('business_name', e.target.value)} />
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
                {/* maxLength only applies to US 2-letter codes; international
                    regions (Bangkok, Queensland, etc.) need full text. */}
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
                <select
                  className={selectClass}
                  value={form.country}
                  onChange={e => set('country', e.target.value)}
                >
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
              <textarea
                className={textareaClass}
                rows={16}
                value={researchJson}
                onChange={e => setResearchJson(e.target.value)}
                spellCheck={false}
              />
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
              <textarea
                className={textareaClass}
                rows={12}
                value={scoreJson}
                onChange={e => setScoreJson(e.target.value)}
                spellCheck={false}
              />
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
              <textarea
                className={cn(textareaClass, 'font-sans')}
                rows={6}
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
              />
            </Field>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between rounded-b-2xl">
          <span className="text-xs text-slate-400">
            ID: {prospect.id.slice(0, 8)}… · Created {new Date(prospect.created_at).toLocaleDateString()}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
              Cancel
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-[var(--teal)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--teal-dark)] transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? 'Saving…' : 'Save All'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
