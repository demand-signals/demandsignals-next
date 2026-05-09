// ── pdf/project-report.ts ──────────────────────────────────────────────
// "Project Activity Report" PDF deliverable. Different from project.ts:
// project.ts shows scope (phases/deliverables), this one shows ACTIVITY
// (time entries + client-visible notes) over a date range.
//
// Pages:
//   1. Cover — DSIG branded, project name + client + report period
//   2. Time summary — totals + Hunter/Claude split + category breakdown
//                     + top sessions
//   3. Notes timeline — every client-visible note in the period
//   4. Time entries detail — table of every entry with category badge
//
// Spec authority: J:\My Drive\Agentic Agents\CLAUDE\DSIG\DSIG_PDF_STANDARDS_v2.md

import { htmlToPdfBuffer } from './render'
import {
  T, FONT_STACK,
  esc, escNl, docShell,
  decorativeCircles, eyebrow,
  interiorPageHeader, interiorPageFooter,
  darkCoverTopStrip, darkCoverMetaBand, darkCoverFooterStrip,
} from './_shared'
import type { ProjectRow } from '@/lib/invoice-types'
import type { TimeEntry, TimeRollup, TimeEntryCategory } from '@/lib/time-entries'
import { TIME_ENTRY_CATEGORY_LABEL } from '@/lib/time-entries'

// ── Types ─────────────────────────────────────────────────────────────

export interface ProjectReportProspect {
  business_name: string
  owner_name?: string | null
  owner_email?: string | null
  city?: string | null
  state?: string | null
}

export interface ProjectReportNote {
  id: string
  title: string | null
  body: string
  visibility: 'internal' | 'client'
  source: string
  client_sent_at: string | null
  created_at: string
  // Time intentionally not on notes — see entries[] for hours.
  // (Hunter rule, 2026-05-09.)
}

