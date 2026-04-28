// ── /api/admin/credit-memos ────────────────────────────────────────
// GET  — list (filters: ?invoice_id, ?prospect_id, ?kind, ?limit, ?offset)
// POST — create a credit memo, optionally trigger Stripe refund

export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  createCreditMemo,
  type CreditMemoKind,
  type CreditMemoPaymentMethod,
} from '@/lib/credit-memos'
import { sendCreditMemoEmail } from '@/lib/credit-memo-email'
import { renderCreditMemoPdf } from '@/lib/pdf/credit-memo'
import { uploadPrivate } from '@/lib/r2-storage'

const VALID_KINDS: CreditMemoKind[] = ['refund', 'goodwill', 'dispute', 'write_off']
const VALID_METHODS: CreditMemoPaymentMethod[] = [
  'stripe_refund', 'check', 'wire', 'cash', 'other', 'tik', 'zero_balance',
]

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const sp = request.nextUrl.searchParams
  const prospectId = sp.get('prospect_id')
  const invoiceId = sp.get('invoice_id')
  const kind = sp.get('kind')
  const limit = Math.min(parseInt(sp.get('limit') || '50'), 200)
  const offset = parseInt(sp.get('offset') || '0')

  let q = supabaseAdmin
    .from('credit_memos')
    .select(
      'id, credit_memo_number, invoice_id, prospect_id, amount_cents, currency, kind, reason, notes, payment_method, payment_reference, stripe_refund_id, issued_at, created_at, prospects(business_name), invoices(invoice_number)',
      { count: 'exact' },
    )
    .order('issued_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (prospectId) q = q.eq('prospect_id', prospectId)
  if (invoiceId) q = q.eq('invoice_id', invoiceId)
  if (kind) q = q.eq('kind', kind)

  const { data, count, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ credit_memos: data ?? [], total: count ?? 0, limit, offset })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate inputs.
  const invoice_id = typeof body.invoice_id === 'string' ? body.invoice_id : ''
  const amount_cents = typeof body.amount_cents === 'number' ? Math.round(body.amount_cents) : NaN
  const kind = body.kind as CreditMemoKind
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''

  if (!invoice_id) return NextResponse.json({ error: 'invoice_id is required' }, { status: 400 })
  if (!Number.isFinite(amount_cents) || amount_cents <= 0) {
    return NextResponse.json({ error: 'amount_cents must be a positive integer' }, { status: 400 })
  }
  if (!VALID_KINDS.includes(kind)) {
    return NextResponse.json(
      { error: `kind must be one of ${VALID_KINDS.join(', ')}` },
      { status: 400 },
    )
  }
  if (!reason) {
    return NextResponse.json({ error: 'reason is required' }, { status: 400 })
  }

  const payment_method = body.payment_method
    ? (VALID_METHODS.includes(body.payment_method) ? body.payment_method as CreditMemoPaymentMethod : null)
    : null
  if (body.payment_method && !payment_method) {
    return NextResponse.json(
      { error: `payment_method must be one of ${VALID_METHODS.join(', ')}` },
      { status: 400 },
    )
  }

  const result = await createCreditMemo({
    invoice_id,
    amount_cents,
    kind,
    reason,
    notes: typeof body.notes === 'string' ? body.notes : null,
    payment_method,
    payment_reference: typeof body.payment_reference === 'string' ? body.payment_reference : null,
    auto_stripe_refund: typeof body.auto_stripe_refund === 'boolean' ? body.auto_stripe_refund : undefined,
    issued_at: typeof body.issued_at === 'string' ? body.issued_at : undefined,
    created_by: auth.user?.id ?? null,
  })

  if (!result.ok || !result.credit_memo) {
    return NextResponse.json({ error: result.error ?? 'Credit memo creation failed' }, { status: 400 })
  }

  const memo = result.credit_memo

  // Best-effort: render PDF, upload to R2, email the client. Each step is
  // independently caught so a failure in one doesn't skip the next.
  let emailSent = false
  let emailError: string | null = null
  try {
    const [{ data: invoice }, { data: prospect }] = await Promise.all([
      supabaseAdmin
        .from('invoices')
        .select('invoice_number, total_due_cents, send_date')
        .eq('id', memo.invoice_id)
        .maybeSingle(),
      supabaseAdmin
        .from('prospects')
        .select('business_name, owner_name, owner_email, business_email, owner_phone, business_phone, client_code')
        .eq('id', memo.prospect_id)
        .maybeSingle(),
    ])

    if (!invoice || !prospect) {
      emailError = 'Invoice or prospect not found for credit memo email'
    } else {
      let pdfBuffer: Buffer | undefined
      try {
        pdfBuffer = await renderCreditMemoPdf(memo, invoice, prospect)
        try {
          const pdfKey = `credit-memos/${memo.credit_memo_number}.pdf`
          await uploadPrivate(pdfKey, pdfBuffer, 'application/pdf')
        } catch (uploadErr) {
          console.error(
            '[credit-memos POST] R2 upload failed:',
            uploadErr instanceof Error ? uploadErr.message : uploadErr,
          )
        }
      } catch (renderErr) {
        console.error(
          '[credit-memos POST] PDF render failed (continuing without attachment):',
          renderErr instanceof Error ? renderErr.message : renderErr,
        )
      }

      const recipient = prospect.owner_email ?? prospect.business_email ?? null
      if (!recipient) {
        emailError = 'No prospect email on file'
      } else {
        const r = await sendCreditMemoEmail(
          memo,
          invoice.invoice_number,
          recipient,
          {
            business_name: prospect.business_name ?? undefined,
            owner_name: prospect.owner_name ?? null,
          },
          pdfBuffer,
        )
        emailSent = r.success
        if (!r.success) emailError = r.error ?? 'unknown send failure'
      }

      // Client SMS — short notification with credit memo + invoice it applies to.
      // Best-effort: kill-switch off, no phone, or send error never blocks return.
      const clientPhone = prospect.owner_phone ?? prospect.business_phone ?? null
      if (clientPhone) {
        try {
          const { sendSms, isSmsEnabled } = await import('@/lib/twilio-sms')
          if (await isSmsEnabled()) {
            const businessName = prospect.business_name ?? 'your business'
            const amountStr = `$${(memo.amount_cents / 100).toFixed(2)}`
            const kindLabel: Record<string, string> = {
              refund: 'refund',
              goodwill: 'goodwill credit',
              dispute: 'dispute credit',
              write_off: 'write-off',
            }
            const kindStr = kindLabel[memo.kind] ?? memo.kind
            const body =
              `${businessName}: ${kindStr} of ${amountStr} issued (memo ${memo.credit_memo_number}, ` +
              `invoice ${invoice.invoice_number}). Email with details on the way.`
            const r = await sendSms(clientPhone, body)
            if (!r.success) console.error('[credit-memos POST] client SMS failed:', r.error)
          }
        } catch (e) {
          console.error('[credit-memos POST] client SMS threw:', e instanceof Error ? e.message : e)
        }
      }
    }

    // Admin SMS fan-out — independent of client SMS path so it pages the
    // team even when the prospect has no phone on file.
    if (prospect && invoice) {
      try {
        const { notifyAdminsBySms } = await import('@/lib/admin-sms')
        const businessName = prospect.business_name ?? 'a client'
        const amountStr = `$${(memo.amount_cents / 100).toFixed(2)}`
        await notifyAdminsBySms({
          source: 'credit_memo',
          body: `DSIG: ${memo.kind} ${memo.credit_memo_number} for ${amountStr} issued to ${businessName} (invoice ${invoice.invoice_number}).`,
        })
      } catch (e) {
        console.error('[credit-memos POST] admin SMS threw:', e instanceof Error ? e.message : e)
      }
    }
  } catch (e) {
    emailError = e instanceof Error ? e.message : 'unknown email pipeline error'
    console.error('[credit-memos POST] email pipeline threw:', emailError)
  }

  return NextResponse.json({
    credit_memo: memo,
    email: { sent: emailSent, error: emailError },
  }, { status: 201 })
}
