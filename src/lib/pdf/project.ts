// ── pdf/project.ts ─────────────────────────────────────────────────────
// 3-page Project / Bug Report PDF per DSIG PDF Generation Standard v2.
// Pages: Cover / Scope+Phases / Summary
// Reuses SOW renderer's brand-spec phase/deliverable formatting via
// shared helpers (cadencePill, accumulatePhase, accumulateAll,
// deliverableRow, phaseBlock). When SOW formatting changes, project
// PDFs follow automatically.
//
// Differences vs SOW PDF:
//   - 3 pages (no signature page, no back cover with quote)
//   - Cover eyebrow varies by project type:
//       customer_service → "Customer Service Report"
//       bug_report       → "Bug Report"
//       internal/courtesy → "Project Brief — Internal"
//       all others       → "Project Brief"
//   - Status pill (Active / Planning / Completed / etc) shown on cover
//   - Per-phase status pill on the scope page
//   - Per-deliverable delivered-state on the scope page
//   - No payment terms, no investment summary, no signature blocks

import { formatCents } from '@/lib/format'
import type { ProjectRow, ProjectPhase, ProjectPhaseDeliverable } from '@/lib/invoice-types'
import { htmlToPdfBuffer } from './render'
import {
  T, FONT_STACK,
  esc, docShell,
  decorativeCircles, eyebrow,
  interiorPageHeader, interiorPageFooter,
  darkCoverTopStrip, darkCoverMetaBand, darkCoverFooterStrip,
} from './_shared'
import {
  phaseBlock, accumulateAll,
  type TotalsAccum,
} from './sow'
import type { SowPhase } from '@/lib/invoice-types'

// ── Types ─────────────────────────────────────────────────────────────

export interface ProjectProspect {
  business_name: string
  owner_name?: string | null
  owner_email?: string | null
  city?: string | null
  state?: string | null
}

// ── Project type → cover eyebrow / heading mapping ────────────────────

const TYPE_EYEBROW: Record<string, string> = {
  customer_service: 'Customer Service Report',
  bug_report: 'Bug Report',
  internal: 'Project Brief — Internal',
  courtesy: 'Project Brief — Courtesy',
  website: 'Project Brief',
  mobile_app: 'Project Brief',
  webapp: 'Project Brief',
  content: 'Project Brief',
  seo: 'Project Brief',
  ads: 'Project Brief',
  consulting: 'Project Brief',
  other: 'Project Brief',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  planning: 'Planning',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const STATUS_COLOR: Record<string, string> = {
  active: T.TEAL,
  planning: T.GRAY,
  in_progress: T.TEAL,
  on_hold: T.ORANGE,
  completed: T.SLATE,
  cancelled: T.GRAY,
}

const PHASE_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
}

const PHASE_STATUS_COLOR: Record<string, string> = {
  pending: T.GRAY,
  in_progress: T.TEAL,
  completed: T.TEAL_S,
}

// ── Coercion: ProjectPhase → SowPhase shape (for shared phaseBlock) ───
//
// ProjectPhase and SowPhase are structurally compatible for the read
// fields phaseBlock uses (name, description, deliverables[]). The
// Project shape adds optional status + completed_at on phases and
// status + delivered_at on deliverables — phaseBlock ignores those.
// A trivial cast is safe.

function asSowPhase(phase: ProjectPhase): SowPhase {
  return phase as unknown as SowPhase
}

// ── Status pill helper ────────────────────────────────────────────────

function statusPill(status: string, scale: 'cover' | 'inline' = 'inline'): string {
  const label = STATUS_LABEL[status] ?? status
  const color = STATUS_COLOR[status] ?? T.GRAY
  if (scale === 'cover') {
    return `<span style="
      display:inline-block;padding:6px 16px;border-radius:99px;
      font-size:11px;font-weight:700;letter-spacing:0.12em;
      text-transform:uppercase;color:${T.WHITE};background:${color};
      -webkit-print-color-adjust:exact;print-color-adjust:exact;
    ">${esc(label)}</span>`
  }
  return `<span style="
    display:inline-block;padding:2px 8px;border-radius:99px;
    font-size:10px;font-weight:600;letter-spacing:0.02em;
    color:${color};border:1px solid ${color};white-space:nowrap;
  ">${esc(label)}</span>`
}

function phaseStatusPill(status: string): string {
  const label = PHASE_STATUS_LABEL[status] ?? status
  const color = PHASE_STATUS_COLOR[status] ?? T.GRAY
  return `<span style="
    display:inline-block;padding:2px 8px;border-radius:99px;
    font-size:9px;font-weight:600;letter-spacing:0.05em;
    text-transform:uppercase;color:${color};border:1px solid ${color};
    white-space:nowrap;margin-left:8px;
  ">${esc(label)}</span>`
}

