// SMS dispatcher for the daily portal digest. Mirrors booking-sms.ts.
// Honors two kill switches:
//   - sms_delivery_enabled  (global SMS gate, via isSmsEnabled())
//   - portal_digest_enabled (digest-specific gate, via isDigestEnabled())
//
// Body template (locked per spec §9):
//   "Demand Signals committed {hours_label} of progress towards your
//    account, click this link to read the update:
//    https://demandsignals.co/portal/projects"

import { supabaseAdmin } from './supabase/admin'
import { sendSms, isSmsEnabled } from './twilio-sms'
import { formatHoursLabel } from './format-hours'

const PORTAL_PROJECTS_URL = 'https://demandsignals.co/portal/projects'

export interface SendPortalDigestSmsArgs {
  toPhone: string          // E.164
  totalMinutes: number
  prospectId: string       // for log linkage
}

export interface SendPortalDigestSmsResult {
  ok: boolean
  messageId?: string
  reason?: string
}

async function isDigestEnabled(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('quote_config')
    .select('value')
    .eq('key', 'portal_digest_enabled')
    .maybeSingle()
  // JSONB native boolean OR string (CLAUDE.md §12 lesson)
  return data?.value === true || data?.value === 'true'
}

export async function sendPortalDigestSms(
  args: SendPortalDigestSmsArgs,
): Promise<SendPortalDigestSmsResult> {
  if (!args.toPhone) return { ok: false, reason: 'no_phone' }
  if (!(await isSmsEnabled())) return { ok: false, reason: 'sms_disabled' }
  if (!(await isDigestEnabled())) return { ok: false, reason: 'digest_disabled' }

  const hours = formatHoursLabel(args.totalMinutes)
  const body =
    `Demand Signals committed ${hours} of progress towards your ` +
    `account, click this link to read the update: ${PORTAL_PROJECTS_URL}`

  const result = await sendSms(args.toPhone, body)
  if (!result.success) {
    return { ok: false, reason: result.error ?? 'send_failed' }
  }
  return { ok: true, messageId: result.message_id }
}
