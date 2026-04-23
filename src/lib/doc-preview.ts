// ── doc-preview.ts ─────────────────────────────────────────────────
// Pure HTML renderer for SOW and Invoice documents.
// Returns a self-contained HTML string (with inline styles) suitable
// for embedding in an iframe via srcDoc, or serving directly as text/html.
// No PDF — that goes through the Python dsig_pdf service.

import { formatCents } from './format'
import type { SowDocument, InvoiceWithLineItems } from './invoice-types'

export interface ClientInfo {
  business_name: string
  owner_name?: string | null
  owner_email?: string | null
  business_email?: string | null
  owner_phone?: string | null
  business_phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]!))
}

function clientBlockHtml(c: ClientInfo): string {
  const cityLine = [c.city, c.state, c.zip].filter(Boolean).join(', ')
  return `
    <div class="client">
      <div class="label">Bill to</div>
      <div class="name">${escapeHtml(c.business_name)}</div>
      ${c.owner_name ? `<div>${escapeHtml(c.owner_name)}</div>` : ''}
      ${c.address ? `<div>${escapeHtml(c.address)}</div>` : ''}
      ${cityLine ? `<div>${escapeHtml(cityLine)}</div>` : ''}
      ${c.owner_email || c.business_email ? `<div>${escapeHtml(c.owner_email ?? c.business_email ?? '')}</div>` : ''}
      ${c.owner_phone || c.business_phone ? `<div>${escapeHtml(c.owner_phone ?? c.business_phone ?? '')}</div>` : ''}
    </div>
  `
}

const SHARED_STYLES = `
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1d2330; padding: 40px; max-width: 800px; margin: 0 auto; }
    header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #68c5ad; padding-bottom: 20px; margin-bottom: 30px; }
    header img { height: 50px; }
    h1 { color: #1d2330; font-size: 28px; margin: 0; }
    .meta { color: #5d6780; font-size: 13px; }
    .client { background: #f4f6f9; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
    .client .label { font-size: 11px; text-transform: uppercase; color: #5d6780; margin-bottom: 6px; }
    .client .name { font-weight: 600; font-size: 15px; }
    section { margin-bottom: 24px; }
    section h2 { font-size: 14px; text-transform: uppercase; color: #5d6780; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { text-align: left; padding: 8px; background: #f4f6f9; font-weight: 600; font-size: 12px; text-transform: uppercase; color: #5d6780; }
    td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .totals { margin-top: 16px; width: 50%; margin-left: auto; font-size: 14px; }
    .totals td { border: none; padding: 4px 8px; }
    .totals .grand { border-top: 2px solid #1d2330; font-weight: 700; font-size: 16px; padding-top: 10px; }
    footer { margin-top: 40px; font-size: 12px; color: #5d6780; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    .signature { margin-top: 40px; padding-top: 40px; border-top: 1px dashed #5d6780; }
    .signature-line { display: inline-block; min-width: 240px; border-bottom: 1px solid #1d2330; height: 30px; }
  </style>
`

const CADENCE_SUFFIX: Record<string, string> = {
  one_time: '',
  monthly: '/mo',
  quarterly: '/qtr',
  annual: '/yr',
}

const CADENCE_LABEL: Record<string, string> = {
  one_time: 'One-time',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
}

