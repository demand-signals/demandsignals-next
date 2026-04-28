// ── admin-sms.ts ──────────────────────────────────────────────────────
// Fan-out helper for sending the same SMS to every admin phone in
// ADMIN_TEAM_PHONES. Honors the same kill switches as direct sendSms()
// (sms_delivery_enabled in quote_config; SMS_TEST_MODE allowlist) and
// surfaces consolidated success/failure state to callers.
//
// Used by every doc-event that wants to notify the admin team:
//   • SOW first-view  (admin alert)
//   • Invoice send    (admin alert)
//   • Invoice view    (admin alert)
//   • Receipt created (admin confirmation)
//   • Credit memo issued (admin confirmation)
//
// Failures are logged loudly but the caller never throws — admin
// notification is best-effort, the underlying business action stands.

import { sendSms, isSmsEnabled } from '@/lib/twilio-sms'
import { getAdminTeamPhones } from '@/lib/constants'
import { notify } from '@/lib/system-alerts'

export interface NotifyAdminsResult {
  /** True iff at least one admin received the SMS. */
  dispatched: boolean
  /** How many admins were targeted. */
  targets: number
  /** How many sends failed. */
  failures: number
  /** First failure error (for response payload diagnostics). */
  first_error: string | null
  /** Stage breadcrumb: kill_switch_off | no_admins | sent | partial | all_failed | exception */
  stage:
    | 'kill_switch_off'
    | 'no_admins'
    | 'sent'
    | 'partial'
    | 'all_failed'
    | 'exception'
}

/**
 * Send `body` to every phone in ADMIN_TEAM_PHONES in parallel. Honors
 * the sms_delivery_enabled kill switch — when off, returns early with
 * stage='kill_switch_off' and does NOT log a failure (operator intent).
 *
 * `source` is a short tag (e.g. 'sow_view', 'invoice_send', 'credit_memo')
 * used for system_notifications grouping when failures occur.
 */
export async function notifyAdminsBySms(args: {
  source: string
  body: string
}): Promise<NotifyAdminsResult> {
  const { source, body } = args

  // Kill-switch first — operator intent, not a failure.
  if (!(await isSmsEnabled())) {
    return {
      dispatched: false,
      targets: 0,
      failures: 0,
      first_error: 'sms_delivery_enabled=false',
      stage: 'kill_switch_off',
    }
  }

  const phones = getAdminTeamPhones()
  if (phones.length === 0) {
    await notify({
      severity: 'warning',
      source,
      title: 'No admin phones configured',
      body: 'ADMIN_TEAM_PHONES env var is empty or unset; admin alert dropped.',
      context: { source, error_code: 'admin_phones_empty' },
    })
    return {
      dispatched: false,
      targets: 0,
      failures: 0,
      first_error: 'admin_phones_empty',
      stage: 'no_admins',
    }
  }

  try {
    const results = await Promise.allSettled(
      phones.map((p) => sendSms(p, body)),
    )
    const failureDetails: Array<{ phone: string; error: string }> = []
    let failures = 0
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        failures++
        failureDetails.push({ phone: phones[i], error: String(r.reason) })
      } else if (!r.value.success) {
        failures++
        failureDetails.push({ phone: phones[i], error: r.value.error ?? 'unknown' })
      }
    })

    if (failures === phones.length) {
      await notify({
        severity: 'error',
        source,
        title: `Admin SMS dispatch failed on all ${phones.length} phones`,
        body: failureDetails.map((f) => `${f.phone}: ${f.error}`).join('\n'),
        context: { source, failures: failureDetails, error_code: 'all_admins_failed' },
      })
      return {
        dispatched: false,
        targets: phones.length,
        failures,
        first_error: failureDetails[0]?.error ?? 'unknown',
        stage: 'all_failed',
      }
    }
    if (failures > 0) {
      await notify({
        severity: 'warning',
        source,
        title: `Admin SMS partial failure (${failures} of ${phones.length})`,
        body: failureDetails.map((f) => `${f.phone}: ${f.error}`).join('\n'),
        context: { source, failures: failureDetails, error_code: 'admin_sms_partial' },
      })
      return {
        dispatched: true,
        targets: phones.length,
        failures,
        first_error: failureDetails[0]?.error ?? null,
        stage: 'partial',
      }
    }
    return {
      dispatched: true,
      targets: phones.length,
      failures: 0,
      first_error: null,
      stage: 'sent',
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    await notify({
      severity: 'error',
      source,
      title: `Admin SMS pipeline threw`,
      body: msg,
      context: { source, error_code: 'pipeline_exception' },
    })
    return {
      dispatched: false,
      targets: phones.length,
      failures: phones.length,
      first_error: msg,
      stage: 'exception',
    }
  }
}
