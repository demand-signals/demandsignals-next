// ── pdf/sow.ts ────────────────────────────────────────────────────────
// 4-page SOW PDF per DSIG PDF Generation Standard v2.
// Pages: Cover / Scope+Phases / Investment+Signature / Back Cover
// All CSS is inlined. Chromium pipeline (no external fonts).

import { formatCents } from '@/lib/format'
import type { SowDocument, SowPhase, SowPhaseDeliverable } from '@/lib/invoice-types'
import { htmlToPdfBuffer } from './render'
import {
  T, LOGO_URL, FONT_STACK,
  esc, escNl, docShell,
  decorativeCircles, eyebrow, oDiv,
  interiorPageHeader, interiorPageFooter,
  darkCoverTopStrip, darkCoverMetaBand, darkCoverFooterStrip,
} from './_shared'

// ── Types ─────────────────────────────────────────────────────────────

export interface SowProspect {
  business_name: string
  contact_name?: string | null
  email?: string | null
  owner_name?: string | null
  owner_email?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
}

// ── Cadence helpers ───────────────────────────────────────────────────

const CADENCE_SUFFIX: Record<string, string> = {
  one_time: '', monthly: '/mo', quarterly: '/qtr', annual: '/yr',
}

const CADENCE_LABEL: Record<string, string> = {
  one_time: 'One-time', monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual',
}

// Cadence pill colors — spec: teal for recurring, gray for one-time
const CADENCE_COLOR: Record<string, string> = {
  one_time:   T.GRAY,
  monthly:    T.TEAL,
  quarterly:  T.TEAL_S,
  annual:     T.ORANGE,
}

function cadencePill(cadence: string): string {
  const label = CADENCE_LABEL[cadence] ?? cadence
  const color = CADENCE_COLOR[cadence] ?? T.GRAY
  return `<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:600;color:${color};border:1px solid ${color};white-space:nowrap;letter-spacing:0.02em">${esc(label)}</span>`
}

// ── Phase accumulator ─────────────────────────────────────────────────

interface TotalsAccum {
  oneTime: number; monthly: number; quarterly: number; annual: number
}

function accumulatePhase(phase: SowPhase): TotalsAccum {
  const t: TotalsAccum = { oneTime: 0, monthly: 0, quarterly: 0, annual: 0 }
  for (const d of phase.deliverables) {
    const line = d.line_total_cents ?? ((d.hours ?? d.quantity ?? 1) * (d.unit_price_cents ?? 0))
    switch (d.cadence) {
      case 'monthly':   t.monthly   += line; break
      case 'quarterly': t.quarterly += line; break
      case 'annual':    t.annual    += line; break
      default:          t.oneTime   += line
    }
  }
  return t
}

function accumulateAll(phases: SowPhase[]): TotalsAccum {
  return phases.reduce<TotalsAccum>(
    (acc, p) => {
      const t = accumulatePhase(p)
      return {
        oneTime:   acc.oneTime   + t.oneTime,
        monthly:   acc.monthly   + t.monthly,
        quarterly: acc.quarterly + t.quarterly,
        annual:    acc.annual    + t.annual,
      }
    },
    { oneTime: 0, monthly: 0, quarterly: 0, annual: 0 },
  )
}

// ── PAGE 1 — Cover ─────────────────────────────────────────────────────
// Full-bleed SLATE, decorative circles, logo, eyebrow, title, meta band.