function renderPhasesSection(sow: SowDocument): string {
  const phases = sow.phases
  let oneTimeCents = 0
  let monthlyCents = 0
  let quarterlyCents = 0
  let annualCents = 0

  const phasesHtml = phases.map((phase, phaseIdx) => {
    const rows = phase.deliverables.map((d) => {
      const qty = d.quantity ?? 1
      const hrs = d.hours
      const unit = d.unit_price_cents ?? 0
      const line = d.line_total_cents ?? ((hrs != null ? hrs : qty) * unit)
      const cadence = d.cadence ?? 'one_time'
      const suffix = CADENCE_SUFFIX[cadence] ?? ''
      const cadenceLabel = CADENCE_LABEL[cadence] ?? cadence
      const qtyCell = hrs != null ? `${hrs} hr` : `${qty}`
      // Accumulate totals
      if (cadence === 'one_time') oneTimeCents += line
      else if (cadence === 'monthly') monthlyCents += line
      else if (cadence === 'quarterly') quarterlyCents += line
      else if (cadence === 'annual') annualCents += line
      return `
        <tr>
          <td>
            <strong>${escapeHtml(d.name)}</strong>
            <br><span style="color:#5d6780;font-size:12px">${escapeHtml(d.description)}</span>
          </td>
          <td class="num" style="color:#5d6780;font-size:12px">${escapeHtml(cadenceLabel)}</td>
          <td class="num">${qtyCell}</td>
          <td class="num">${formatCents(unit)}${suffix ? `<span style="color:#5d6780;font-size:11px">${suffix}</span>` : ''}</td>
          <td class="num">${line > 0 ? `${formatCents(line)}${suffix ? `<span style="color:#5d6780;font-size:11px">${suffix}</span>` : ''}` : '—'}</td>
        </tr>
      `
    }).join('')

    return `
      <div style="margin-bottom:20px">
        <div style="font-size:11px;text-transform:uppercase;color:#68c5ad;font-weight:700;letter-spacing:0.05em;margin-bottom:4px">
          Phase ${phaseIdx + 1}
        </div>
        <h3 style="font-size:15px;font-weight:600;color:#1d2330;margin:0 0 4px 0">${escapeHtml(phase.name)}</h3>
        ${phase.description ? `<p style="font-size:13px;color:#5d6780;margin:0 0 8px 0">${escapeHtml(phase.description)}</p>` : ''}
        ${phase.deliverables.length > 0 ? `
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr>
                <th style="text-align:left;padding:6px 8px;background:#f4f6f9;font-weight:600;font-size:11px;text-transform:uppercase;color:#5d6780">Item</th>
                <th style="text-align:right;padding:6px 8px;background:#f4f6f9;font-weight:600;font-size:11px;text-transform:uppercase;color:#5d6780;width:70px">Cadence</th>
                <th style="text-align:right;padding:6px 8px;background:#f4f6f9;font-weight:600;font-size:11px;text-transform:uppercase;color:#5d6780;width:60px">Qty/Hrs</th>
                <th style="text-align:right;padding:6px 8px;background:#f4f6f9;font-weight:600;font-size:11px;text-transform:uppercase;color:#5d6780;width:80px">Rate</th>
                <th style="text-align:right;padding:6px 8px;background:#f4f6f9;font-weight:600;font-size:11px;text-transform:uppercase;color:#5d6780;width:90px">Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        ` : '<p style="font-size:13px;color:#5d6780;font-style:italic">No deliverables</p>'}
      </div>
    `
  }).join('')

  // Pricing section split by cadence
  const depositPct = sow.pricing.deposit_pct
  const depositCents = sow.pricing.deposit_cents
  const balanceCents = oneTimeCents - depositCents

  const pricingRows = [
    oneTimeCents > 0
      ? `<tr><td>One-time project total</td><td class="num">${formatCents(oneTimeCents)}</td></tr>`
      : '',
    monthlyCents > 0
      ? `<tr><td>Monthly recurring</td><td class="num" style="color:#4fa894">${formatCents(monthlyCents)}<span style="font-size:11px;color:#5d6780">/mo</span></td></tr>`
      : '',
    quarterlyCents > 0
      ? `<tr><td>Quarterly recurring</td><td class="num" style="color:#4fa894">${formatCents(quarterlyCents)}<span style="font-size:11px;color:#5d6780">/qtr</span></td></tr>`
      : '',
    annualCents > 0
      ? `<tr><td>Annual recurring</td><td class="num" style="color:#4fa894">${formatCents(annualCents)}<span style="font-size:11px;color:#5d6780">/yr</span></td></tr>`
      : '',
    oneTimeCents > 0
      ? `<tr><td>Deposit (${depositPct}%)</td><td class="num">${formatCents(depositCents)}</td></tr>`
      : '',
    oneTimeCents > 0
      ? `<tr class="grand"><td>Balance on delivery</td><td class="num">${formatCents(balanceCents)}</td></tr>`
      : '',
  ].filter(Boolean).join('')

  const hasRecurring = monthlyCents > 0 || quarterlyCents > 0 || annualCents > 0

  return `
    <section>
      <h2>Phases</h2>
      ${phasesHtml}
    </section>
    <section>
      <h2>Pricing</h2>
      <table class="totals">
        <tbody>${pricingRows}</tbody>
      </table>
      ${hasRecurring ? '<p style="font-size:11px;color:#5d6780;margin-top:8px">Recurring charges begin per deliverable start trigger.</p>' : ''}
    </section>
  `
}

