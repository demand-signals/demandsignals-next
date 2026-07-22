// POST /api/admin/projects/[id]/time-entries/[entryId]/approve
//
// The single human approval gate for captured time entries (2026-07-23).
//
// Flow: handoff CAPTURES a time entry (approval_status='captured'). An admin
// reviews + edits hours/role/rate/tokens, then approves. On approve we
// AUTO-FORK by retainer status:
//   - client HAS a retainer ledger  -> create the retainer DEBIT now (approved),
//     link it via retainer_debit_id
//   - client has NO ledger           -> just mark approved; invoice-seed picks it up
//
// Gate: only approval_status='approved' entries reach retainer OR invoice.
// Idempotent: approving an already-approved entry is a no-op (no double-debit);
// the retainer debit itself is idempotent on time_entry_id in postTransaction.
//
// Spec: Y:\SKILLS\dsig-handoff\specs\2026-07-23-handoff-rewrite-plan-v2a-amended.md

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  getLedger,
  rateForRole,
  postTransaction,
  recomputeBalance,
} from '@/lib/retainer-ledger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error
  const { id: projectId, entryId } = await params
  const adminEmail = auth.user?.email ?? 'system'
  const adminId = auth.admin?.id ?? null

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  // Verified/edited values from the review modal. All optional — if omitted we
  // keep what's on the entry.
  const editHours =
    typeof body.hours === 'number' && body.hours >= 0 ? body.hours : undefined
  const roleKey = typeof body.role_key === 'string' ? body.role_key : undefined
  const editRateCents =
    typeof body.hourly_rate_cents === 'number' && body.hourly_rate_cents >= 0
      ? body.hourly_rate_cents
      : undefined
  const editLlmCents =
    typeof body.llm_billable_cents === 'number' && body.llm_billable_cents >= 0
      ? body.llm_billable_cents
      : undefined

  // ── Load the entry ────────────────────────────────────────────────
  // Note: '*' (not a concatenated column list) — Supabase's typed client
  // infers a proper row type from '*' but falls back to GenericStringError
  // on a runtime-concatenated select string. Per DSIG memory
  // (tsc-skiplibcheck-hides-supabase-cast-errors), use a literal '*'.
  interface TERow {
    id: string
    project_id: string
    prospect_id: string
    hours: number | null
    hourly_rate_cents: number | null
    llm_billable_cents: number | null
    approval_status: string
    retainer_debit_id: string | null
    description: string | null
    title: string | null
  }
  const { data: entryRaw, error: entryErr } = await supabaseAdmin
    .from('project_time_entries')
    .select('*')
    .eq('id', entryId)
    .eq('project_id', projectId)
    .single()

  if (entryErr || !entryRaw) {
    return NextResponse.json({ error: 'Time entry not found' }, { status: 404 })
  }
  const entry = entryRaw as unknown as TERow

  // Idempotent: already approved → no-op success (never double-debit).
  if (entry.approval_status === 'approved') {
    return NextResponse.json({
      ok: true,
      already_approved: true,
      entry,
    })
  }

  // ── Resolve the verified numbers ──────────────────────────────────
  const finalHours = editHours ?? (entry.hours != null ? Number(entry.hours) : 0)
  let finalRateCents = editRateCents ?? entry.hourly_rate_cents ?? null
  // If a role was picked and no explicit rate override, resolve the rate.
  if (roleKey && editRateCents === undefined) {
    const roleRate = await rateForRole(roleKey)
    if (roleRate != null) finalRateCents = roleRate
  }
  const finalLlmCents =
    editLlmCents ?? entry.llm_billable_cents ?? null

  // ── Update the entry to approved with verified numbers ────────────
  const { error: updErr } = await supabaseAdmin
    .from('project_time_entries')
    .update({
      hours: finalHours > 0 ? finalHours : null,
      hourly_rate_cents: finalRateCents,
      llm_billable_cents: finalLlmCents,
      approval_status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: adminId,
    })
    .eq('id', entryId)

  if (updErr) {
    return NextResponse.json(
      { error: `approve update failed: ${updErr.message}` },
      { status: 500 },
    )
  }

  // ── Fork: retainer client → debit now; else → wait for invoice ────
  const ledger = await getLedger(entry.prospect_id)

  if (!ledger) {
    // No ledger — approved entry flows into the next New Invoice run.
    return NextResponse.json({
      ok: true,
      fork: 'invoice',
      message: 'Approved. Will be included in the next invoice for this client.',
      hours: finalHours,
      hourly_rate_cents: finalRateCents,
      llm_billable_cents: finalLlmCents,
    })
  }

  // Retainer client — create an APPROVED debit with the verified numbers.
  // amount = hours × rate + LLM billable. postTransaction is idempotent on
  // time_entry_id, so a retry returns the existing debit instead of duplicating.
  const hoursCents =
    finalHours > 0 && finalRateCents != null
      ? Math.round(finalHours * finalRateCents)
      : 0
  const amountCents = hoursCents + (finalLlmCents ?? 0)

  if (amountCents <= 0) {
    return NextResponse.json({
      ok: true,
      fork: 'retainer',
      message: 'Approved. Zero billable amount — no retainer debit created.',
    })
  }

  try {
    const debit = await postTransaction({
      ledger_id: ledger.id,
      prospect_id: entry.prospect_id,
      project_id: entry.project_id,
      direction: 'debit',
      amount_cents: amountCents,
      source: 'handoff',
      description:
        entry.title ?? entry.description ?? `Approved work — ${finalHours} hrs`,
      hours: finalHours > 0 ? finalHours : null,
      role: roleKey ?? null,
      time_entry_id: entry.id,
      approved: true, // human-approved, draws the balance now
      actor: adminEmail,
    })

    // Link the entry to its debit (for idempotency + audit).
    await supabaseAdmin
      .from('project_time_entries')
      .update({ retainer_debit_id: debit.id })
      .eq('id', entryId)

    const updatedLedger = await recomputeBalance(ledger.id)

    return NextResponse.json({
      ok: true,
      fork: 'retainer',
      debit_id: debit.id,
      amount_cents: amountCents,
      new_balance_cents: updatedLedger.balance_cents,
      message: `Approved + debited retainer $${(amountCents / 100).toFixed(2)}. New balance $${(updatedLedger.balance_cents / 100).toFixed(2)}.`,
    })
  } catch (debitErr) {
    // Entry is already approved; surface the debit failure but don't unwind.
    return NextResponse.json(
      {
        ok: true,
        fork: 'retainer',
        warning: `Entry approved, but retainer debit failed: ${
          debitErr instanceof Error ? debitErr.message : 'unknown'
        }. Debit manually or retry.`,
      },
      { status: 200 },
    )
  }
}