export interface ProjectReportInput {
  project: ProjectRow
  prospect: ProjectReportProspect
  notes: ProjectReportNote[]
  entries: TimeEntry[]
  rollup: TimeRollup
  /** Period start as ISO date or null = "all activity ever". */
  fromDate: string | null
  /** Period end as ISO date or null = "through today". */
  toDate: string | null
  /** Whether internal notes were included (defaults to false → client-visible only). */
  includeInternal: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

function formatDateShort(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatHours(h: number): string {
  return `${h.toFixed(2)}h`
}

function formatMinutes(min: number | null | undefined): string {
  const m = Math.round(min ?? 0)
  if (m <= 0) return '—'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`
}

function entryHours(e: TimeEntry): number {
  if (e.hours != null) return Number(e.hours)
  const split = (e.hunter_minutes ?? 0) + (e.claude_minutes ?? 0)
  return split > 0 ? split / 60 : 0
}

const CATEGORY_COLOR: Record<TimeEntryCategory, string> = {
  billable: T.TEAL,
  non_billable: T.ORANGE,
  bulk_payment: T.SLATE,
  services_contract: T.SLATE,
  internal: T.GRAY,
}

function categoryPill(cat: TimeEntryCategory): string {
  const color = CATEGORY_COLOR[cat]
  return `<span style="
    display:inline-block;padding:2px 8px;border-radius:99px;
    font-size:9px;font-weight:600;letter-spacing:0.04em;
    color:${color};border:1px solid ${color};white-space:nowrap;
  ">${esc(TIME_ENTRY_CATEGORY_LABEL[cat])}</span>`
}

// ── PAGE 1 — Cover ────────────────────────────────────────────────────

function coverPage(input: ProjectReportInput): string {
  const { project, prospect, fromDate, toDate, rollup } = input
  const issueDate = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  const periodLabel =
    fromDate && toDate
      ? `${formatDateShort(fromDate)} — ${formatDateShort(toDate)}`
      : fromDate
      ? `Since ${formatDateShort(fromDate)}`
      : toDate
      ? `Through ${formatDateShort(toDate)}`
      : 'All activity to date'

  // Two-tone title split (mirror SOW + project.ts)
  let titleLine1 = project.name
  let titleLine2 = ''
  const dashIdx = project.name.indexOf(' — ')
  const hyphenIdx = project.name.indexOf(' - ')
  if (dashIdx > 0) {
    titleLine1 = project.name.slice(0, dashIdx)
    titleLine2 = project.name.slice(dashIdx + 3)
  } else if (hyphenIdx > 0) {
    titleLine1 = project.name.slice(0, hyphenIdx)
    titleLine2 = project.name.slice(hyphenIdx + 3)
  } else {
    const words = project.name.split(' ')
    if (words.length > 2) {
      const mid = Math.ceil(words.length / 2)
      titleLine1 = words.slice(0, mid).join(' ')
      titleLine2 = words.slice(mid).join(' ')
    }
  }

  const subtitle = `${formatHours(rollup.total_hours)} across ${rollup.entry_count} session${rollup.entry_count === 1 ? '' : 's'}`

  return `
  <div style="
    position:relative;width:100%;min-height:100vh;background:${T.SLATE};
    display:flex;flex-direction:column;overflow:hidden;
    -webkit-print-color-adjust:exact;print-color-adjust:exact;
    font-family:${FONT_STACK};
  ">
    ${decorativeCircles()}
    ${darkCoverTopStrip()}

    <div style="flex:1;min-height:0;position:relative;z-index:1;display:flex;flex-direction:column;justify-content:center;padding:0 56px">
      ${prospect.business_name ? `<div style="font-family:Georgia, serif; font-style:italic; font-size:44px; font-weight:400; color:${T.WHITE}; line-height:1.1; text-align:left; margin-bottom:40px;">For ${esc(prospect.business_name)}</div>` : ''}

      ${eyebrow('Project Activity Report', T.ORANGE_S)}

      <h1 style="
        font-size:46px;font-weight:700;line-height:1.1;letter-spacing:-0.01em;
        margin:0 0 0 0;word-wrap:break-word;
      ">
        <span style="color:${T.WHITE};">${esc(titleLine1)}</span>
        ${titleLine2 ? `<br><span style="color:${T.TEAL_S};">${esc(titleLine2)}</span>` : ''}
      </h1>

      <div style="width:60pt;height:2pt;background:${T.ORANGE_S};margin:16px 0 14px 0;"></div>

      <div style="font-size:14px;color:${T.WHITE};opacity:0.9;font-weight:400;margin-bottom:6px">${esc(periodLabel)}</div>
      <div style="font-size:13px;color:${T.WHITE};opacity:0.7;font-weight:400">${esc(subtitle)}</div>
    </div>

    <div style="position:relative;z-index:1;flex-shrink:0">
      ${darkCoverMetaBand(esc(prospect.business_name), 'Demand Signals', issueDate)}
      ${darkCoverFooterStrip()}
    </div>
  </div>`
}

// ── PAGE 2 — Time Summary ─────────────────────────────────────────────

function timeSummaryPage(input: ProjectReportInput): string {
  const { rollup, entries } = input

  // Top 5 longest sessions by combined minutes (or hours).
  const topSessions = [...entries]
    .map((e) => ({ e, h: entryHours(e) }))
    .sort((a, b) => b.h - a.h)
    .slice(0, 5)

  const totalHunterMin = entries.reduce((s, e) => s + (e.hunter_minutes ?? 0), 0)
  const totalClaudeMin = entries.reduce((s, e) => s + (e.claude_minutes ?? 0), 0)

  const categoryRows = (
    ['billable', 'bulk_payment', 'services_contract', 'non_billable', 'internal'] as TimeEntryCategory[]
  )
    .map((cat) => ({ cat, h: rollup.by_category?.[cat] ?? 0 }))
    .filter((r) => r.h > 0)

  return `
  <div style="
    page-break-before:page;background:${T.WHITE};font-family:${FONT_STACK};
    color:${T.BODY};padding:0;
  ">
    ${interiorPageHeader('Time Summary')}

    <div style="padding:32px 56px">
      <div style="display:flex;gap:14px;margin-bottom:24px;flex-wrap:wrap">
        ${summaryStat('Total hours', formatHours(rollup.total_hours), `${rollup.entry_count} sessions`)}
        ${summaryStat('Hunter time', formatMinutes(totalHunterMin), 'wall-clock')}
        ${summaryStat('Claude compute', formatMinutes(totalClaudeMin), 'AI processing')}
        ${summaryStat('Last entry', formatDateShort(rollup.last_entry_date), '')}
      </div>

      ${categoryRows.length > 0 ? `
        <h2 style="font-size:14px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.SLATE};margin-bottom:14px;margin-top:8px">Breakdown by category</h2>
        <table style="width:100%;border-collapse:collapse;font-family:${FONT_STACK};font-size:12px;color:${T.BODY};margin-bottom:24px">
          <tbody>
            ${categoryRows
              .map(
                (r) => `<tr>
                  <td style="padding:8px 0;border-bottom:1px solid ${T.BORDER};color:${T.SLATE};font-size:12px;width:60%">
                    ${categoryPill(r.cat)}
                  </td>
                  <td style="padding:8px 0;border-bottom:1px solid ${T.BORDER};color:${T.SLATE};font-size:13px;font-weight:700;text-align:right;font-variant-numeric:tabular-nums">${formatHours(r.h)}</td>
                  <td style="padding:8px 0;border-bottom:1px solid ${T.BORDER};color:${T.GRAY};font-size:11px;text-align:right;font-variant-numeric:tabular-nums;width:80px">${rollup.total_hours > 0 ? `${Math.round((r.h / rollup.total_hours) * 100)}%` : '—'}</td>
                </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      ` : ''}

      ${topSessions.length > 0 ? `
        <h2 style="font-size:14px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.SLATE};margin-bottom:14px">Longest sessions</h2>
        <table style="width:100%;border-collapse:collapse;font-family:${FONT_STACK};font-size:12px;color:${T.BODY}">
          <tbody>
            ${topSessions
              .map(
                ({ e, h }) => `<tr>
                  <td style="padding:8px 0;border-bottom:1px solid ${T.BORDER};color:${T.GRAY};font-size:11px;width:90px;font-variant-numeric:tabular-nums">${formatDateShort(e.logged_at)}</td>
                  <td style="padding:8px 12px 8px 0;border-bottom:1px solid ${T.BORDER};color:${T.BODY};font-size:12px">${esc(e.description ? e.description.slice(0, 90) : '(no description)')}</td>
                  <td style="padding:8px 0;border-bottom:1px solid ${T.BORDER};color:${T.SLATE};font-size:13px;font-weight:700;text-align:right;font-variant-numeric:tabular-nums;width:80px">${formatHours(h)}</td>
                </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      ` : ''}
    </div>

    ${interiorPageFooter()}
  </div>`
}

// ── PAGE 3 — Notes Timeline ───────────────────────────────────────────

function notesPage(input: ProjectReportInput): string {
  const visible = input.includeInternal
    ? input.notes
    : input.notes.filter((n) => n.visibility === 'client')

  if (visible.length === 0) {
    return `
    <div style="page-break-before:page;background:${T.WHITE};font-family:${FONT_STACK};color:${T.BODY};padding:0">
      ${interiorPageHeader('Notes Timeline')}
      <div style="padding:32px 56px">
        <p style="color:${T.GRAY};font-style:italic;font-size:12px">No client-visible notes in this period.</p>
      </div>
      ${interiorPageFooter()}
    </div>`
  }

  // Newest first (matches admin timeline + portal display).
  const sorted = [...visible].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  const noteHtml = sorted
    .map((n) => {
      const headerLabel = n.title ?? '(untitled)'
      return `
      <div style="margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid ${T.BORDER}">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:6px">
          <h3 style="font-size:14px;font-weight:700;color:${T.SLATE};margin:0">${esc(headerLabel)}</h3>
          <span style="font-size:10px;color:${T.GRAY};white-space:nowrap;font-variant-numeric:tabular-nums">${formatDateShort(n.created_at)}</span>
        </div>
        <p style="font-size:11px;color:${T.BODY};line-height:1.6;white-space:pre-wrap;margin:0">${escNl(n.body)}</p>
      </div>`
    })
    .join('')

  return `
  <div style="page-break-before:page;background:${T.WHITE};font-family:${FONT_STACK};color:${T.BODY};padding:0">
    ${interiorPageHeader('Notes Timeline')}
    <div style="padding:32px 56px">
      ${noteHtml}
    </div>
    ${interiorPageFooter()}
  </div>`
}

// ── PAGE 4 — Time Entries Detail Table ────────────────────────────────

function entriesDetailPage(input: ProjectReportInput): string {
  const { entries } = input
  if (entries.length === 0) {
    return `
    <div style="page-break-before:page;background:${T.WHITE};font-family:${FONT_STACK};color:${T.BODY};padding:0">
      ${interiorPageHeader('Time Entries')}
      <div style="padding:32px 56px">
        <p style="color:${T.GRAY};font-style:italic;font-size:12px">No time entries in this period.</p>
      </div>
      ${interiorPageFooter()}
    </div>`
  }

  // Newest first (matches panel)
  const sorted = [...entries].sort((a, b) =>
    a.logged_at < b.logged_at ? 1 : a.logged_at > b.logged_at ? -1 : 0,
  )

  const rowsHtml = sorted
    .map((e) => {
      const cat = (e.category ?? (e.billable ? 'billable' : 'non_billable')) as TimeEntryCategory
      return `
      <tr>
        <td style="padding:7px 6px;border-bottom:1px solid ${T.BORDER};color:${T.GRAY};font-size:10px;font-variant-numeric:tabular-nums;white-space:nowrap;vertical-align:top">${formatDateShort(e.logged_at)}</td>
        <td style="padding:7px 6px;border-bottom:1px solid ${T.BORDER};color:${T.BODY};font-size:10px;vertical-align:top">${esc(e.description ?? '')}</td>
        <td style="padding:7px 6px;border-bottom:1px solid ${T.BORDER};vertical-align:top">${categoryPill(cat)}</td>
        <td style="padding:7px 6px;border-bottom:1px solid ${T.BORDER};color:${T.GRAY};font-size:10px;text-align:right;font-variant-numeric:tabular-nums;vertical-align:top">${formatMinutes(e.hunter_minutes)}</td>
        <td style="padding:7px 6px;border-bottom:1px solid ${T.BORDER};color:${T.GRAY};font-size:10px;text-align:right;font-variant-numeric:tabular-nums;vertical-align:top">${formatMinutes(e.claude_minutes)}</td>
        <td style="padding:7px 6px;border-bottom:1px solid ${T.BORDER};color:${T.SLATE};font-size:11px;font-weight:700;text-align:right;font-variant-numeric:tabular-nums;vertical-align:top;white-space:nowrap">${formatHours(entryHours(e))}</td>
      </tr>`
    })
    .join('')

  return `
  <div style="page-break-before:page;background:${T.WHITE};font-family:${FONT_STACK};color:${T.BODY};padding:0">
    ${interiorPageHeader('Time Entries')}
    <div style="padding:24px 36px">
      <table style="width:100%;border-collapse:collapse;font-family:${FONT_STACK};font-size:10px;color:${T.BODY}">
        <thead>
          <tr style="background:${T.OFF_WHITE}">
            <th style="padding:8px 6px;text-align:left;color:${T.GRAY};font-size:9px;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;border-bottom:1px solid ${T.BORDER}">Date</th>
            <th style="padding:8px 6px;text-align:left;color:${T.GRAY};font-size:9px;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;border-bottom:1px solid ${T.BORDER}">Description</th>
            <th style="padding:8px 6px;text-align:left;color:${T.GRAY};font-size:9px;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;border-bottom:1px solid ${T.BORDER}">Category</th>
            <th style="padding:8px 6px;text-align:right;color:${T.GRAY};font-size:9px;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;border-bottom:1px solid ${T.BORDER}">Hunter</th>
            <th style="padding:8px 6px;text-align:right;color:${T.GRAY};font-size:9px;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;border-bottom:1px solid ${T.BORDER}">Claude</th>
            <th style="padding:8px 6px;text-align:right;color:${T.GRAY};font-size:9px;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;border-bottom:1px solid ${T.BORDER}">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
    ${interiorPageFooter()}
  </div>`
}

// ── Cover summary stat helper ─────────────────────────────────────────

function summaryStat(label: string, value: string, sublabel: string): string {
  return `
  <div style="flex:1;min-width:140px;padding:14px 18px;background:${T.OFF_WHITE};border-radius:4px;border-top:3px solid ${T.TEAL}">
    <p style="font-size:10px;color:${T.GRAY};letter-spacing:0.1em;text-transform:uppercase;font-weight:700;margin-bottom:6px">${esc(label)}</p>
    <p style="font-size:18px;font-weight:700;color:${T.SLATE};margin-bottom:2px;font-variant-numeric:tabular-nums">${esc(value)}</p>
    ${sublabel ? `<p style="font-size:10px;color:${T.GRAY}">${esc(sublabel)}</p>` : ''}
  </div>`
}

// ── Main export ───────────────────────────────────────────────────────

/**
 * Render a 4-page Project Activity Report PDF (cover + time summary +
 * notes timeline + entries detail table).
 */
export async function renderProjectReportPdf(input: ProjectReportInput): Promise<Buffer> {
  const html = docShell(
    `Project Activity Report — ${input.project.name} — ${input.prospect.business_name}`,
    coverPage(input)
    + timeSummaryPage(input)
    + notesPage(input)
    + entriesDetailPage(input),
  )
  return htmlToPdfBuffer(html, { format: 'Legal', printBackground: true })
}