// Page-break strategy (locked 2026-04-29 after SOW-DOCK-042826A bug):
//
// Each interior page wrapper uses break-before:page to start on a fresh
// sheet. White content pages do NOT use min-height:100vh — that combined
// with flex:1 on inner content was forcing 1px of overflow onto a 2nd
// physical sheet, and the persistent header/footer chrome rendered alone
// there as an empty page (just the "Demand Signals — Confidential | …"
// footer). Instead, content sizes naturally; Chromium handles wrapping
// when real content overflows. Dark cover pages keep min-height:100vh
// because their full-bleed dark background MUST fill the sheet.
//
// Anti-pattern banned in this file:
//   white-interior-page + min-height:100vh + flex:1 + page-break-after
//
// If you reintroduce any of those on a white interior page, the empty
// page returns. Don't.
function coverPage(sow: SowDocument, prospect: SowProspect): string {
  const issueDate = sow.send_date
    ? new Date(sow.send_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  // Split title at natural break for two-tone alternating-color display
  // If the title contains ' — ' or ' - ' use that, otherwise split at midpoint word
  let titleLine1 = sow.title
  let titleLine2 = ''
  const dashIdx = sow.title.indexOf(' — ')
  const hyphenIdx = sow.title.indexOf(' - ')
  if (dashIdx > 0) {
    titleLine1 = sow.title.slice(0, dashIdx)
    titleLine2 = sow.title.slice(dashIdx + 3)
  } else if (hyphenIdx > 0) {
    titleLine1 = sow.title.slice(0, hyphenIdx)
    titleLine2 = sow.title.slice(hyphenIdx + 3)
  } else {
    // Split at first space past midpoint
    const words = sow.title.split(' ')
    if (words.length > 2) {
      const mid = Math.ceil(words.length / 2)
      titleLine1 = words.slice(0, mid).join(' ')
      titleLine2 = words.slice(mid).join(' ')
    }
  }

  return `
  <div style="
    position:relative;
    width:100%;
    min-height:100vh;
    background:${T.SLATE};
    display:flex;
    flex-direction:column;
    overflow:hidden;
    -webkit-print-color-adjust:exact;
    print-color-adjust:exact;
    font-family:${FONT_STACK};
  ">
    ${decorativeCircles()}

    <!-- TOP ZONE: Logo row + pill badge (shared chrome) -->
    ${darkCoverTopStrip()}

    <!-- CENTER ZONE: Title block — vertically centered in the remaining space above the meta band -->
    <div style="flex:1;min-height:0;position:relative;z-index:1;display:flex;flex-direction:column;justify-content:center;padding:0 56px">
      <!-- Client business name (if available) -->
      ${prospect?.business_name ? `<div style="font-family:Georgia, serif; font-style:italic; font-size:44px; font-weight:400; color:${T.WHITE}; line-height:1.1; text-align:left; margin-bottom:40px;">For ${esc(prospect.business_name)}</div>` : ''}

      <!-- Eyebrow: Statement of Work (or per-SOW override) -->
      ${eyebrow(sow.cover_eyebrow || 'Statement of Work', T.ORANGE_S)}

      <!-- Title block: alternating white + teal lines -->
      <h1 style="
        font-size:46px;
        font-weight:700;
        line-height:1.1;
        letter-spacing:-0.01em;
        margin:0 0 0 0;
        word-wrap:break-word;
      ">
        <span style="color:${T.WHITE};">${esc(titleLine1)}</span>
        ${titleLine2 ? `<br><span style="color:${T.TEAL_S};">${esc(titleLine2)}</span>` : ''}
      </h1>

      <!-- Orange divider under title -->
      <div style="width:60pt;height:2pt;background:${T.ORANGE_S};margin:16px 0 14px 0;"></div>

      <!-- Tagline (or per-SOW override) -->
      <p style="
        font-size:11px;
        color:${T.CCCC};
        font-weight:400;
        margin:0;
      ">${esc(sow.cover_tagline || 'Prepared by Demand Signals — Digital Growth & Strategy')}</p>
    </div>

    <!-- BOTTOM ZONE: Meta band + footer strip (shared chrome) -->
    <div style="position:relative;z-index:1;flex-shrink:0">
      ${darkCoverMetaBand(esc(prospect.business_name), 'Demand Signals', issueDate)}
      ${darkCoverFooterStrip()}
    </div>
  </div>`
}

// ── PAGE 2 — Scope + Phases & Deliverables ────────────────────────────

function deliverableRow(d: SowPhaseDeliverable, rowIdx: number): string {
  const qty    = d.quantity ?? 1
  const hrs    = d.hours
  const unit   = d.unit_price_cents ?? 0
  const line   = d.line_total_cents ?? ((hrs ?? qty) * unit)
  const cadence = d.cadence ?? 'one_time'
  const suffix  = CADENCE_SUFFIX[cadence] ?? ''
  const qtyCell = hrs != null ? `${hrs}&nbsp;hr` : `${qty}`
  const rateStr = `${formatCents(unit)}${suffix ? `<span style="font-size:10px;color:${T.GRAY}">${suffix}</span>` : ''}`
  const totalStr = line > 0 ? `${formatCents(line)}${suffix ? `<span style="font-size:10px;color:${T.GRAY}">${suffix}</span>` : ''}` : '—'
  const rowBg = rowIdx % 2 === 1 ? T.OFF_WHITE : T.WHITE

  return `<tr style="background:${rowBg}">
    <td style="padding:9px 11px;border-bottom:1px solid ${T.BORDER};vertical-align:top;max-width:220px">
      <div style="font-weight:600;font-size:12px;color:${T.SLATE}">${esc(d.name)}</div>
      ${d.description ? `<div style="font-size:11px;color:${T.BODY};margin-top:2px;line-height:1.5">${esc(d.description)}</div>` : ''}
    </td>
    <td style="padding:9px 11px;border-bottom:1px solid ${T.BORDER};text-align:center;vertical-align:top;white-space:nowrap">${cadencePill(cadence)}</td>
    <td style="padding:9px 11px;border-bottom:1px solid ${T.BORDER};text-align:right;vertical-align:top;font-size:12px;white-space:nowrap;font-variant-numeric:tabular-nums">${qtyCell}</td>
    <td style="padding:9px 11px;border-bottom:1px solid ${T.BORDER};text-align:right;vertical-align:top;font-size:12px;white-space:nowrap;font-variant-numeric:tabular-nums">${rateStr}</td>
    <td style="padding:9px 11px;border-bottom:1px solid ${T.BORDER};text-align:right;vertical-align:top;font-size:12px;font-weight:600;white-space:nowrap;font-variant-numeric:tabular-nums">${totalStr}</td>
  </tr>`
}

function phaseBlock(phase: SowPhase, idx: number): string {
  const num = String(idx + 1).padStart(2, '0')
  const t = accumulatePhase(phase)
  const parts: string[] = []
  if (t.oneTime    > 0) parts.push(`${formatCents(t.oneTime)} one-time`)
  if (t.monthly    > 0) parts.push(`${formatCents(t.monthly)}/mo`)
  if (t.quarterly  > 0) parts.push(`${formatCents(t.quarterly)}/qtr`)
  if (t.annual     > 0) parts.push(`${formatCents(t.annual)}/yr`)
  const subtotalStr = parts.join(' · ')

  return `
  <div style="margin-bottom:28px">
    <!-- Phase header -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <span style="
        display:inline-flex;align-items:center;justify-content:center;
        width:26px;height:26px;border-radius:50%;
        background:${T.TEAL};color:${T.WHITE};
        font-size:10px;font-weight:700;letter-spacing:0.05em;
        flex-shrink:0;
      ">${num}</span>
      <h3 style="font-size:13px;font-weight:700;color:${T.SLATE};">${esc(phase.name)}</h3>
    </div>
    ${phase.description ? `<p style="font-size:12px;color:${T.BODY};font-style:italic;margin-bottom:10px;margin-left:36px;line-height:1.5">${esc(phase.description)}</p>` : ''}

    ${phase.deliverables.length > 0 ? `
    <table style="width:100%;border-collapse:collapse;font-family:${FONT_STACK}">
      <thead>
        <tr style="background:${T.SLATE}">
          <th style="text-align:left;padding:7px 11px;font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${T.WHITE}">Item</th>
          <th style="text-align:center;padding:7px 11px;font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${T.WHITE};width:80px">Cadence</th>
          <th style="text-align:right;padding:7px 11px;font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${T.WHITE};width:50px">Qty</th>
          <th style="text-align:right;padding:7px 11px;font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${T.WHITE};width:72px">Rate</th>
          <th style="text-align:right;padding:7px 11px;font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${T.WHITE};width:80px">Total</th>
        </tr>
      </thead>
      <tbody>
        ${phase.deliverables.map((d, i) => deliverableRow(d, i)).join('')}
      </tbody>
    </table>
    ${subtotalStr ? `<div style="text-align:right;font-size:11px;color:${T.BODY};margin-top:6px;padding-right:11px">Phase subtotal: <strong style="color:${T.SLATE}">${subtotalStr}</strong></div>` : ''}
    ` : `<p style="font-size:12px;color:${T.GRAY};font-style:italic;margin-left:36px">No deliverables defined for this phase.</p>`}
  </div>`
}

function legacyDeliverablesFallback(sow: SowDocument): string {
  if (!sow.deliverables?.length) return `<p style="color:${T.GRAY};font-style:italic">No deliverables.</p>`
  const rows = sow.deliverables.map((d, i) => {
    const qty  = d.quantity ?? 1
    const hrs  = d.hours
    const unit = d.unit_price_cents ?? 0
    const line = d.line_total_cents ?? ((hrs ?? qty) * unit)
    const qtyCell = hrs != null ? `${hrs}&nbsp;hr` : `${qty}`
    const rowBg = i % 2 === 1 ? T.OFF_WHITE : T.WHITE
    return `<tr style="background:${rowBg}">
      <td style="padding:9px 11px;border-bottom:1px solid ${T.BORDER};vertical-align:top">
        <div style="font-weight:600;font-size:12px;color:${T.SLATE}">${esc(d.name)}</div>
        <div style="font-size:11px;color:${T.BODY};margin-top:2px">${esc(d.description)}</div>
      </td>
      <td style="padding:9px 11px;border-bottom:1px solid ${T.BORDER};text-align:right;font-size:12px;font-variant-numeric:tabular-nums">${qtyCell}</td>
      <td style="padding:9px 11px;border-bottom:1px solid ${T.BORDER};text-align:right;font-size:12px;font-variant-numeric:tabular-nums">${formatCents(unit)}</td>
      <td style="padding:9px 11px;border-bottom:1px solid ${T.BORDER};text-align:right;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums">${formatCents(line)}</td>
    </tr>`
  }).join('')

  return `
  <table style="width:100%;border-collapse:collapse;font-family:${FONT_STACK}">
    <thead>
      <tr style="background:${T.SLATE}">
        <th style="text-align:left;padding:7px 11px;font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${T.WHITE}">Item</th>
        <th style="text-align:right;padding:7px 11px;font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${T.WHITE};width:60px">Qty/Hrs</th>
        <th style="text-align:right;padding:7px 11px;font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${T.WHITE};width:72px">Rate</th>
        <th style="text-align:right;padding:7px 11px;font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${T.WHITE};width:80px">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`
}

function scopePage(sow: SowDocument): string {
  const usePhases = Array.isArray(sow.phases) && sow.phases.length > 0
  const phasesHtml = usePhases
    ? sow.phases.map((p, i) => phaseBlock(p, i)).join('')
    : legacyDeliverablesFallback(sow)

  return `
  <div style="
    width:100%;
    background:${T.WHITE};
    display:block;
    break-before:page;
    font-family:${FONT_STACK};
  ">
    ${interiorPageHeader('01 — Scope')}

    <div style="padding:32px 54px">
      <!-- Section eyebrow + H1 + ODiv -->
      ${eyebrow('Scope')}
      <h1 style="
        font-size:24px;
        font-weight:700;
        color:${T.SLATE};
        letter-spacing:-0.01em;
        line-height:1.2;
        margin:0 0 4px 0;
        word-wrap:break-word;
      ">${esc(sow.title)}</h1>
      ${oDiv()}

      ${sow.scope_summary ? `<p style="font-size:13px;color:${T.BODY};line-height:1.7;margin-bottom:28px;max-width:540px">${escNl(sow.scope_summary)}</p>` : ''}

      <!-- Phases eyebrow -->
      ${eyebrow('Phases &amp; Deliverables')}

      ${phasesHtml}
    </div>

    ${interiorPageFooter()}
  </div>`
}

// ── PAGE 3 — Investment + Signature ──────────────────────────────────

function infoCard(
  title: string,
  body: string,
  bg: string,
  borderColor: string,
): string {
  return `
  <div style="
    background:${bg};
    border-left:3px solid ${borderColor};
    padding:16px 20px;
    margin-bottom:14px;
  ">
    <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${borderColor};margin-bottom:8px;font-family:${FONT_STACK}">${title}</p>
    <div style="font-size:12px;color:${T.BODY};line-height:1.6;font-family:${FONT_STACK}">${body}</div>
  </div>`
}

function investmentPage(sow: SowDocument): string {
  const totals      = accumulateAll(sow.phases)
  const tikCents    = sow.trade_credit_cents ?? 0
  // Document-level discount (migration 036). Order: subtotal − discount − TIK = cash.
  const discountCents = (() => {
    if (sow.discount_kind === 'percent') {
      const bps = Math.max(0, Math.min(10000, sow.discount_value_bps ?? 0))
      return Math.min(totals.oneTime, Math.round(totals.oneTime * bps / 10000))
    }
    if (sow.discount_kind === 'amount') {
      return Math.min(totals.oneTime, Math.max(0, sow.discount_amount_cents ?? 0))
    }
    return 0
  })()
  const cashOneTime = Math.max(0, totals.oneTime - discountCents - tikCents)
  const depositPct  = sow.pricing.deposit_pct ?? 50
  const hasReductions = tikCents > 0 || discountCents > 0
  const depositCents = hasReductions
    ? Math.round((cashOneTime * depositPct) / 100)
    : (sow.pricing.deposit_cents ?? Math.round((totals.oneTime * depositPct) / 100))
  const balanceCents  = (hasReductions ? cashOneTime : totals.oneTime) - depositCents
  const hasCash       = totals.oneTime > 0
  const hasRecurring  = totals.monthly > 0 || totals.quarterly > 0 || totals.annual > 0

  const bigNumber = hasReductions ? formatCents(cashOneTime) : formatCents(totals.oneTime)

  const isAccepted  = !!sow.accepted_at && !!sow.accepted_signature
  const acceptedDate = isAccepted
    ? new Date(sow.accepted_at!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : ''

  const rows: string[] = []

  if (totals.oneTime > 0) {
    rows.push(`<tr>
      <td style="padding:7px 0;border-bottom:1px solid ${T.BORDER};font-size:12px;color:${T.BODY}">One-time project total</td>
      <td style="padding:7px 0;border-bottom:1px solid ${T.BORDER};text-align:right;font-size:12px;font-variant-numeric:tabular-nums;color:${T.SLATE}">${formatCents(totals.oneTime)}</td>
    </tr>`)
  }
  if (totals.monthly > 0) {
    rows.push(`<tr>
      <td style="padding:7px 0;border-bottom:1px solid ${T.BORDER};font-size:12px;color:${T.BODY}">Monthly recurring</td>
      <td style="padding:7px 0;border-bottom:1px solid ${T.BORDER};text-align:right;font-size:12px;font-variant-numeric:tabular-nums;color:${T.TEAL}">${formatCents(totals.monthly)}<span style="font-size:10px;color:${T.GRAY}">/mo</span></td>
    </tr>`)
  }
  if (totals.quarterly > 0) {
    rows.push(`<tr>
      <td style="padding:7px 0;border-bottom:1px solid ${T.BORDER};font-size:12px;color:${T.BODY}">Quarterly recurring</td>
      <td style="padding:7px 0;border-bottom:1px solid ${T.BORDER};text-align:right;font-size:12px;font-variant-numeric:tabular-nums;color:${T.TEAL}">${formatCents(totals.quarterly)}<span style="font-size:10px;color:${T.GRAY}">/qtr</span></td>
    </tr>`)
  }
  if (totals.annual > 0) {
    rows.push(`<tr>
      <td style="padding:7px 0;border-bottom:1px solid ${T.BORDER};font-size:12px;color:${T.BODY}">Annual recurring</td>
      <td style="padding:7px 0;border-bottom:1px solid ${T.BORDER};text-align:right;font-size:12px;font-variant-numeric:tabular-nums;color:${T.TEAL}">${formatCents(totals.annual)}<span style="font-size:10px;color:${T.GRAY}">/yr</span></td>
    </tr>`)
  }
  if (discountCents > 0) {
    const discLabel = sow.discount_description?.trim() || 'Discount'
    const discSuffix = sow.discount_kind === 'percent'
      ? ` <span style="color:${T.GRAY};font-weight:400">(${((sow.discount_value_bps ?? 0) / 100).toFixed((sow.discount_value_bps ?? 0) % 100 === 0 ? 0 : 2)}%)</span>`
      : ''
    rows.push(`<tr>
      <td style="padding:7px 0;border-bottom:1px solid ${T.BORDER};font-size:12px;color:${T.BODY}">
        ${esc(discLabel)}${discSuffix}
      </td>
      <td style="padding:7px 0;border-bottom:1px solid ${T.BORDER};text-align:right;font-size:12px;font-variant-numeric:tabular-nums;color:${T.ORANGE_S}">−${formatCents(discountCents)}</td>
    </tr>`)
  }
  if (tikCents > 0) {
    rows.push(`<tr>
      <td style="padding:7px 0;border-bottom:1px solid ${T.BORDER};font-size:12px;color:${T.BODY}">
        Trade-in-Kind credit
        ${sow.trade_credit_description ? `<div style="font-size:10px;color:${T.GRAY};margin-top:2px">${esc(sow.trade_credit_description)}</div>` : ''}
      </td>
      <td style="padding:7px 0;border-bottom:1px solid ${T.BORDER};text-align:right;font-size:12px;font-variant-numeric:tabular-nums;color:${T.ORANGE_S}">−${formatCents(tikCents)}</td>
    </tr>`)
  }
  if (hasReductions) {
    rows.push(`<tr>
      <td style="padding:7px 0;border-bottom:2px solid ${T.RULE};font-size:12px;font-weight:600;color:${T.SLATE}">Cash project total</td>
      <td style="padding:7px 0;border-bottom:2px solid ${T.RULE};text-align:right;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;color:${T.SLATE}">${formatCents(cashOneTime)}</td>
    </tr>`)
  }
  if (hasCash) {
    rows.push(`<tr>
      <td style="padding:7px 0;border-bottom:1px solid ${T.BORDER};font-size:12px;color:${T.BODY}">Deposit (${depositPct}%)</td>
      <td style="padding:7px 0;border-bottom:1px solid ${T.BORDER};text-align:right;font-size:12px;font-variant-numeric:tabular-nums;color:${T.SLATE}">${formatCents(depositCents)}</td>
    </tr>`)
    rows.push(`<tr>
      <td style="padding:9px 0 0;font-size:13px;font-weight:700;color:${T.SLATE}">Balance on delivery</td>
      <td style="padding:9px 0 0;text-align:right;font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;color:${T.SLATE}">${formatCents(balanceCents)}</td>
    </tr>`)
  }

  return `
  <div style="
    width:100%;
    background:${T.WHITE};
    display:block;
    break-before:page;
    font-family:${FONT_STACK};
  ">
    ${interiorPageHeader('02 — Investment')}

    <div style="padding:28px 54px 24px">
      <!-- Section eyebrow + big number + ODiv -->
      ${eyebrow('Investment')}
      <div style="
        font-size:48px;
        font-weight:700;
        color:${T.TEAL_S};
        letter-spacing:-0.03em;
        line-height:1;
        margin-bottom:4px;
        font-variant-numeric:tabular-nums;
      ">${bigNumber}</div>
      ${oDiv()}

      ${tikCents > 0 ? `<p style="font-size:12px;color:${T.BODY};margin-bottom:2px">cash project total (after ${formatCents(tikCents)} trade-in-kind credit)</p>` : ''}
      ${hasRecurring ? `<p style="font-size:12px;color:${T.TEAL};margin-bottom:2px">+ recurring services as scheduled below</p>` : ''}

      <!-- Breakdown table -->
      <div style="max-width:460px;margin-top:20px;margin-bottom:20px">
        <table style="width:100%;border-collapse:collapse;font-family:${FONT_STACK}">
          <tbody>${rows.join('')}</tbody>
        </table>
      </div>

      ${hasRecurring ? `<p style="font-size:10px;color:${T.GRAY};margin-bottom:18px">Recurring charges begin per deliverable start trigger.</p>` : ''}

      ${sow.payment_terms ? infoCard('PAYMENT TERMS',  escNl(sow.payment_terms),  T.VLT, T.TEAL_S)        : ''}
      ${sow.guarantees    ? infoCard('GUARANTEES',      escNl(sow.guarantees),    T.VLT, T.TEAL)           : ''}
      ${sow.notes         ? infoCard('NOTES',           escNl(sow.notes),         T.VLO, T.ORANGE_S)       : ''}

      <!-- Signature block — lives on this page per spec -->
      <div style="width:100%;height:0.5pt;background:${T.RULE};margin:24px 0 20px"></div>

      ${eyebrow('Authorization &amp; Signatures')}

      <div style="display:flex;gap:36px;max-width:520px;margin-bottom:16px">
        <!-- Client -->
        <div style="flex:1">
          <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.GRAY};margin-bottom:6px;font-family:${FONT_STACK}">CLIENT</p>
          ${isAccepted
            ? `<p style="font-family:'Brush Script MT','Segoe Script',cursive;font-size:24px;color:${T.SLATE};border-bottom:1px solid ${T.RULE};padding-bottom:4px;min-height:40px;line-height:1.2">${esc(sow.accepted_signature ?? '')}</p>`
            : `<div style="border-bottom:1px solid ${T.RULE};height:40px;min-width:160px"></div>`}
          <p style="font-size:10px;color:${T.GRAY};margin-top:4px;font-family:${FONT_STACK}">
            ${isAccepted ? `Date: ${acceptedDate}` : 'Date'}
          </p>
        </div>
        <!-- DSIG -->
        <div style="flex:1">
          <p style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.GRAY};margin-bottom:6px;font-family:${FONT_STACK}">DEMAND SIGNALS</p>
          <div style="border-bottom:1px solid ${T.RULE};height:40px;min-width:160px"></div>
          <p style="font-size:10px;color:${T.GRAY};margin-top:4px;font-family:${FONT_STACK}">Date</p>
        </div>
      </div>
    </div>

    ${interiorPageFooter()}
  </div>`
}

// ── PAGE 4 — Back Cover ────────────────────────────────────────────────
// Dark bg + circles + shared top/bottom chrome + centered Godin quote + CTA.

function backCoverPage(prospect: SowProspect, issueDate: string): string {
  return `
  <div style="
    position:relative;
    width:100%;
    min-height:100vh;
    background:${T.SLATE};
    display:flex;
    flex-direction:column;
    break-before:page;
    overflow:hidden;
    -webkit-print-color-adjust:exact;
    print-color-adjust:exact;
    font-family:${FONT_STACK};
  ">
    ${decorativeCircles()}

    <!-- TOP ZONE: Logo row + pill badge (shared chrome, identical to front cover) -->
    ${darkCoverTopStrip()}

    <!-- CENTER ZONE: Godin quote + logo + CTA + contact grid -->
    <div style="
      position:relative;
      z-index:1;
      flex:1;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      padding:20px 72px;
      text-align:center;
    ">
      <!-- Quote mark -->
      <div style="
        font-size:72px;
        font-weight:700;
        color:${T.TEAL_S};
        line-height:0.7;
        margin-bottom:16px;
        opacity:0.6;
        font-family:Georgia,'Times New Roman',serif;
      ">&ldquo;</div>

      <!-- The quote itself: large, italic, serif-fallback, white -->
      <p style="
        font-size:26px;
        font-style:italic;
        font-weight:400;
        color:${T.WHITE};
        line-height:1.45;
        max-width:640px;
        margin:0 0 20px 0;
        font-family:Georgia,'Times New Roman',${FONT_STACK};
        letter-spacing:-0.01em;
      ">Marketing is no longer about the stuff that you make, but about the stories you tell.</p>

      <!-- Attribution -->
      <p style="
        font-size:13px;
        color:${T.TEAL_S};
        font-weight:600;
        letter-spacing:0.2em;
        word-spacing:0.7em;
        text-transform:uppercase;
        margin:0 0 28px 0;
      ">&mdash; Seth Godin</p>

      <!-- Divider -->
      <div style="width:40pt;height:1pt;background:rgba(255,255,255,0.15);margin:0 auto 28px;"></div>

      <!-- Logo -->
      <img src="${LOGO_URL}" alt="Demand Signals" style="height:36px;object-fit:contain;margin-bottom:20px;">

      <!-- Headline -->
      <h2 style="
        font-size:21px;
        font-weight:700;
        color:${T.WHITE};
        letter-spacing:-0.01em;
        line-height:1.2;
        margin:0 0 20px 0;
      ">Let&rsquo;s get to work &mdash; <span style="color:${T.TEAL_S};">together.</span></h2>

      <!-- CTA button -->
      <a style="
        display:inline-block;
        background:${T.ORANGE_S};
        color:${T.WHITE};
        font-size:11px;
        font-weight:700;
        letter-spacing:0.1em;
        text-transform:uppercase;
        padding:11px 28px;
        border-radius:17px;
        text-decoration:none;
        margin-bottom:24px;
      ">QUESTIONS? GET IN TOUCH &rarr;</a>

      <!-- Contact grid: 3 columns -->
      <div style="display:flex;justify-content:center;gap:0;margin:0 auto 16px;max-width:460px;width:100%">
        <div style="flex:1;padding:0 18px;border-right:1px solid rgba(255,255,255,0.12)">
          <p style="font-size:8px;font-weight:400;letter-spacing:0.1em;word-spacing:normal;text-transform:uppercase;color:${T.GRAY};margin-bottom:5px">EMAIL</p>
          <p style="font-size:10px;font-weight:700;color:${T.WHITE}">DemandSignals@gmail.com</p>
        </div>
        <div style="flex:1;padding:0 18px;border-right:1px solid rgba(255,255,255,0.12)">
          <p style="font-size:8px;font-weight:400;letter-spacing:0.1em;word-spacing:normal;text-transform:uppercase;color:${T.GRAY};margin-bottom:5px">PHONE</p>
          <p style="font-size:10px;font-weight:700;color:${T.WHITE}">(916) 542-2423</p>
        </div>
        <div style="flex:1;padding:0 18px">
          <p style="font-size:8px;font-weight:400;letter-spacing:0.1em;word-spacing:normal;text-transform:uppercase;color:${T.GRAY};margin-bottom:5px">WEB</p>
          <p style="font-size:10px;font-weight:700;color:${T.WHITE}">DemandSignals.co</p>
        </div>
      </div>

      <!-- Copyright -->
      <p style="font-size:9px;color:${T.MUTED}">&copy; 2026 Demand Signals. Confidential.</p>
    </div>

    <!-- BOTTOM ZONE: Meta band + footer strip (shared chrome, identical to front cover) -->
    <div style="position:relative;z-index:1;flex-shrink:0">
      ${darkCoverMetaBand(esc(prospect.business_name), 'Demand Signals', issueDate)}
      ${darkCoverFooterStrip()}
    </div>
  </div>`
}

// ── Main export ───────────────────────────────────────────────────────

/**
 * Render a 4-page SOW PDF and return the raw Buffer.
 * Pages: Cover / Scope+Phases / Investment+Signature / Back Cover
 */
export async function renderSowPdf(
  sow: SowDocument,
  prospect: SowProspect,
): Promise<Buffer> {
  const issueDate = sow.send_date
    ? new Date(sow.send_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const html = docShell(
    `SOW — ${sow.sow_number} — ${prospect.business_name}`,
    coverPage(sow, prospect)
    + scopePage(sow)
    + investmentPage(sow)
    + backCoverPage(prospect, issueDate),
  )

  return htmlToPdfBuffer(html, { format: 'Legal', printBackground: true })
}
