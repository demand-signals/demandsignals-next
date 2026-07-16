// ── GET /api/admin/retainers ──────────────────────────────────────────────
// Global retainer overview for the admin Retainers page:
//   { ledgers: [{ ...ledger, business_name, pct_depleted }],
//     pending_count: number }
// Ledgers are joined to their client business_name and annotated with the
// current depletion percentage. Pending count drives the approval-queue badge.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { pctDepleted } from '@/lib/retainer-ledger'
import type { RetainerLedger } from '@/lib/retainer-types'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { data: rows } = await supabaseAdmin
    .from('retainer_ledgers')
    .select('*, prospects(business_name, client_code)')
    .order('updated_at', { ascending: false })

  const ledgers = (rows ?? []).map((r) => {
    const { prospects, ...ledger } = r as RetainerLedger & {
      prospects: { business_name: string; client_code: string | null } | null
    }
    return {
      ...ledger,
      business_name: prospects?.business_name ?? '—',
      client_code: prospects?.client_code ?? null,
      pct_depleted: pctDepleted(ledger),
    }
  })

  const { count } = await supabaseAdmin
    .from('retainer_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  return NextResponse.json({ ledgers, pending_count: count ?? 0 })
}
