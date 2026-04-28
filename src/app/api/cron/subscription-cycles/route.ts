// ── GET /api/cron/subscription-cycles ───────────────────────────────
// Cron-triggered: generates subscription_cycle invoices for every
// subscription whose next_invoice_date is today or earlier.
//
// Triggered daily by Vercel Cron (or external cron). Protected by
// CRON_SECRET header to prevent unauthorized triggering.
//
// Kill switch: quote_config.subscription_cycle_cron_enabled must be 'true'.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyBearerSecret } from '@/lib/bearer-auth'
import type { Subscription, SubscriptionPlan } from '@/lib/invoice-types'

export async function GET(request: NextRequest) {
  // Auth: CRON_SECRET via Authorization: Bearer or X-Cron-Secret header.
  // Previously the check was `auth.includes(expected)` — that accepted any
  // string that *contained* the secret as a substring, AND was timing-leaky.
  // verifyBearerSecret is constant-time exact match.
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  if (!verifyBearerSecret(request, process.env.CRON_SECRET, { allowXCronSecret: true })) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Kill switch.
  const { data: cfg } = await supabaseAdmin
    .from('quote_config')
    .select('value')
    .eq('key', 'subscription_cycle_cron_enabled')
    .maybeSingle()
  if (cfg?.value !== 'true') {
    return NextResponse.json({ skipped: true, reason: 'cron disabled in config' })
  }

  const today = new Date().toISOString().slice(0, 10)

  // Find due subscriptions.
  const { data: due, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*, plan:subscription_plans(*)')
    .in('status', ['active', 'trialing'])
    .lte('next_invoice_date', today)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: Array<{
    subscription_id: string
    invoice_id?: string
    invoice_number?: string
    error?: string
  }> = []

  for (const row of due ?? []) {
    const sub = row as Subscription & { plan: SubscriptionPlan }
    try {
      const invoiceId = await generateCycleInvoice(sub)
      results.push({ subscription_id: sub.id, invoice_id: invoiceId })
    } catch (e) {
      results.push({
        subscription_id: sub.id,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
    today,
  })
}

async function generateCycleInvoice(
  sub: Subscription & { plan: SubscriptionPlan },
): Promise<string> {
  // Generate invoice number.
  const { data: num, error: numErr } = await supabaseAdmin.rpc('generate_invoice_number')
  if (numErr || !num) throw new Error(`Number generation: ${numErr?.message}`)

  // Insert invoice as 'sent' (Stripe will pay it, not manual admin send).
  const { data: inv, error: invErr } = await supabaseAdmin
    .from('invoices')
    .insert({
      invoice_number: num,
      kind: 'subscription_cycle',
      prospect_id: sub.prospect_id,
      subscription_id: sub.id,
      status: 'sent',
      subtotal_cents: sub.plan.price_cents,
      discount_cents: 0,
      total_due_cents: sub.plan.price_cents,
      currency: sub.plan.currency,
      sent_at: new Date().toISOString(),
      sent_via_channel: 'manual', // Stripe handles actual collection
      auto_generated: true,
      auto_trigger: 'subscription_cycle',
      auto_sent: true,
      category_hint: 'subscription_revenue',
      notes: `${sub.plan.name} — ${sub.plan.billing_interval}ly billing cycle`,
    })
    .select('*')
    .single()

  if (invErr || !inv) throw new Error(`Invoice insert: ${invErr?.message}`)

  // One line item for the plan charge.
  const { error: liErr } = await supabaseAdmin.from('invoice_line_items').insert({
    invoice_id: inv.id,
    description: sub.plan.name,
    quantity: 1,
    unit_price_cents: sub.plan.price_cents,
    subtotal_cents: sub.plan.price_cents,
    discount_pct: 0,
    discount_cents: 0,
    line_total_cents: sub.plan.price_cents,
    sort_order: 0,
  })
  if (liErr) {
    await supabaseAdmin.from('invoices').delete().eq('id', inv.id)
    throw new Error(`Line item: ${liErr.message}`)
  }

  // Advance subscription next_invoice_date.
  const newNextDate = new Date(sub.next_invoice_date)
  if (sub.plan.billing_interval === 'month') newNextDate.setMonth(newNextDate.getMonth() + 1)
  else if (sub.plan.billing_interval === 'quarter') newNextDate.setMonth(newNextDate.getMonth() + 3)
  else if (sub.plan.billing_interval === 'year') newNextDate.setFullYear(newNextDate.getFullYear() + 1)

  await supabaseAdmin
    .from('subscriptions')
    .update({
      next_invoice_date: newNextDate.toISOString().slice(0, 10),
      current_period_start: new Date().toISOString(),
      current_period_end: newNextDate.toISOString(),
    })
    .eq('id', sub.id)

  return inv.id
}
