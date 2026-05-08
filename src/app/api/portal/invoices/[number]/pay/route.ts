import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// GET /api/portal/invoices/[number]/pay
// Authed reverse-proxy to /api/invoices/public/[number]/pay.
//
// The public pay route authenticates via ?key=<public_uuid>. The
// portal Pay button has no UUID; instead it has a session cookie.
// This route asserts ownership (invoice.prospect_id === session
// prospect_id from middleware header), then 302s to the public
// route with the matching uuid. Zero new payment code.
//
// Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §5
// Plan: docs/superpowers/plans/2026-05-07-client-portal-v1-plan.md Task 7

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://demandsignals.co'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params

  // Middleware sets this header when the dsig_portal session is valid.
  const prospectId = request.headers.get('x-dsig-portal-prospect-id')
  if (!prospectId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: invoice } = await supabaseAdmin
    .from('invoices')
    .select('id, invoice_number, public_uuid, prospect_id, status, total_due_cents')
    .eq('invoice_number', number)
    .maybeSingle()

  if (!invoice) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (invoice.prospect_id !== prospectId) {
    // Pretend the invoice doesn't exist — don't confirm cross-client
    // numbers to the requester.
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!invoice.public_uuid) {
    return NextResponse.json({ error: 'Invoice not payable' }, { status: 409 })
  }

  const target = new URL(
    `/api/invoices/public/${encodeURIComponent(invoice.invoice_number)}/pay`,
    SITE_URL,
  )
  target.searchParams.set('key', invoice.public_uuid)
  return NextResponse.redirect(target)
}
