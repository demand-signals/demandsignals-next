// ── portal-digest.ts ───────────────────────────────────────────────
// Daily digest builder. Pools all client-visible, non-suppressed,
// unsent project_notes from the prior 24h per client; sends email
// (full content) + SMS (teaser link); marks notes sent; writes
// portal_digests row.
//
// Empty pool = silent (no row written, no message sent).
// Race-safe: portal_digests UNIQUE(prospect_id, period_start_at)
// catches duplicate cron firings.
//
// Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §8 + §6
// Plan: docs/superpowers/plans/2026-05-07-client-portal-v1-plan.md Task 12

import { supabaseAdmin } from './supabase/admin'
import { sendEmail } from './email'
import { sendPortalDigestSms } from './portal-digest-sms'
import { formatHoursLabel } from './format-hours'

const PORTAL_PROJECTS_URL = 'https://demandsignals.co/portal/projects'

export type DigestSkipReason =
  | 'no_notes'
  | 'already_sent'
  | 'no_owner_email'
  | 'kill_switch_off'

export interface DigestPerClientResult {
  prospect_id: string
  business_name?: string | null
  status: 'sent' | 'skipped' | 'error'
  skipReason?: DigestSkipReason
  error?: string
  noteCount?: number
  totalMinutes?: number
  emailSendId?: string
  smsMessageId?: string
}

export interface DigestSweepResult {
  enabled: boolean
  results: DigestPerClientResult[]
  sentCount: number
  skippedCount: number
  errorCount: number
}

// ── Kill switch ────────────────────────────────────────────────────

async function isDigestEnabled(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('quote_config')
    .select('value')
    .eq('key', 'portal_digest_enabled')
    .maybeSingle()
  return data?.value === true || data?.value === 'true'
}

// ── Per-client digest ──────────────────────────────────────────────

interface DigestNoteRow {
  id: string
  project_id: string
  title: string | null
  body: string
  created_at: string
}

interface ProjectName {
  id: string
  name: string
}