function renderLegacyDeliverables(sow: SowDocument): string {
  const rows = sow.deliverables.map((d) => {
    const qty = d.quantity ?? 1
    const hrs = d.hours
    const unit = d.unit_price_cents ?? 0
    const line = d.line_total_cents ?? ((hrs ?? qty) * unit)
    const qtyCell = hrs != null ? `${hrs} hr` : `${qty}`
    return `
      <tr>
        <td><strong>${escapeHtml(d.name)}</strong><br><span style="color:#5d6780;font-size:12px">${escapeHtml(d.description)}</span></td>
        <td class="num">${qtyCell}</td>
        <td class="num">${formatCents(unit)}</td>
        <td class="num">${formatCents(line)}</td>
      </tr>
    `
  }).join('')

  return `
    <section>
      <h2>Deliverables</h2>
      <table>
        <thead><tr><th>Item</th><th class="num">Qty/Hours</th><th class="num">Rate</th><th class="num">Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>

    ${sow.timeline.length > 0 ? `
    <section>
      <h2>Timeline</h2>
      <ul>${sow.timeline.map((p) => `<li><strong>${escapeHtml(p.name)}</strong> (${p.duration_weeks}w) — ${escapeHtml(p.description)}</li>`).join('')}</ul>
    </section>` : ''}

    <section>
      <h2>Pricing</h2>
      <table class="totals">
        <tr><td>Total</td><td class="num">${formatCents(sow.pricing.total_cents)}</td></tr>
        <tr><td>Deposit (${sow.pricing.deposit_pct}%)</td><td class="num">${formatCents(sow.pricing.deposit_cents)}</td></tr>
        <tr class="grand"><td>Balance on delivery</td><td class="num">${formatCents(sow.pricing.total_cents - sow.pricing.deposit_cents)}</td></tr>
      </table>
    </section>
  `
}

export function renderSowHtml(sow: SowDocument, client: ClientInfo): string {
  // Prefer phases when present (new model), fall back to legacy flat arrays.
  const usePhasesModel = Array.isArray(sow.phases) && sow.phases.length > 0
  const bodyContent = usePhasesModel
    ? renderPhasesSection(sow)
    : renderLegacyDeliverables(sow)

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(sow.title)}</title>${SHARED_STYLES}</head>
<body>
<header>
  <div>
    <img src="https://demandsignals.us/assets/logos/dsig_logo_v2b.png" alt="Demand Signals">
    <div class="meta">Demand Signals · demandsignals.co</div>
  </div>
  <div style="text-align:right">
    <h1>Statement of Work</h1>
    <div class="meta">${escapeHtml(sow.sow_number)}</div>
    ${sow.send_date ? `<div class="meta">Issued ${escapeHtml(sow.send_date)}</div>` : ''}
  </div>
</header>

${clientBlockHtml(client)}

<section>
  <h2>${escapeHtml(sow.title)}</h2>
  ${sow.scope_summary ? `<p>${escapeHtml(sow.scope_summary)}</p>` : ''}
</section>

${bodyContent}

