// ── Public MSA viewer: /msa/[number]/[uuid] ─────────────────────────
// Client-facing onboarding-agreement page. Client reviews the MSA,
// initials each disclosure, and signs (E-SIGN). Mirrors the SOW public page.

import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { MsaSignClient } from './MsaSignClient'

export const runtime = 'nodejs'

interface Disclosure { code: string; title: string; public_url: string }

async function fetchMsa(number: string, uuid: string) {
  // Core lookup drives the 404 decision — it must NOT reference any column that
  // could be missing (e.g. migration-058 columns before 058 is applied), or a
  // schema error would null out `data` and 404 a perfectly valid MSA.
  const { data } = await supabaseAdmin
    .from('msa_documents')
    .select('id, msa_number, public_uuid, status, client_legal_name, incorporated_disclosures, executed_signature, prospects!prospect_id(business_name, owner_name, owner_email)')
    .eq('msa_number', number)
    .maybeSingle()
  if (!data || data.public_uuid !== uuid) return null

  // Everything below is best-effort engagement tracking. It is fully isolated
  // from the render path — any failure (including missing 058 columns) is
  // swallowed so it can never affect whether the page renders.
  void trackMsaOpen(data.id, data.status, data.msa_number, (data.prospects as { business_name?: string } | null)?.business_name ?? 'a client')

  return data
}

// Fire-and-forget open tracking: mark viewed, bump the counter, and (if the
// 058 columns exist) send a throttled admin SMS on every open of an unexecuted
// MSA. Entirely wrapped in try/catch — never throws into the render path.
async function trackMsaOpen(id: string, status: string, msaNumber: string, businessName: string) {
  const nowIso = new Date().toISOString()
  try {
    if (status === 'sent') {
      await supabaseAdmin.from('msa_documents').update({ status: 'viewed', viewed_at: nowIso }).eq('id', id)
    }
  } catch { /* non-fatal */ }

  if (status === 'executed') return

  // Open-SMS + view counter depend on migration-058 columns. Guard on their
  // presence; if 058 hasn't run, this whole block is a no-op (page still fine).
  try {
    const { data: row, error } = await supabaseAdmin
      .from('msa_documents')
      .select('view_sms_sent_at, public_viewed_count')
      .eq('id', id)
      .maybeSingle()
    if (error || !row) return   // columns not present yet → skip silently

    await supabaseAdmin
      .from('msa_documents')
      .update({ public_viewed_count: (row.public_viewed_count ?? 0) + 1 })
      .eq('id', id)

    const OPEN_SMS_THROTTLE_MS = 10 * 60 * 1000
    const last = row.view_sms_sent_at ? new Date(row.view_sms_sent_at).getTime() : 0
    if (Date.now() - last >= OPEN_SMS_THROTTLE_MS) {
      const { notifyAdminsBySms } = await import('@/lib/admin-sms')
      const result = await notifyAdminsBySms({
        source: 'msa_view',
        body: `DSIG: ${businessName} just opened MSA ${msaNumber}.`,
      })
      if (result.dispatched) {
        await supabaseAdmin.from('msa_documents').update({ view_sms_sent_at: new Date().toISOString() }).eq('id', id)
      }
    }
  } catch (e) {
    console.error('[msa public page] open-tracking threw:', e instanceof Error ? e.message : e)
  }
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
            msaPdfUrl={`/api/msa/public/${number}/pdf?k=${uuid}`}
            alreadyExecuted={executed}
            executedSignature={msa.executed_signature}
            defaultName={(msa.prospects as { owner_name?: string } | null)?.owner_name ?? null}
            defaultEmail={(msa.prospects as { owner_email?: string } | null)?.owner_email ?? null}
          />
        </div>

        <p style={{ marginTop: 20, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
          Questions? Reply to your onboarding email or contact DemandSignals@gmail.com
        </p>
      </div>
    </main>
  )
}
