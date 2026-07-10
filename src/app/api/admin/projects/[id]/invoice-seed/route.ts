// GET /api/admin/projects/[id]/invoice-seed
//
// Returns the three candidate data sources for seeding an invoice from a
// project. Called by GenerateInvoiceModal on /admin/projects/[id].
//
// Response shape:
//   {
//     project:           { id, name, prospect_id }
//     prospect:          { id, business_name, owner_name, owner_email }
//     deliverables_seed: { lines: CreateLineItem[] }   // delivered-only
//     time_entries_seed: {
//       lines: CreateLineItem[]                        // grouped by phase
//       entry_ids: string[]                            // IDs to mark covered after invoice creation
//     }
//   }
//
// Each seed's lines[] is shaped to match POST /api/admin/invoices'
// CreateLineItem so the modal can submit them verbatim.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface CreateLineItem {
  description: string
  quantity: number
  unit_price_cents: number
  cadence: 'one_time' | 'monthly' | 'quarterly' | 'annual'
}

function formatHours(h: number): string {
  // 22.25 → "22.25", 22 → "22"
  return Number.isInteger(h) ? String(h) : String(Math.round(h * 100) / 100)
}

function formatCentsInline(cents: number): string {
  // Tiny inline formatter (avoid importing /lib/format for a route).
  const dollars = (cents / 100).toFixed(2)
  return `$${dollars}`
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { id } = await ctx.params

  // Project + phases/deliverables JSON
  const { data: project, error: projErr } = await supabaseAdmin
    .from('projects')
    .select('id, name, prospect_id, phases')
    .eq('id', id)
    .maybeSingle()

  if (projErr) return NextResponse.json({ error: projErr.message }, { status: 500 })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  // Prospect snippet for the modal header
  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('id, business_name, owner_name, owner_email')
    .eq('id', project.prospect_id)
    .maybeSingle()

  // ── Deliverables seed ─────────────────────────────────────────────
  // Only status='delivered' deliverables get pre-selected (one-off
  // billing-after-completion workflow). Pending deliverables excluded;
  // user can add lines manually after generation if they want to bill ahead.
  //
  // SCHEMA NOTE: invoice_line_items.quantity is `integer NOT NULL`. The
  // existing /admin/invoices/new surface handles fractional hours by
  // putting hours in the description and setting quantity=1 with the
  // full line total as unit_price_cents. We follow the same convention
  // here so deliverables/time-entry seeded invoices match the rest of
  // the codebase (and don't fail with `invalid input syntax for type
  // integer: "22.25"` on insert).
  const deliverablesLines: CreateLineItem[] = []
  const phases = Array.isArray(project.phases) ? project.phases : []
  for (const phase of phases) {
    const phaseName = typeof phase?.name === 'string' && phase.name.trim() ? phase.name.trim() : 'Phase'
    const delivs = Array.isArray(phase?.deliverables) ? phase.deliverables : []
    for (const d of delivs) {
      if (d?.status !== 'delivered') continue
      // Resolve the full line total cents. Priority: stored line_total_cents
      // > hours × unit_price > quantity × unit_price > unit_price > 0.
      const lineTotalCents = (() => {
        if (typeof d.line_total_cents === 'number' && d.line_total_cents >= 0) {
          return d.line_total_cents
        }
        const unit = typeof d.unit_price_cents === 'number' ? d.unit_price_cents : 0
        if (typeof d.hours === 'number' && d.hours > 0) {
          return Math.round(d.hours * unit)
        }
        if (typeof d.quantity === 'number' && d.quantity > 0) {
          return Math.round(d.quantity * unit)
        }
        return unit
      })()

      // Compose a sensible name. Real deliverables have a `.name`; some
      // projects only track at phase granularity and leave it blank. Falling
      // back to phase description means we never ship "Phase 1 — Deliverable"
      // to a client, which is meaningless. Priority:
      //   1. `${phaseName} — ${d.name}` (most specific)
      //   2. `${phaseName} — ${phase.description}` (phase-only project)
      //   3. `${phaseName}` (last resort)
      const delivName = typeof d.name === 'string' ? d.name.trim() : ''
      const phaseDesc = typeof phase?.description === 'string' ? phase.description.trim() : ''
      const composed =
        delivName ? `${phaseName} — ${delivName}` :
        phaseDesc ? `${phaseName} — ${phaseDesc}` :
        phaseName

      // Note: we DO NOT filter $0 deliverables. Per Hunter 2026-06-19:
      // every delivered phase should be visible in the invoice so the
      // user can either set a price at invoice time, convert to TIK,
      // or document the line at $0 (e.g. value-stack / included work).
      // Filtering them hides work that was done.

      const hoursSuffix = (typeof d.hours === 'number' && d.hours > 0)
        ? ` (${formatHours(d.hours)} hrs)`
        : ''
      deliverablesLines.push({
        description: `${composed}${hoursSuffix}`,
        quantity: 1,
        unit_price_cents: lineTotalCents,
        cadence: d.cadence ?? 'one_time',
      })
    }
  }

  // ── Time-entries seed ─────────────────────────────────────────────
  // Group by phase_id; one summary line per phase. Entries with null
  // phase_id collapse into an "Other work" bucket. Within a phase, we
  // sum hours and weight-average the hourly rate (rare for entries in
  // the same phase to have different rates, but supported).
  //
  // Only entries that have NOT already been covered by a prior invoice
  // (covered_by_invoice_id IS NULL) are included — prevents double billing.

  const { data: timeEntries } = await supabaseAdmin
    .from('project_time_entries')
    .select('id, phase_id, hours, hourly_rate_cents, description, llm_billable_cents')
    .eq('project_id', id)
    .is('covered_by_invoice_id', null)

  const timeLines: CreateLineItem[] = []
  const timeEntryIds: string[] = []

  if (timeEntries && timeEntries.length > 0) {
    // Build phaseId -> phaseName lookup from the project.phases JSON
    const phaseNameById = new Map<string, string>()
    for (const phase of phases) {
      if (typeof phase?.id === 'string' && typeof phase?.name === 'string') {
        phaseNameById.set(phase.id, phase.name)
      }
    }

    // Bucket entries by phase_id (null → "__other__")
    const buckets = new Map<string, {
      label: string
      totalHours: number
      weightedRateNumerator: number
      entryIds: string[]
    }>()

    for (const e of timeEntries) {
      const bucketKey = e.phase_id ?? '__other__'
      const label = e.phase_id
        ? (phaseNameById.get(e.phase_id) ?? 'Phase')
        : 'Other work'
      const hours = Number(e.hours) || 0
      const rate = Number(e.hourly_rate_cents) || 0
      const existing = buckets.get(bucketKey) ?? {
        label,
        totalHours: 0,
        weightedRateNumerator: 0,
        entryIds: [],
      }
      existing.totalHours += hours
      existing.weightedRateNumerator += hours * rate
      existing.entryIds.push(e.id)
      buckets.set(bucketKey, existing)
    }

    for (const bucket of buckets.values()) {
      if (bucket.totalHours <= 0) continue
      const avgRate = Math.round(bucket.weightedRateNumerator / bucket.totalHours)
      const totalHoursRounded = Math.round(bucket.totalHours * 100) / 100
      // SCHEMA NOTE: quantity must be integer. Hours go in the description;
      // the full bucket total becomes unit_price_cents at quantity=1. See
      // the comment in the deliverables seeder above for the convention.
      const lineTotalCents = Math.round(bucket.totalHours * avgRate)
      timeLines.push({
        description: `${bucket.label} — ${totalHoursRounded} hrs @ ${formatCentsInline(avgRate)}/hr`,
        quantity: 1,
        unit_price_cents: lineTotalCents,
        cadence: 'one_time',
      })
      timeEntryIds.push(...bucket.entryIds)
    }
  }

  // ── LLM token-billing seed (2026-07-08) ───────────────────────────
  // LLM/Claude usage bills on TOKENS, not hours. Each entry carries a
  // pre-computed, post-margin client-billable amount in
  // llm_billable_cents (from the /handoff pipeline). These do NOT scale
  // with hours × rate — they are a flat dollar amount per entry — so
  // they collapse into a single "LLM usage" line, summed across all
  // uncovered entries. Cost + rates never touch this surface; only the
  // billable total is shown.
  let llmTotalCents = 0
  const llmEntryIds: string[] = []
  if (timeEntries && timeEntries.length > 0) {
    for (const e of timeEntries) {
      const cents = Number(e.llm_billable_cents) || 0
      if (cents > 0) {
        llmTotalCents += cents
        // An entry can contribute BOTH an hours line (via its bucket) and
        // the LLM line. Dedupe the id so covered_by_invoice_id is set once.
        if (!timeEntryIds.includes(e.id) && !llmEntryIds.includes(e.id)) {
          llmEntryIds.push(e.id)
        }
      }
    }
  }
  if (llmTotalCents > 0) {
    timeLines.push({
      description: 'LLM usage (AI compute — token-based)',
      quantity: 1,
      unit_price_cents: llmTotalCents,
      cadence: 'one_time',
    })
    // Merge llm-only entry ids into the covered set (dedup preserved).
    for (const eid of llmEntryIds) {
      if (!timeEntryIds.includes(eid)) timeEntryIds.push(eid)
    }
  }

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      prospect_id: project.prospect_id,
    },
    prospect: prospect ?? null,
    deliverables_seed: { lines: deliverablesLines },
    time_entries_seed: { lines: timeLines, entry_ids: timeEntryIds },
  })
}
