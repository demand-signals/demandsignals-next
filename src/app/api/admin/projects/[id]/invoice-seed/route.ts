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
  const deliverablesLines: CreateLineItem[] = []
  const phases = Array.isArray(project.phases) ? project.phases : []
  for (const phase of phases) {
    const phaseName = typeof phase?.name === 'string' ? phase.name : 'Phase'
    const delivs = Array.isArray(phase?.deliverables) ? phase.deliverables : []
    for (const d of delivs) {
      if (d?.status !== 'delivered') continue
      // unit_price_cents may live on the deliverable, or be derived from
      // line_total_cents / quantity. Fall back to 0 (user must fix).
      const qty = (typeof d.hours === 'number' && d.hours > 0)
        ? d.hours
        : (typeof d.quantity === 'number' && d.quantity > 0 ? d.quantity : 1)
      const unitPrice = (() => {
        if (typeof d.unit_price_cents === 'number') return d.unit_price_cents
        if (typeof d.line_total_cents === 'number' && qty > 0) {
          return Math.round(d.line_total_cents / qty)
        }
        return 0
      })()
      deliverablesLines.push({
        description: `${phaseName} — ${d.name ?? 'Deliverable'}`,
        quantity: qty,
        unit_price_cents: unitPrice,
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
    .select('id, phase_id, hours, hourly_rate_cents, description')
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
      timeLines.push({
        description: `${bucket.label} — ${totalHoursRounded} hrs`,
        quantity: totalHoursRounded,
        unit_price_cents: avgRate,
        cadence: 'one_time',
      })
      timeEntryIds.push(...bucket.entryIds)
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
