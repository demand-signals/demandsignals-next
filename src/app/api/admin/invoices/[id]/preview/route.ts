// ── /api/admin/invoices/[id]/preview — GET HTML preview ─────────────

import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { renderInvoiceHtml } from '@/lib/doc-preview'
import type { InvoiceWithLineItems } from '@/lib/invoice-types'

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await ctx.params

  // Load invoice + prospect in one query (same pattern as GET /api/admin/invoices/[id])
  const { data: invoice } = await supabaseAdmin
    .from('invoices')
    .select('*, prospect:prospects(*)')
    .eq('id', id)
    .maybeSingle()
  if (!invoice) return new Response('Not found', { status: 404 })

  // Load line items separately (same pattern as GET /api/admin/invoices/[id])
  const { data: lineItems } = await supabaseAdmin
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', id)
    .order('sort_order', { ascending: true })

  const prospect = (invoice as any).prospect ?? {}

  const invWithItems: InvoiceWithLineItems = {
    ...invoice,
    line_items: lineItems ?? [],
    bill_to: {
      business_name: prospect.business_name ?? '—',
      contact_name: prospect.owner_name ?? null,
      email: prospect.owner_email ?? prospect.business_email ?? null,
    },
  }

  const html = renderInvoiceHtml(invWithItems, {
    business_name: prospect.business_name ?? '—',
    owner_name: prospect.owner_name,
    owner_email: prospect.owner_email,
    business_email: prospect.business_email,
    owner_phone: prospect.owner_phone,
    business_phone: prospect.business_phone,
    address: prospect.address,
    city: prospect.city,
    state: prospect.state,
    zip: prospect.zip,
  })

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
