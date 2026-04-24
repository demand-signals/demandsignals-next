// ── pdf/sow.ts ────────────────────────────────────────────────────────
// Premium 3-page SOW PDF. Design brief: Stripe receipts + Linear type ramp
// + Apple Keynote covers. Clean, bold, confident. Full inline CSS.
// Pages: Cover / Scope+Phases / Investment+Signature (no standalone rear cover)

import { formatCents } from '@/lib/format'
import type { SowDocument, SowPhase, SowPhaseDeliverable } from '@/lib/invoice-types'
import { htmlToPdfBuffer } from './render'
import { T, LOGO_URL, esc, escNl, docShell, FONT_STACK } from './_shared'

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

const CADENCE_COLOR: Record<string, string> = {
  one_time: T.slateSoft,
  monthly: T.teal,
  quarterly: T.tealDark,
  annual: T.orange,
}

function cadencePill(cadence: string): string {
  const label = CADENCE_LABEL[cadence] ?? cadence
  const color = CADENCE_COLOR[cadence] ?? T.slateSoft
  return `<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;color:${color};border:1px solid ${color};white-space:nowrap;letter-spacing:0.02em">${esc(label)}</span>`
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
        oneTime: acc.oneTime + t.oneTime,
        monthly: acc.monthly + t.monthly,
        quarterly: acc.quarterly + t.quarterly,
        annual: acc.annual + t.annual,
      }
    },
    { oneTime: 0, monthly: 0, quarterly: 0, annual: 0 },
  )
}

// ── PAGE 1 — Cover ────────────────────────────────────────────────────

