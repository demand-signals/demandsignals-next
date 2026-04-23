// ── Map SOW document → PDF service payload ─────────────────────────
// doc_type=sow. See dsig_pdf/docs/sow.py for Python counterpart.

import type { SowDocument, SowOngoingServices, SowPhase } from '../invoice-types'

export interface SowPdfPayload {
  doc_type: 'sow'
  version: 1
  data: {
    sow_number: string
    issue_date: string
    status: string
    is_accepted: boolean
    is_void: boolean
    title: string
    client: {
      business_name: string
      contact_name: string | null
      email: string | null
    }
    scope_summary: string | null
    // New phases model (preferred). Python renderer uses this when non-empty.
    phases: SowPhase[]
    // Legacy flat arrays (backward compat; present even when phases is used).
    deliverables: Array<{
      name: string
      description: string
      acceptance_criteria?: string
      quantity?: number
      hours?: number
      unit_price_cents?: number
      line_total_cents?: number
    }>
    timeline: Array<{
      name: string
      duration_weeks: number
      description: string
      deliverables?: string[]
    }>
    pricing: {
      total_cents: number
      deposit_cents: number
      deposit_pct: number
      payment_schedule?: Array<{
        milestone: string
        amount_cents: number
        due_at: string
      }>
    }
    payment_terms: string | null
    guarantees: string | null
    notes: string | null
    accepted_at: string | null
    accepted_signature: string | null
    ongoing_services?: SowOngoingServices | null
  }
}

export function sowToRenderPayload(
  sow: SowDocument,
  client: { business_name: string; contact_name: string | null; email: string | null },
): SowPdfPayload {
  return {
    doc_type: 'sow',
    version: 1,
    data: {
      sow_number: sow.sow_number,
      issue_date: (sow.sent_at ?? sow.created_at).slice(0, 10),
      status: sow.status,
      is_accepted: sow.status === 'accepted',
      is_void: sow.status === 'void',
      title: sow.title,
      client,
      scope_summary: sow.scope_summary,
      phases: sow.phases ?? [],
      deliverables: sow.deliverables,
      timeline: sow.timeline,
      pricing: sow.pricing,
      payment_terms: sow.payment_terms,
      guarantees: sow.guarantees,
      notes: sow.notes,
      accepted_at: sow.accepted_at,
      accepted_signature: sow.accepted_signature,
      ongoing_services: sow.ongoing_services ?? null,
    },
  }
}