${sow.payment_terms ? `<section><h2>Payment Terms</h2><p>${escapeHtml(sow.payment_terms)}</p></section>` : ''}
${sow.guarantees ? `<section><h2>Guarantees</h2><p>${escapeHtml(sow.guarantees)}</p></section>` : ''}
${sow.notes ? `<section><h2>Notes</h2><p>${escapeHtml(sow.notes)}</p></section>` : ''}

<div class="signature">
  <div style="display:flex;gap:40px">
    <div><div style="margin-bottom:4px;font-size:12px;color:#5d6780">Client signature</div><div class="signature-line"></div><div style="font-size:11px;color:#5d6780;margin-top:4px">Date</div></div>
    <div><div style="margin-bottom:4px;font-size:12px;color:#5d6780">DSIG signature</div><div class="signature-line"></div><div style="font-size:11px;color:#5d6780;margin-top:4px">Date</div></div>
  </div>
</div>

<footer>Demand Signals · DemandSignals@gmail.com · (916) 542-2423 · demandsignals.co</footer>
</body></html>`
}

export function renderInvoiceHtml(inv: InvoiceWithLineItems, client: ClientInfo): string {
  const rows = inv.line_items.sort((a, b) => a.sort_order - b.sort_order).map((li) => `
    <tr>
      <td>${escapeHtml(li.description)}${li.discount_label ? `<br><span style="color:#5d6780;font-size:12px">${escapeHtml(li.discount_label)}</span>` : ''}</td>
      <td class="num">${li.quantity}</td>
      <td class="num">${formatCents(li.unit_price_cents)}</td>
      ${li.discount_cents > 0 ? `<td class="num" style="color:#f28500">-${formatCents(li.discount_cents)}</td>` : '<td class="num">—</td>'}
      <td class="num">${formatCents(li.line_total_cents)}</td>
    </tr>
  `).join('')

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Invoice ${escapeHtml(inv.invoice_number)}</title>${SHARED_STYLES}</head>
<body>
<header>
  <div>
    <img src="https://demandsignals.us/assets/logos/dsig_logo_v2b.png" alt="Demand Signals">
    <div class="meta">Demand Signals · demandsignals.co</div>
  </div>
  <div style="text-align:right">
    <h1>Invoice</h1>
    <div class="meta">${escapeHtml(inv.invoice_number)}</div>
    ${inv.send_date ? `<div class="meta">Issued ${escapeHtml(inv.send_date)}</div>` : ''}
    ${inv.due_date ? `<div class="meta">Due ${escapeHtml(inv.due_date)}</div>` : ''}
  </div>
</header>

${clientBlockHtml(client)}

<section>
  <table>
    <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Discount</th><th class="num">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</section>

<table class="totals">
  <tr><td>Subtotal</td><td class="num">${formatCents(inv.subtotal_cents)}</td></tr>
  ${inv.discount_cents > 0 ? `<tr><td>Discount</td><td class="num">-${formatCents(inv.discount_cents)}</td></tr>` : ''}
  ${inv.late_fee_cents > 0 && inv.late_fee_applied_at ? `<tr><td>Late fee</td><td class="num">${formatCents(inv.late_fee_cents)}</td></tr>` : ''}
  <tr class="grand"><td>Total due</td><td class="num">${formatCents(inv.total_due_cents + ((inv.late_fee_applied_at ? inv.late_fee_cents : 0)))}</td></tr>
</table>

${inv.late_fee_cents > 0 && !inv.late_fee_applied_at ? `<p style="font-size:12px;color:#5d6780">Late fee of ${formatCents(inv.late_fee_cents)} applies if unpaid after ${inv.late_fee_grace_days} days past due.</p>` : ''}

${inv.notes ? `<section><h2>Notes</h2><p>${escapeHtml(inv.notes)}</p></section>` : ''}

<footer>Demand Signals · DemandSignals@gmail.com · (916) 542-2423 · demandsignals.co</footer>
</body></html>`
}
