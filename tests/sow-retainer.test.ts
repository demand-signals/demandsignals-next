import { describe, it, expect } from 'vitest'
import { sowToRenderPayload } from '@/lib/sow-pdf/payload'
import type { SowDocument } from '@/lib/invoice-types'

describe('sowToRenderPayload', () => {
  const baseSow: SowDocument = {
    id: 'sow-1',
    sow_number: 'SOW-001',
    public_uuid: 'public-uuid',
    prospect_id: null,
    quote_session_id: null,
    status: 'draft',
    title: 'Test',
    scope_summary: null,
    phases: [],
    deliverables: [],
    timeline: [],
    pricing: { total_cents: 100000, deposit_cents: 50000, deposit_pct: 50 },
    payment_terms: null,
    guarantees: null,
    notes: null,
    pdf_storage_path: null,
    pdf_rendered_at: null,
    sent_at: null,
    viewed_at: null,
    accepted_at: null,
    accepted_signature: null,
    accepted_ip: null,
    declined_at: null,
    decline_reason: null,
    voided_at: null,
    void_reason: null,
    deposit_invoice_id: null,
    created_by: null,
    created_at: '2026-04-21T00:00:00Z',
    updated_at: '2026-04-21T00:00:00Z',
  }

  const client = { business_name: 'Test Co', contact_name: null, email: null }

  it('passes through null ongoing_services when absent', () => {
    const result = sowToRenderPayload(baseSow, client)
    expect(result.data.ongoing_services).toBeNull()
  })

  it('passes through ongoing_services when present', () => {
    const sow: SowDocument = {
      ...baseSow,
      ongoing_services: {
        plan_tier: 'essential',
        plan_name: 'Essential',
        monthly_total_cents: 29900,
        start_note: 'Activates on launch day.',
        items: [
          { service_id: 'hosting-php', name: 'PHP Hosting', quantity: 1, monthly_cents: 9900 },
        ],
      },
    }
    const result = sowToRenderPayload(sow, client)
    expect(result.data.ongoing_services).toEqual(sow.ongoing_services)
  })
})