function coverPage(sow: SowDocument, prospect: SowProspect): string {
  const totals = accumulateAll(sow.phases)
  const tikCents = sow.trade_credit_cents ?? 0
  const cashTotal = totals.oneTime - tikCents
  const investmentDisplay = formatCents(tikCents > 0 ? cashTotal : totals.oneTime)

  const issueDate = sow.send_date
    ? new Date(sow.send_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return `
  <div style="
    position: relative;
    width: 100%;
    min-height: 100vh;
    background: ${T.dark};
    background-image: radial-gradient(circle at 110% -10%, rgba(104,197,173,0.35), transparent 50%);
    display: flex;
    flex-direction: column;
    page-break-after: always;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  ">
    <!-- Top bar: logo + badge -->
    <div style="
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 40px 56px 0;
    ">
      <img src="${LOGO_URL}" alt="Demand Signals" style="height:44px;object-fit:contain;">
      <span style="
        background: ${T.orangeDeep};
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        padding: 4px 14px;
        border-radius: 99px;
      ">PROPOSAL</span>
    </div>

    <!-- Main content block -->
    <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 0 56px;">
      <div style="max-width: 520px;">
        <p style="
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: ${T.teal};
          opacity: 0.85;
          margin-bottom: 20px;
        ">STATEMENT OF WORK</p>

        <h1 style="
          font-size: 44px;
          font-weight: 700;
          color: #fff;
          line-height: 1.05;
          letter-spacing: -0.02em;
          margin-bottom: 16px;
          word-wrap: break-word;
        ">${esc(sow.title)}</h1>

        <p style="
          font-size: 20px;
          font-weight: 400;
          color: ${T.teal};
          margin-bottom: 24px;
          letter-spacing: -0.01em;
        ">${esc(sow.sow_number)}</p>

        <div style="
          width: 60px;
          height: 2px;
          background: ${T.orangeDeep};
          margin-bottom: 20px;
        "></div>

        <p style="
          font-size: 14px;
          color: ${T.slateSoft};
          font-style: italic;
        ">Prepared by Demand Signals — Digital Growth &amp; Strategy</p>
      </div>
    </div>

    <!-- Bottom info band -->
    <div style="
      background: ${T.dark2};
      padding: 32px 56px;
      display: flex;
      gap: 0;
    ">
      <div style="flex:1; padding-right: 32px; border-right: 1px solid rgba(255,255,255,0.1)">
        <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${T.slateSoft};margin-bottom:8px">PREPARED FOR</p>
        <p style="font-size:18px;font-weight:700;color:#fff;line-height:1.2">${esc(prospect.business_name)}</p>
        ${prospect.contact_name || prospect.owner_name ? `<p style="font-size:13px;color:${T.slateSoft};margin-top:4px">${esc(prospect.contact_name ?? prospect.owner_name ?? '')}</p>` : ''}
      </div>
      <div style="flex:1; padding: 0 32px; border-right: 1px solid rgba(255,255,255,0.1)">
        <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${T.slateSoft};margin-bottom:8px">ISSUE DATE</p>
        <p style="font-size:18px;font-weight:700;color:#fff;line-height:1.2">${issueDate}</p>
      </div>
      <div style="flex:1; padding-left: 32px;">
        <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${T.slateSoft};margin-bottom:8px">INVESTMENT</p>
        <p style="font-size:22px;font-weight:700;color:#fff;line-height:1.2;letter-spacing:-0.02em">${investmentDisplay}</p>
        ${tikCents > 0 ? `<p style="font-size:11px;color:${T.teal};margin-top:2px">cash (after TIK credit)</p>` : ''}
      </div>
    </div>

    <!-- Footer strip -->
    <div style="padding:16px 56px;display:flex;justify-content:space-between;align-items:center;">
      <p style="font-size:11px;color:${T.slateSoft}">DemandSignals.co &nbsp;|&nbsp; (916) 542-2423</p>
      <p style="font-size:11px;color:${T.slateSoft};opacity:0.6">Confidential</p>
    </div>
  </div>`
}

// ── PAGE 2 — Scope & Deliverables ─────────────────────────────────────

function deliverableRow(d: SowPhaseDeliverable): string {
  const qty = d.quantity ?? 1
  const hrs = d.hours
  const unit = d.unit_price_cents ?? 0
  const line = d.line_total_cents ?? ((hrs ?? qty) * unit)
  const cadence = d.cadence ?? 'one_time'
  const suffix = CADENCE_SUFFIX[cadence] ?? ''
  const qtyCell = hrs != null ? `${hrs}&nbsp;hr` : `${qty}`
  const rateStr = `${formatCents(unit)}${suffix ? `<span style="font-size:11px;color:${T.slateSoft}">${suffix}</span>` : ''}`
  const totalStr = line > 0 ? `${formatCents(line)}${suffix ? `<span style="font-size:11px;color:${T.slateSoft}">${suffix}</span>` : ''}` : '—'

  return `<tr>
    <td style="padding:10px 12px;border-bottom:1px solid ${T.rule};vertical-align:top;max-width:240px">
      <div style="font-weight:600;font-size:13px;color:${T.dark}">${esc(d.name)}</div>
      ${d.description ? `<div style="font-size:12px;color:${T.slate};margin-top:2px;line-height:1.5">${esc(d.description)}</div>` : ''}
    </td>
    <td style="padding:10px 12px;border-bottom:1px solid ${T.rule};text-align:center;vertical-align:top;white-space:nowrap">${cadencePill(cadence)}</td>
    <td style="padding:10px 12px;border-bottom:1px solid ${T.rule};text-align:right;vertical-align:top;font-variant-numeric:tabular-nums;font-size:13px;white-space:nowrap">${qtyCell}</td>
    <td style="padding:10px 12px;border-bottom:1px solid ${T.rule};text-align:right;vertical-align:top;font-variant-numeric:tabular-nums;font-size:13px;white-space:nowrap">${rateStr}</td>
    <td style="padding:10px 12px;border-bottom:1px solid ${T.rule};text-align:right;vertical-align:top;font-variant-numeric:tabular-nums;font-size:13px;font-weight:600;white-space:nowrap">${totalStr}</td>
  </tr>`
}

function phaseBlock(phase: SowPhase, idx: number): string {
  const num = String(idx + 1).padStart(2, '0')
  const t = accumulatePhase(phase)
  const parts: string[] = []
  if (t.oneTime > 0) parts.push(`${formatCents(t.oneTime)} one-time`)
  if (t.monthly > 0) parts.push(`${formatCents(t.monthly)}/mo`)
  if (t.quarterly > 0) parts.push(`${formatCents(t.quarterly)}/qtr`)
  if (t.annual > 0) parts.push(`${formatCents(t.annual)}/yr`)
  const subtotalStr = parts.join(' · ')

  return `
  <div style="margin-bottom:32px">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
      <span style="
        display:inline-flex;align-items:center;justify-content:center;
        width:28px;height:28px;border-radius:50%;
        background:${T.teal};color:#fff;
        font-size:11px;font-weight:700;letter-spacing:0.05em;
        flex-shrink:0
      ">${num}</span>
      <h3 style="font-size:16px;font-weight:700;color:${T.dark};letter-spacing:-0.01em">${esc(phase.name)}</h3>
    </div>
    ${phase.description ? `<p style="font-size:13px;color:${T.slate};font-style:italic;margin-bottom:12px;margin-left:40px">${esc(phase.description)}</p>` : ''}

    ${phase.deliverables.length > 0 ? `
    <table style="width:100%;border-collapse:collapse;font-family:${FONT_STACK}">
      <thead>
        <tr style="background:${T.light}">
          <th style="text-align:left;padding:8px 12px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${T.slateSoft}">Item</th>
          <th style="text-align:center;padding:8px 12px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${T.slateSoft};width:90px">Cadence</th>
          <th style="text-align:right;padding:8px 12px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${T.slateSoft};width:60px">Qty</th>
          <th style="text-align:right;padding:8px 12px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${T.slateSoft};width:80px">Rate</th>
          <th style="text-align:right;padding:8px 12px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${T.slateSoft};width:90px">Total</th>
        </tr>
      </thead>
      <tbody>
        ${phase.deliverables.map(deliverableRow).join('')}
      </tbody>
    </table>
    ${subtotalStr ? `<div style="text-align:right;font-size:12px;color:${T.slate};margin-top:8px;padding-right:12px">Phase subtotal: <strong style="color:${T.dark}">${subtotalStr}</strong></div>` : ''}
    ` : `<p style="font-size:13px;color:${T.slateSoft};font-style:italic;margin-left:40px">No deliverables defined for this phase.</p>`}
  </div>`
}

function scopePage(sow: SowDocument): string {
  const usePhases = Array.isArray(sow.phases) && sow.phases.length > 0
  const phasesHtml = usePhases
    ? sow.phases.map((p, i) => phaseBlock(p, i)).join('')
    : legacyDeliverablesFallback(sow)

  return `
  <div style="
    width:100%;
    min-height:100vh;
    background:${T.bgWarm};
    display:flex;
    flex-direction:column;
    page-break-after:always;
  ">
    <!-- Gradient accent bar -->
    <div style="height:6px;background:linear-gradient(90deg,${T.orangeDeep},${T.teal});width:100%;flex-shrink:0"></div>

    <div style="padding:48px 56px;flex:1">
      <!-- Section eyebrow -->
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${T.slateSoft};margin-bottom:10px">SCOPE</p>
      <h2 style="font-size:28px;font-weight:700;color:${T.dark};letter-spacing:-0.02em;margin-bottom:12px;line-height:1.15;word-wrap:break-word">${esc(sow.title)}</h2>
      <div style="width:40px;height:3px;background:${T.orangeDeep};margin-bottom:20px"></div>

      ${sow.scope_summary ? `<p style="font-size:14px;color:${T.slate};line-height:1.7;margin-bottom:32px;max-width:560px">${escNl(sow.scope_summary)}</p>` : ''}

      <!-- Phases eyebrow -->
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${T.slateSoft};margin-bottom:20px">PHASES &amp; DELIVERABLES</p>

      ${phasesHtml}
    </div>

    <!-- Page footer -->
    <div style="border-top:1px solid ${T.rule};padding:12px 56px;display:flex;justify-content:space-between;align-items:center">
      <p style="font-size:11px;color:${T.slateSoft}">${esc(sow.sow_number)}</p>
      <p style="font-size:11px;color:${T.slateSoft}">Confidential — Demand Signals</p>
    </div>
  </div>`
}

function legacyDeliverablesFallback(sow: SowDocument): string {
  if (!sow.deliverables?.length) return '<p style="color:#94a0b8;font-style:italic">No deliverables.</p>'
  const rows = sow.deliverables.map((d) => {
    const qty = d.quantity ?? 1
    const hrs = d.hours
    const unit = d.unit_price_cents ?? 0
    const line = d.line_total_cents ?? ((hrs ?? qty) * unit)
    const qtyCell = hrs != null ? `${hrs}&nbsp;hr` : `${qty}`
    return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid ${T.rule};vertical-align:top">
        <div style="font-weight:600;font-size:13px">${esc(d.name)}</div>
        <div style="font-size:12px;color:${T.slate};margin-top:2px">${esc(d.description)}</div>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid ${T.rule};text-align:right;font-size:13px;font-variant-numeric:tabular-nums">${qtyCell}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${T.rule};text-align:right;font-size:13px;font-variant-numeric:tabular-nums">${formatCents(unit)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${T.rule};text-align:right;font-size:13px;font-weight:600;font-variant-numeric:tabular-nums">${formatCents(line)}</td>
    </tr>`
  }).join('')

  return `
  <table style="width:100%;border-collapse:collapse;font-family:${FONT_STACK}">
    <thead>
      <tr style="background:${T.light}">
        <th style="text-align:left;padding:8px 12px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${T.slateSoft}">Item</th>
        <th style="text-align:right;padding:8px 12px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${T.slateSoft};width:70px">Qty/Hrs</th>
        <th style="text-align:right;padding:8px 12px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${T.slateSoft};width:80px">Rate</th>
        <th style="text-align:right;padding:8px 12px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${T.slateSoft};width:90px">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`
}

// ── PAGE 3 — Investment, Signature & Close ────────────────────────────

function infoCard(title: string, body: string, bg = T.tealSoft, borderColor = T.teal): string {
  return `
  <div style="
    background:${bg};
    border-radius:10px;
    border-left:3px solid ${borderColor};
    padding:20px 24px;
    margin-bottom:16px;
  ">
    <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${borderColor};margin-bottom:10px">${title}</p>
    <div style="font-size:13px;color:${T.dark};line-height:1.7">${body}</div>
  </div>`
}

function investmentPage(sow: SowDocument): string {
  const totals = accumulateAll(sow.phases)
  const tikCents = sow.trade_credit_cents ?? 0
  const cashOneTime = totals.oneTime - tikCents
  const depositPct = sow.pricing.deposit_pct ?? 50
  const depositCents = tikCents > 0
    ? Math.round((cashOneTime * depositPct) / 100)
    : (sow.pricing.deposit_cents ?? Math.round((totals.oneTime * depositPct) / 100))
  const balanceCents = (tikCents > 0 ? cashOneTime : totals.oneTime) - depositCents
  const hasCash = totals.oneTime > 0

  const bigNumber = tikCents > 0 ? formatCents(cashOneTime) : formatCents(totals.oneTime)

  const isAccepted = !!sow.accepted_at && !!sow.accepted_signature
  const acceptedDate = isAccepted
    ? new Date(sow.accepted_at!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : ''

  const rows: string[] = []

  if (totals.oneTime > 0) {
    rows.push(`<tr>
      <td style="padding:8px 0;border-bottom:1px solid ${T.rule};font-size:13px;color:${T.slate}">One-time project total</td>
      <td style="padding:8px 0;border-bottom:1px solid ${T.rule};text-align:right;font-size:13px;font-variant-numeric:tabular-nums;color:${T.dark}">${formatCents(totals.oneTime)}</td>
    </tr>`)
  }
  if (totals.monthly > 0) {
    rows.push(`<tr>
      <td style="padding:8px 0;border-bottom:1px solid ${T.rule};font-size:13px;color:${T.slate}">Monthly recurring</td>
      <td style="padding:8px 0;border-bottom:1px solid ${T.rule};text-align:right;font-size:13px;font-variant-numeric:tabular-nums;color:${T.teal}">${formatCents(totals.monthly)}<span style="font-size:11px;color:${T.slateSoft}">/mo</span></td>
    </tr>`)
  }
  if (totals.quarterly > 0) {
    rows.push(`<tr>
      <td style="padding:8px 0;border-bottom:1px solid ${T.rule};font-size:13px;color:${T.slate}">Quarterly recurring</td>
      <td style="padding:8px 0;border-bottom:1px solid ${T.rule};text-align:right;font-size:13px;font-variant-numeric:tabular-nums;color:${T.teal}">${formatCents(totals.quarterly)}<span style="font-size:11px;color:${T.slateSoft}">/qtr</span></td>
    </tr>`)
  }
  if (totals.annual > 0) {
    rows.push(`<tr>
      <td style="padding:8px 0;border-bottom:1px solid ${T.rule};font-size:13px;color:${T.slate}">Annual recurring</td>
      <td style="padding:8px 0;border-bottom:1px solid ${T.rule};text-align:right;font-size:13px;font-variant-numeric:tabular-nums;color:${T.teal}">${formatCents(totals.annual)}<span style="font-size:11px;color:${T.slateSoft}">/yr</span></td>
    </tr>`)
  }
  if (tikCents > 0) {
    rows.push(`<tr>
      <td style="padding:8px 0;border-bottom:1px solid ${T.rule};font-size:13px;color:${T.slate}">
        Trade-in-Kind credit
        ${sow.trade_credit_description ? `<div style="font-size:11px;color:${T.slateSoft};margin-top:2px">${esc(sow.trade_credit_description)}</div>` : ''}
      </td>
      <td style="padding:8px 0;border-bottom:1px solid ${T.rule};text-align:right;font-size:13px;font-variant-numeric:tabular-nums;color:${T.orange}">−${formatCents(tikCents)}</td>
    </tr>`)

    rows.push(`<tr>
      <td style="padding:8px 0;border-bottom:2px solid ${T.rule};font-size:13px;font-weight:600;color:${T.dark}">Cash project total</td>
      <td style="padding:8px 0;border-bottom:2px solid ${T.rule};text-align:right;font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;color:${T.dark}">${formatCents(cashOneTime)}</td>
    </tr>`)
  }

  if (hasCash) {
    rows.push(`<tr>
      <td style="padding:8px 0;border-bottom:1px solid ${T.rule};font-size:13px;color:${T.slate}">Deposit (${depositPct}%)</td>
      <td style="padding:8px 0;border-bottom:1px solid ${T.rule};text-align:right;font-size:13px;font-variant-numeric:tabular-nums;color:${T.dark}">${formatCents(depositCents)}</td>
    </tr>`)
    rows.push(`<tr>
      <td style="padding:10px 0 0;font-size:14px;font-weight:700;color:${T.dark}">Balance on delivery</td>
      <td style="padding:10px 0 0;text-align:right;font-size:14px;font-weight:700;font-variant-numeric:tabular-nums;color:${T.dark}">${formatCents(balanceCents)}</td>
    </tr>`)
  }

  const hasRecurring = totals.monthly > 0 || totals.quarterly > 0 || totals.annual > 0

  return `
  <div style="
    width:100%;
    min-height:100vh;
    background:${T.bgWarm};
    display:flex;
    flex-direction:column;
  ">
    <div style="height:6px;background:linear-gradient(90deg,${T.orangeDeep},${T.teal});width:100%;flex-shrink:0"></div>

    <div style="padding:40px 56px 32px;flex:1">
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${T.slateSoft};margin-bottom:8px">INVESTMENT</p>
      <div style="font-size:52px;font-weight:700;color:${T.dark};letter-spacing:-0.03em;line-height:1;margin-bottom:4px">${bigNumber}</div>
      ${tikCents > 0 ? `<p style="font-size:13px;color:${T.slate};margin-bottom:2px">cash project total (after ${formatCents(tikCents)} trade-in-kind credit)</p>` : ''}
      ${hasRecurring ? `<p style="font-size:13px;color:${T.teal};margin-bottom:2px">+ recurring services as scheduled below</p>` : ''}

      <!-- Breakdown table (Stripe receipt style) -->
      <div style="max-width:480px;margin-top:24px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse;font-family:${FONT_STACK}">
          <tbody>${rows.join('')}</tbody>
        </table>
      </div>

      ${hasRecurring ? `<p style="font-size:11px;color:${T.slateSoft};margin-bottom:20px">Recurring charges begin per deliverable start trigger.</p>` : ''}

      ${sow.payment_terms ? infoCard('PAYMENT TERMS', escNl(sow.payment_terms)) : ''}
      ${sow.guarantees ? infoCard('GUARANTEES', escNl(sow.guarantees), 'rgba(104,197,173,0.05)', T.tealDark) : ''}
      ${sow.notes ? infoCard('NOTES', escNl(sow.notes), 'rgba(242,133,0,0.06)', T.orange) : ''}

      <!-- Divider before signature -->
      <div style="width:100%;height:1px;background:${T.rule};margin:28px 0 24px"></div>

      <!-- Signature block -->
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${T.slateSoft};margin-bottom:16px">AUTHORIZATION &amp; SIGNATURES</p>
      <div style="display:flex;gap:40px;max-width:560px;margin-bottom:20px">
        <!-- Client signature -->
        <div style="flex:1">
          <p style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.slateSoft};margin-bottom:6px">CLIENT</p>
          ${isAccepted
            ? `<p style="font-family:'Brush Script MT','Segoe Script',cursive;font-size:26px;color:${T.dark};border-bottom:1px solid ${T.slate};padding-bottom:4px;min-height:44px;line-height:1.2">${esc(sow.accepted_signature ?? '')}</p>`
            : `<div style="border-bottom:1px solid ${T.slate};height:44px;min-width:180px"></div>`}
          <p style="font-size:11px;color:${T.slateSoft};margin-top:5px">
            ${isAccepted ? `Date: ${acceptedDate}` : 'Date'}
          </p>
        </div>

        <!-- DSIG signature -->
        <div style="flex:1">
          <p style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.slateSoft};margin-bottom:6px">DEMAND SIGNALS</p>
          <div style="border-bottom:1px solid ${T.slate};height:44px;min-width:180px"></div>
          <p style="font-size:11px;color:${T.slateSoft};margin-top:5px">Date</p>
        </div>
      </div>

      <!-- Van Gogh quote -->
      <p style="font-style:italic;font-size:12px;color:${T.slateSoft};line-height:1.5;margin-top:4px">&ldquo;Great things are done by a series of small things brought together.&rdquo; &mdash; Vincent Van Gogh</p>
    </div>

    <!-- Footer with contact info -->
    <div style="border-top:1px solid ${T.rule};padding:12px 56px;display:flex;justify-content:space-between;align-items:center">
      <p style="font-size:11px;color:${T.slateSoft}">${esc(sow.sow_number)} &nbsp;|&nbsp; DemandSignals@gmail.com &nbsp;|&nbsp; (916) 542-2423 &nbsp;|&nbsp; demandsignals.co</p>
      <p style="font-size:11px;color:${T.slateSoft};opacity:0.6">&copy; 2026 Demand Signals. Confidential.</p>
    </div>
  </div>`
}

// ── Main export ───────────────────────────────────────────────────────

/**
 * Render a 3-page SOW PDF and return the raw Buffer.
 * Pages: Cover / Scope+Phases / Investment+Signature
 */
export async function renderSowPdf(
  sow: SowDocument,
  prospect: SowProspect,
): Promise<Buffer> {
  const html = docShell(
    `SOW — ${sow.sow_number} — ${prospect.business_name}`,
    coverPage(sow, prospect)
    + scopePage(sow)
    + investmentPage(sow),
  )

  return htmlToPdfBuffer(html, { format: 'Legal', printBackground: true })
}