// ── PAGE 1 — Cover ────────────────────────────────────────────────────

function coverPage(project: ProjectRow, prospect: ProjectProspect): string {
  const issueDate = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
  const eyebrowLabel = TYPE_EYEBROW[project.type] ?? 'Project Brief'

  // Two-tone title split (same logic as SOW)
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

      ${eyebrow(eyebrowLabel, T.ORANGE_S)}

      <h1 style="
        font-size:46px;font-weight:700;line-height:1.1;letter-spacing:-0.01em;
        margin:0 0 0 0;word-wrap:break-word;
      ">
        <span style="color:${T.WHITE};">${esc(titleLine1)}</span>
        ${titleLine2 ? `<br><span style="color:${T.TEAL_S};">${esc(titleLine2)}</span>` : ''}
      </h1>

      <div style="width:60pt;height:2pt;background:${T.ORANGE_S};margin:16px 0 14px 0;"></div>

      <div style="margin-top:8px">${statusPill(project.status, 'cover')}</div>
    </div>

    <div style="position:relative;z-index:1;flex-shrink:0">
      ${darkCoverMetaBand(esc(prospect.business_name), 'Demand Signals', issueDate)}
      ${darkCoverFooterStrip()}
    </div>
  </div>`
}

// ── PAGE 2 — Scope + Phases & Deliverables ────────────────────────────

function scopePage(project: ProjectRow): string {
  const phases = project.phases ?? []

  const phasesHtml =
    phases.length > 0
      ? phases.map((p, i) => {
          // Use the shared SOW phase block, then overlay a status pill
          // by string-replacing into the phase name h3. Cheap but keeps
          // the shared renderer untouched.
          const block = phaseBlock(asSowPhase(p), i)
          if (!p.status) return block
          const pill = phaseStatusPill(p.status)
          return block.replace(
            /(<h3 style="[^"]+">)([\s\S]*?)(<\/h3>)/,
            (_m, open, inner, close) => `${open}${inner}${pill}${close}`,
          )
        }).join('')
      : `<p style="color:${T.GRAY};font-style:italic;font-size:12px;margin-top:16px">No phases defined for this project yet.</p>`

  return `
  <div style="
    page-break-before:page;background:${T.WHITE};font-family:${FONT_STACK};
    color:${T.BODY};padding:0;
  ">
    ${interiorPageHeader('Scope & Deliverables')}

    <div style="padding:32px 56px">
      ${project.notes ? `
        <div style="margin-bottom:24px;padding:14px 18px;background:${T.OFF_WHITE};border-left:3px solid ${T.TEAL};border-radius:2px">
          <p style="font-size:11px;color:${T.GRAY};letter-spacing:0.1em;text-transform:uppercase;font-weight:700;margin-bottom:6px">Project notes</p>
          <p style="font-size:12px;color:${T.BODY};line-height:1.6;white-space:pre-wrap">${esc(project.notes)}</p>
        </div>
      ` : ''}

      <h2 style="font-size:14px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.SLATE};margin-bottom:20px">Phases &amp; Deliverables</h2>

      ${phasesHtml}
    </div>

    ${interiorPageFooter()}
  </div>`
}

// ── PAGE 3 — Project Summary ──────────────────────────────────────────

function summaryPage(
  project: ProjectRow,
  prospect: ProjectProspect,
  totals: TotalsAccum,
): string {
  const phases = project.phases ?? []
  const totalPhases = phases.length
  const completedPhases = phases.filter((p) => p.status === 'completed').length
  const totalDeliverables = phases.reduce((s, p) => s + (p.deliverables?.length ?? 0), 0)
  const deliveredCount = phases.reduce(
    (s, p) => s + (p.deliverables?.filter((d: ProjectPhaseDeliverable) => d.status === 'delivered').length ?? 0),
    0,
  )

  const startDate = project.start_date
    ? new Date(project.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—'
  const targetDate = project.target_date
    ? new Date(project.target_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—'
  const completedAt = project.completed_at
    ? new Date(project.completed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  const valueParts: string[] = []
  if (totals.oneTime > 0) valueParts.push(`${formatCents(totals.oneTime)} one-time`)
  if (totals.monthly > 0) valueParts.push(`${formatCents(totals.monthly)}/mo`)
  if (totals.quarterly > 0) valueParts.push(`${formatCents(totals.quarterly)}/qtr`)
  if (totals.annual > 0) valueParts.push(`${formatCents(totals.annual)}/yr`)
  const valueLine = valueParts.length > 0 ? valueParts.join(' · ') : 'No priced deliverables'

  return `
  <div style="
    page-break-before:page;background:${T.WHITE};font-family:${FONT_STACK};
    color:${T.BODY};padding:0;
  ">
    ${interiorPageHeader('Project Summary')}

    <div style="padding:32px 56px">
      <div style="display:flex;gap:14px;margin-bottom:24px;flex-wrap:wrap">
        ${summaryStat('Phases', `${completedPhases} / ${totalPhases}`, 'completed')}
        ${summaryStat('Deliverables', `${deliveredCount} / ${totalDeliverables}`, 'delivered')}
        ${summaryStat('Status', STATUS_LABEL[project.status] ?? project.status, '')}
        ${completedAt ? summaryStat('Completed', completedAt, '') : ''}
      </div>

      <div style="margin-bottom:24px;padding:18px 22px;background:${T.OFF_WHITE};border-radius:4px">
        <p style="font-size:11px;color:${T.GRAY};letter-spacing:0.1em;text-transform:uppercase;font-weight:700;margin-bottom:8px">Reference value</p>
        <p style="font-size:18px;font-weight:700;color:${T.SLATE};font-variant-numeric:tabular-nums">${esc(valueLine)}</p>
        <p style="font-size:10px;color:${T.GRAY};margin-top:4px;font-style:italic">Reference values from priced deliverables. Actual billing per project terms.</p>
      </div>

      <table style="width:100%;border-collapse:collapse;font-family:${FONT_STACK};font-size:12px;color:${T.BODY}">
        <tbody>
          ${summaryRow('Client', prospect.business_name)}
          ${prospect.owner_name ? summaryRow('Contact', prospect.owner_name) : ''}
          ${prospect.owner_email ? summaryRow('Email', prospect.owner_email) : ''}
          ${(prospect.city || prospect.state) ? summaryRow('Location', [prospect.city, prospect.state].filter(Boolean).join(', ')) : ''}
          ${summaryRow('Project type', (TYPE_EYEBROW[project.type] ?? project.type).replace(/^Project Brief.*$/, project.type))}
          ${summaryRow('Started', startDate)}
          ${summaryRow('Target', targetDate)}
        </tbody>
      </table>
    </div>

    ${interiorPageFooter()}
  </div>`
}

function summaryStat(label: string, value: string, sublabel: string): string {
  return `
  <div style="flex:1;min-width:140px;padding:14px 18px;background:${T.OFF_WHITE};border-radius:4px;border-top:3px solid ${T.TEAL}">
    <p style="font-size:10px;color:${T.GRAY};letter-spacing:0.1em;text-transform:uppercase;font-weight:700;margin-bottom:6px">${esc(label)}</p>
    <p style="font-size:18px;font-weight:700;color:${T.SLATE};margin-bottom:2px;font-variant-numeric:tabular-nums">${esc(value)}</p>
    ${sublabel ? `<p style="font-size:10px;color:${T.GRAY}">${esc(sublabel)}</p>` : ''}
  </div>`
}

function summaryRow(label: string, value: string): string {
  return `
  <tr>
    <td style="padding:8px 0;border-bottom:1px solid ${T.BORDER};color:${T.GRAY};font-size:11px;letter-spacing:0.05em;text-transform:uppercase;font-weight:700;width:140px;vertical-align:top">${esc(label)}</td>
    <td style="padding:8px 0;border-bottom:1px solid ${T.BORDER};color:${T.SLATE};font-size:12px;vertical-align:top">${esc(value)}</td>
  </tr>`
}

// ── Main export ───────────────────────────────────────────────────────

/**
 * Render a 3-page Project (or Bug Report / Customer Service) PDF.
 * Pages: Cover / Scope+Phases / Summary
 */
export async function renderProjectPdf(
  project: ProjectRow,
  prospect: ProjectProspect,
): Promise<Buffer> {
  const phases = project.phases ?? []
  const totals = accumulateAll(phases.map(asSowPhase))

  const eyebrowLabel = TYPE_EYEBROW[project.type] ?? 'Project Brief'

  const html = docShell(
    `${eyebrowLabel} — ${project.name} — ${prospect.business_name}`,
    coverPage(project, prospect)
    + scopePage(project)
    + summaryPage(project, prospect, totals),
  )

  return htmlToPdfBuffer(html, { format: 'Legal', printBackground: true })
}