export async function runDigestForProspect(
  prospectId: string,
): Promise<DigestPerClientResult> {
  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('id, business_name, owner_name, owner_email, owner_phone, is_client')
    .eq('id', prospectId)
    .maybeSingle()

  if (!prospect || !prospect.is_client) {
    return {
      prospect_id: prospectId,
      status: 'skipped',
      skipReason: 'no_notes',
    }
  }

  if (!prospect.owner_email) {
    return {
      prospect_id: prospectId,
      business_name: prospect.business_name,
      status: 'skipped',
      skipReason: 'no_owner_email',
    }
  }

  // 24-hour window anchored to "now" (cron fires at 9am PT; window is
  // [now-24h, now)). period_start_at uniquely keys this run; second
  // invocation in the same minute would collide on UNIQUE.
  const periodEnd = new Date()
  const periodStart = new Date(periodEnd.getTime() - 24 * 60 * 60 * 1000)

  // Fetch pending client-visible notes
  const { data: notes } = await supabaseAdmin
    .from('project_notes')
    .select('id, project_id, title, body, created_at')
    .eq('prospect_id', prospect.id)
    .eq('visibility', 'client')
    .eq('suppressed', false)
    .is('client_sent_at', null)
    .gte('created_at', periodStart.toISOString())
    .lt('created_at', periodEnd.toISOString())
    .order('created_at', { ascending: true })

  if (!notes || notes.length === 0) {
    return {
      prospect_id: prospectId,
      business_name: prospect.business_name,
      status: 'skipped',
      skipReason: 'no_notes',
    }
  }

  const noteIds = notes.map((n) => n.id)

  // Project name map for grouping
  const projectIds = Array.from(new Set(notes.map((n) => n.project_id)))
  const { data: projectsData } = await supabaseAdmin
    .from('projects')
    .select('id, name')
    .in('id', projectIds)
  const projectNameById = new Map<string, string>(
    (projectsData ?? []).map((p) => [p.id, p.name as string]),
  )

  // Time-entries sum for hours_label
  const { data: timeEntries } = await supabaseAdmin
    .from('project_time_entries')
    .select('hunter_minutes, claude_minutes')
    .in('project_note_id', noteIds)
  const totalMinutes = (timeEntries ?? []).reduce(
    (s, t) => s + (t.hunter_minutes ?? 0) + (t.claude_minutes ?? 0),
    0,
  )

  // INSERT digest row FIRST — UNIQUE catches double-send
  const { data: digestRow, error: digestErr } = await supabaseAdmin
    .from('portal_digests')
    .insert({
      prospect_id: prospect.id,
      period_start_at: periodStart.toISOString(),
      period_end_at: periodEnd.toISOString(),
      note_ids: noteIds,
      total_minutes: totalMinutes,
    })
    .select('id')
    .single()

  if (digestErr) {
    if (digestErr.code === '23505') {
      return {
        prospect_id: prospectId,
        business_name: prospect.business_name,
        status: 'skipped',
        skipReason: 'already_sent',
      }
    }
    return {
      prospect_id: prospectId,
      business_name: prospect.business_name,
      status: 'error',
      error: digestErr.message,
    }
  }

  // Render + send email
  const groupedNotes = groupNotesByProject(
    notes as DigestNoteRow[],
    projectNameById,
  )
  const html = renderDigestEmail({
    ownerName: prospect.owner_name ?? null,
    businessName: prospect.business_name ?? 'your account',
    totalMinutes,
    grouped: groupedNotes,
  })
  const text = renderDigestEmailText({
    businessName: prospect.business_name ?? 'your account',
    totalMinutes,
    grouped: groupedNotes,
  })
  const subject =
    groupedNotes.length === 1
      ? `Today's update on ${groupedNotes[0].projectName}`
      : `Today's update on your Demand Signals projects`

  const emailResult = await sendEmail({
    to: prospect.owner_email,
    kind: 'portal_digest',
    subject,
    html,
    text,
    link: { prospect_id: prospect.id },
  })

  // SMS teaser (best-effort, kill-switch gated inside the helper)
  let smsMessageId: string | undefined
  if (prospect.owner_phone) {
    const smsResult = await sendPortalDigestSms({
      toPhone: prospect.owner_phone,
      totalMinutes,
      prospectId: prospect.id,
    })
    smsMessageId = smsResult.messageId
    if (smsResult.ok) {
      await supabaseAdmin
        .from('portal_digests')
        .update({ sms_delivered: true, sms_send_id: null })
        .eq('id', digestRow.id)
    }
  }

  // Mark notes sent + record email send_id on digest row
  if (emailResult.success) {
    await supabaseAdmin
      .from('portal_digests')
      .update({
        email_delivered: true,
        email_send_id: emailResult.send_id ?? null,
      })
      .eq('id', digestRow.id)

    await supabaseAdmin
      .from('project_notes')
      .update({
        client_sent_at: new Date().toISOString(),
        client_send_id: emailResult.send_id ?? null,
      })
      .in('id', noteIds)
  }

  return {
    prospect_id: prospect.id,
    business_name: prospect.business_name,
    status: 'sent',
    noteCount: notes.length,
    totalMinutes,
    emailSendId: emailResult.send_id,
    smsMessageId,
  }
}

// ── Sweep ──────────────────────────────────────────────────────────

