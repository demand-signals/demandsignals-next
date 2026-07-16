// ── Public MSA viewer: /msa/[number]/[uuid] ─────────────────────────
// Client-facing onboarding-agreement page. Client reviews the MSA,
// initials each disclosure, and signs (E-SIGN). Mirrors the SOW public page.

import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { MsaSignClient } from './MsaSignClient'

export const runtime = 'nodejs'

interface Disclosure { code: string; title: string; public_url: string }

async function fetchMsa(number: string, uuid: string) {
  const { data } = await supabaseAdmin
    .from('msa_documents')
    .select('id, msa_number, public_uuid, status, client_legal_name, incorporated_disclosures, executed_signature, prospects!prospect_id(business_name)')
    .eq('msa_number', number)
    .maybeSingle()
  if (!data || data.public_uuid !== uuid) return null

  // Mark as viewed (best-effort) the first time.
  if (data.status === 'sent') {
    await supabaseAdmin
      .from('msa_documents')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('id', data.id)
      .eq('status', 'sent')
  }
  return data
}

export default async function PublicMsaPage({
  params,
}: {
  params: Promise<{ number: string; uuid: string }>
}) {
  const { number, uuid } = await params
  const msa = await fetchMsa(number, uuid)
  if (!msa) notFound()

  const disclosures = (msa.incorporated_disclosures as Disclosure[]) ?? []
  const clientName =
    (msa.prospects as { business_name?: string } | null)?.business_name ??
    msa.client_legal_name ??
    'there'
  const executed = msa.status === 'executed'

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px' }}>
        {/* Header */}
        <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', color: '#F5731F', textTransform: 'uppercase' }}>
          Demand Signals · Onboarding
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>
          Welcome to Demand Signals
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.6, color: '#475569', margin: '0 0 8px' }}>
          Hi {clientName} — here is your onboarding document to get things started. This Master Service
          Agreement is the one-time agreement that governs our working relationship.
        </p>
        <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 28px' }}>
          Agreement <strong>{msa.msa_number}</strong> ·{' '}
          <a href={`/api/msa/public/${number}/pdf?k=${uuid}`} style={{ color: '#0d9488' }}>Download PDF</a>
        </p>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
          <MsaSignClient
            number={number}
            publicUuid={uuid}
            disclosures={disclosures}
            alreadyExecuted={executed}
            executedSignature={msa.executed_signature}
          />
        </div>

        <p style={{ marginTop: 20, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
          Questions? Reply to your onboarding email or contact DemandSignals@gmail.com
        </p>
      </div>
    </main>
  )
}