export async function runDigestSweep(): Promise<DigestSweepResult> {
  const enabled = await isDigestEnabled()
  if (!enabled) {
    return { enabled: false, results: [], sentCount: 0, skippedCount: 0, errorCount: 0 }
  }

  // All clients with active accounts. Hard cap 200 to bound cost.
  const { data: clients } = await supabaseAdmin
    .from('prospects')
    .select('id')
    .eq('is_client', true)
    .limit(200)

  const results: DigestPerClientResult[] = []
  for (const c of clients ?? []) {
    try {
      results.push(await runDigestForProspect(c.id))
    } catch (e) {
      results.push({
        prospect_id: c.id,
        status: 'error',
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return {
    enabled: true,
    results,
    sentCount: results.filter((r) => r.status === 'sent').length,
    skippedCount: results.filter((r) => r.status === 'skipped').length,
    errorCount: results.filter((r) => r.status === 'error').length,
  }
}

// ── Helpers ────────────────────────────────────────────────────────

interface GroupedNote {
  projectId: string
  projectName: string
  notes: DigestNoteRow[]
}

function groupNotesByProject(
  notes: DigestNoteRow[],
  projectNameById: Map<string, string>,
): GroupedNote[] {
  const map = new Map<string, GroupedNote>()
  for (const n of notes) {
    const existing = map.get(n.project_id)
    if (existing) {
      existing.notes.push(n)
    } else {
      map.set(n.project_id, {
        projectId: n.project_id,
        projectName: projectNameById.get(n.project_id) ?? 'Project',
        notes: [n],
      })
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.projectName.localeCompare(b.projectName),
  )
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function renderMarkdownToHtml(body: string): string {
  // Email rendering — plain paragraph + line-break only.
  // For richer rendering the in-portal MDX renderer applies; the email
  // is intentionally minimal so it's robust across all email clients.
  const escaped = escapeHtml(body)
  return escaped
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px 0;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface RenderArgs {
  ownerName: string | null
  businessName: string
  totalMinutes: number
  grouped: GroupedNote[]
}

function renderDigestEmail(args: RenderArgs): string {
  const greeting = args.ownerName ? `Hi ${escapeHtml(args.ownerName.split(' ')[0])},` : 'Hi,'
  const hours = formatHoursLabel(args.totalMinutes)

  const sections = args.grouped
    .map(
      (g) => `
        <div style="margin:24px 0;">
          <h2 style="margin:0 0 12px 0;font-size:16px;color:#3D4566;border-bottom:2px solid #52C9A0;padding-bottom:6px;">
            ${escapeHtml(g.projectName)}
          </h2>
          ${g.notes
            .map(
              (n) => `
            <div style="margin:0 0 18px 0;">
              <div style="font-size:11px;color:#5d6780;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
                ${shortDate(n.created_at)}
              </div>
              ${n.title ? `<div style="font-size:15px;font-weight:600;color:#3D4566;margin-bottom:8px;">${escapeHtml(n.title)}</div>` : ''}
              <div style="font-size:14px;line-height:1.6;color:#3D4566;">
                ${renderMarkdownToHtml(n.body)}
              </div>
            </div>`,
            )
            .join('')}
        </div>`,
    )
    .join('')

  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Helvetica,Arial,sans-serif;color:#3D4566;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px 32px 20px 32px;border-bottom:3px solid #52C9A0;">
          <div style="font-size:22px;font-weight:700;color:#3D4566;letter-spacing:-0.5px;">Demand Signals</div>
          <div style="font-size:12px;color:#5d6780;text-transform:uppercase;letter-spacing:0.6px;margin-top:4px;">Daily update</div>
        </td></tr>
        <tr><td style="padding:24px 32px 0 32px;">
          <p style="margin:0 0 16px 0;font-size:15px;color:#3D4566;">${greeting}</p>
          <div style="background:#f4f6f9;border-radius:8px;padding:16px 20px;margin:0 0 24px 0;">
            <div style="font-size:13px;color:#5d6780;margin-bottom:4px;">Past 24 hours</div>
            <div style="font-size:18px;font-weight:600;color:#3D4566;">
              Demand Signals committed <span style="color:#52C9A0;">${hours}</span> of progress towards your account.
            </div>
          </div>
          ${sections}
          <div style="text-align:center;margin:32px 0 16px 0;">
            <a href="${PORTAL_PROJECTS_URL}" style="display:inline-block;background:#52C9A0;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">
              View all updates
            </a>
          </div>
        </td></tr>
        <tr><td style="padding:20px 32px;background:#f4f6f9;border-top:1px solid #e5e7eb;font-size:12px;color:#5d6780;line-height:1.5;">
          You receive these updates because you&apos;re an active client of Demand Signals.<br>
          Want to pause these? Reply to this email and we&apos;ll take care of it.<br><br>
          Demand Signals · El Dorado Hills, CA
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function renderDigestEmailText(args: {
  businessName: string
  totalMinutes: number
  grouped: GroupedNote[]
}): string {
  const hours = formatHoursLabel(args.totalMinutes)
  const sections = args.grouped
    .map(
      (g) =>
        `\n## ${g.projectName}\n\n` +
        g.notes
          .map((n) => {
            const head = `[${shortDate(n.created_at)}]${n.title ? ` ${n.title}` : ''}`
            return `${head}\n${n.body}\n`
          })
          .join('\n'),
    )
    .join('\n')

  return (
    `Demand Signals committed ${hours} of progress towards your account in the past 24 hours.\n` +
    sections +
    `\n\nView all updates: ${PORTAL_PROJECTS_URL}\n` +
    `\n--\nYou receive these updates because you're an active client of Demand Signals.\n` +
    `Want to pause these? Reply to this email and we'll take care of it.\n`
  )
}
