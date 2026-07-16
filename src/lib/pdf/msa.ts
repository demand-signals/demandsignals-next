// ── pdf/msa.ts ────────────────────────────────────────────────────────
// Master Service Agreement PDF per DSIG PDF Generation Standard v2.
// Pages: Cover / Agreement Terms / Incorporated Disclosures (linked codes +
//        e-initial fields) / Execution + Signatures.
// Rides the same Chromium pipeline + _shared chrome as sow.ts / invoice.ts.
// Rendered per-client (client name/code/entity/date/disclosures injected),
// then uploaded to the PRIVATE R2 bucket (contains signatures/PII).
//
// Page-break rule (locked, per SOW-DOCK-042826A): dark cover pages use
// min-height:100vh; white interior pages must NOT (no min-height:100vh +
// flex:1 + page-break-after — causes orphan footer pages).

import { htmlToPdfBuffer } from './render'
import {
  T, FONT_STACK,
  esc, docShell,
  decorativeCircles, eyebrow,
  interiorPageHeader, interiorPageFooter,
  darkCoverTopStrip, darkCoverMetaBand, darkCoverFooterStrip,
} from './_shared'

// ── Types ─────────────────────────────────────────────────────────────

export interface MsaIncorporatedDisclosure {
  code: string        // e.g. DSIG.STSD.Q3Y26.v1a
  title: string       // e.g. Standard Terms of Service Disclosure
  public_url: string  // stable public R2 URL the code links to
}

export interface MsaDocument {
  msa_number: string
  public_uuid: string
  status: string
  title: string
  client_legal_name: string | null
  client_code: string | null
  client_entity_type: string | null   // "a Michigan limited liability company"
  effective_date: string | null       // ISO date
  incorporated_disclosures: MsaIncorporatedDisclosure[]
  dsig_signatory_name: string
  dsig_signatory_title: string
  dsig_signatory_email: string
  dsig_signatory_cell: string
  executed_at: string | null
  executed_signature: string | null
  disclosure_initials: Array<{ code: string; initials: string }>
  sent_at?: string | null
  created_at?: string | null
}

export interface MsaProspect {
  business_name: string
  owner_name?: string | null
  owner_email?: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '________________'
  // ISO (yyyy-mm-dd) → "Month D, YYYY" without timezone drift
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const months = ['January','February','March','April','May','June','July',
    'August','September','October','November','December']
  if (!y || !m || !d) return esc(iso)
  return `${months[m - 1]} ${d}, ${y}`
}

/** Look up the client's initials for a disclosure code (blank line if unexecuted). */
function initialFor(msa: MsaDocument, code: string): string {
  const hit = msa.disclosure_initials?.find((i) => i.code === code)
  return hit?.initials ?? ''
}

// ── Page 1: Cover ─────────────────────────────────────────────────────

function coverPage(msa: MsaDocument, prospect: MsaProspect): string {
  const issueDate = fmtDate(msa.sent_at?.slice(0, 10) ?? msa.created_at?.slice(0, 10) ?? null)
  const clientLine = msa.client_code
    ? `${msa.client_legal_name ?? prospect.business_name} — ${msa.client_code}`
    : (msa.client_legal_name ?? prospect.business_name)
  return `
  <div style="position:relative;width:100%;min-height:100vh;background:${T.SLATE};display:flex;flex-direction:column;overflow:hidden;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-family:${FONT_STACK};">
    ${decorativeCircles()}
    ${darkCoverTopStrip()}
    <div style="flex:1;min-height:0;position:relative;z-index:1;display:flex;flex-direction:column;justify-content:center;padding:0 56px">
      ${prospect?.business_name ? `<div style="font-family:Georgia, serif; font-style:italic; font-size:40px; font-weight:400; color:${T.WHITE}; line-height:1.1; text-align:left; margin-bottom:36px;">For ${esc(prospect.business_name)}</div>` : ''}
      ${eyebrow('Master Service Agreement', T.ORANGE_S)}
      <h1 style="font-size:44px;font-weight:700;line-height:1.1;letter-spacing:-0.01em;margin:0;word-wrap:break-word;">
        <span style="color:${T.WHITE};">Master Service</span><br>
        <span style="color:${T.TEAL_S};">Agreement</span>
      </h1>
      <div style="width:60pt;height:2pt;background:${T.ORANGE_S};margin:16px 0 14px 0;"></div>
      <p style="font-size:11px;color:${T.CCCC};font-weight:400;margin:0;">${esc(clientLine)}</p>
    </div>
    <div style="position:relative;z-index:1;flex-shrink:0">
      ${darkCoverMetaBand(esc(prospect.business_name), 'Demand Signals', issueDate)}
      ${darkCoverFooterStrip()}
    </div>
  </div>`
}

// ── Page 2: Agreement terms (parties + structure summary) ─────────────

function termsPage(msa: MsaDocument, prospect: MsaProspect): string {
  const clientName = esc(msa.client_legal_name ?? prospect.business_name)
  const entity = esc(msa.client_entity_type ?? 'a [entity type / state]')
  const code = msa.client_code ? esc(msa.client_code) : '[client code]'
  const eff = fmtDate(msa.effective_date)
  return `
  <div style="break-before:page;background:#fff;font-family:${FONT_STACK};color:${T.BODY};padding:0 0 40px 0;">
    ${interiorPageHeader('01 — Agreement')}
    <div style="padding:28px 56px 0 56px">
      ${eyebrow('Parties & Structure', T.ORANGE_S)}
      <h1 style="font-size:26px;font-weight:700;color:${T.SLATE};margin:6px 0 4px 0;">Master Service Agreement</h1>
      <div style="width:50pt;height:2pt;background:${T.ORANGE_S};margin:0 0 18px 0;"></div>

      <p style="font-size:12px;line-height:1.7;margin:0 0 16px 0;">
        This Master Service Agreement (the &ldquo;Agreement&rdquo;) is entered into as of
        <strong>${eff}</strong> (the &ldquo;Effective Date&rdquo;), by and between
        <strong>Demand Signals LLC</strong>, a Delaware limited liability company
        (&ldquo;DSIG&rdquo; or the &ldquo;Company&rdquo;), and <strong>${clientName}</strong>,
        ${entity} (the &ldquo;Client,&rdquo; client code <strong>${code}</strong>). The Company
        and Client may each be referred to individually as a &ldquo;Party&rdquo; and collectively
        as the &ldquo;Parties.&rdquo;
      </p>

      <p style="font-size:12px;line-height:1.7;margin:0 0 16px 0;">
        This Agreement establishes the master terms and conditions governing the ongoing
        relationship between the Parties. It is intended to persist across multiple projects,
        engagements, and initiatives without re-execution. Specific services are described in one
        or more <strong>Statements of Work</strong> (each, a &ldquo;SOW&rdquo;) issued from time to
        time, each of which is governed by, and incorporated into, this Agreement upon the Client&rsquo;s
        acceptance &mdash; without requiring re-execution of this Agreement.
      </p>

      <p style="font-size:12px;line-height:1.7;margin:0 0 16px 0;">
        In the event of any conflict, the order of precedence is: (1) this Agreement; (2) the
        incorporated Disclosures identified on the next page; (3) the applicable SOW. This Agreement
        is governed by the laws of the State of Delaware; any suit, action, or proceeding shall be
        instituted in the state or federal courts located in New Castle County, Delaware. Dispute
        resolution, including mediation and arbitration, proceeds as set forth in the Standard Terms
        of Service Disclosure.
      </p>

      <p style="font-size:12px;line-height:1.7;margin:0;">
        This Agreement, together with the Disclosures incorporated on the following page and all
        SOWs issued hereunder, constitutes the entire agreement between the Parties with respect to
        the subject matter hereof and supersedes all prior and contemporaneous understandings,
        whether written or oral.
      </p>
    </div>
    ${interiorPageFooter()}
  </div>`
}

// ── Page 3: Incorporated disclosures (linked codes + e-initial fields) ─

function disclosuresPage(msa: MsaDocument): string {
  const rows = (msa.incorporated_disclosures ?? []).map((d) => {
    const ini = esc(initialFor(msa, d.code))
    // e-initial box on the left; title + linked code on the right
    return `
      <div style="display:flex;align-items:flex-start;gap:16px;padding:14px 0;border-bottom:1px solid ${T.RULE};">
        <div style="flex-shrink:0;width:64px;text-align:center;">
          <div style="font-family:'Brush Script MT','Segoe Script',cursive;font-size:20px;color:${T.SLATE};min-height:26px;line-height:1.1;">${ini}</div>
          <div style="border-top:1px solid ${T.SLATE};margin-top:2px;font-size:8px;color:${T.GRAY};letter-spacing:0.04em;padding-top:2px;">INITIAL</div>
        </div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:600;color:${T.SLATE};line-height:1.4;">DSIG ${esc(d.title)}</div>
          <a href="${esc(d.public_url)}" style="font-size:11px;color:${T.TEAL};text-decoration:underline;font-family:${FONT_STACK};">${esc(d.code)}</a>
        </div>
      </div>`
  }).join('')

  return `
  <div style="break-before:page;background:#fff;font-family:${FONT_STACK};color:${T.BODY};padding:0 0 40px 0;">
    ${interiorPageHeader('02 — Disclosures')}
    <div style="padding:28px 56px 0 56px">
      ${eyebrow('Incorporated Disclosures', T.ORANGE_S)}
      <h1 style="font-size:26px;font-weight:700;color:${T.SLATE};margin:6px 0 4px 0;">Standing Terms</h1>
      <div style="width:50pt;height:2pt;background:${T.ORANGE_S};margin:0 0 18px 0;"></div>

      <p style="font-size:12px;line-height:1.7;margin:0 0 18px 0;">
        This Agreement incorporates by reference the following standing Demand Signals Disclosures.
        By initialing beside each Disclosure below, the Client acknowledges that it has received,
        been given access to, reviewed, and agrees to be bound by that Disclosure. Each Disclosure is
        available at the linked reference beside it; the Client&rsquo;s initials constitute
        per-document acknowledgment of that specific Disclosure.
      </p>

      <div style="margin-top:4px;">
        ${rows || `<p style="font-size:12px;color:${T.GRAY};">No disclosures attached.</p>`}
      </div>

      <p style="font-size:11px;line-height:1.6;margin:20px 0 0 0;color:${T.GRAY};">
        The terms and effect of the incorporated Disclosures are binding upon the Parties upon
        execution of this Agreement and govern all SOWs issued hereunder.
      </p>
    </div>
    ${interiorPageFooter()}
  </div>`
}

// ── Page 4: Execution + signatures ────────────────────────────────────

function executionPage(msa: MsaDocument, prospect: MsaProspect): string {
  const executed = !!msa.executed_at && !!msa.executed_signature
  const execDate = executed ? fmtDate(msa.executed_at) : '________________'
  const clientSig = executed
    ? `<p style="font-family:'Brush Script MT','Segoe Script',cursive;font-size:24px;color:${T.SLATE};border-bottom:1px solid ${T.RULE};padding-bottom:4px;min-height:40px;line-height:1.2">${esc(msa.executed_signature ?? '')}</p>`
    : `<div style="border-bottom:1px solid ${T.SLATE};min-height:40px;"></div>`
  const clientName = esc(msa.client_legal_name ?? prospect.business_name)

  const blank = `<div style="border-bottom:1px solid ${T.SLATE};min-height:22px;margin-top:14px;"></div>`

  return `
  <div style="break-before:page;background:#fff;font-family:${FONT_STACK};color:${T.BODY};padding:0 0 40px 0;">
    ${interiorPageHeader('03 — Execution')}
    <div style="padding:28px 56px 0 56px">
      ${eyebrow('Authorization & Signatures', T.ORANGE_S)}
      <h1 style="font-size:26px;font-weight:700;color:${T.SLATE};margin:6px 0 4px 0;">Execution</h1>
      <div style="width:50pt;height:2pt;background:${T.ORANGE_S};margin:0 0 18px 0;"></div>

      <p style="font-size:11px;line-height:1.6;margin:0 0 24px 0;color:${T.BODY};">
        IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date. By
        signing (or by typed-name electronic signature), each Party agrees to be bound by this
        Agreement and the Disclosures incorporated herein. Electronic acceptance has the same legal
        effect as a handwritten signature under the E-SIGN Act.
      </p>

      <div style="display:flex;gap:40px;">
        <!-- DSIG (constant signatory) -->
        <div style="flex:1;">
          <div style="font-size:12px;font-weight:700;color:${T.SLATE};margin-bottom:10px;">Company: Demand Signals LLC</div>
          <div style="font-size:10px;color:${T.GRAY};letter-spacing:0.04em;">SUBMITTED BY</div>
          <div style="border-bottom:1px solid ${T.SLATE};min-height:40px;margin-top:4px;"></div>
          <div style="font-size:11px;margin-top:10px;line-height:2.0;">
            Date: ${blank}
            Name: <strong>${esc(msa.dsig_signatory_name)}</strong><br>
            Title: <strong>${esc(msa.dsig_signatory_title)}</strong><br>
            Email: <strong>${esc(msa.dsig_signatory_email)}</strong><br>
            Cell: <strong>${esc(msa.dsig_signatory_cell)}</strong>
          </div>
        </div>

        <!-- Client -->
        <div style="flex:1;">
          <div style="font-size:12px;font-weight:700;color:${T.SLATE};margin-bottom:10px;">Client: ${clientName}</div>
          <div style="font-size:10px;color:${T.GRAY};letter-spacing:0.04em;">APPROVED BY</div>
          ${clientSig}
          <div style="font-size:11px;margin-top:10px;line-height:2.0;">
            Date: <strong>${execDate}</strong>
            ${blank.replace('margin-top:14px', 'margin-top:2px')}
            Name: ${blank}
            Title: ${blank}
            Email: ${blank}
            Cell: ${blank}
          </div>
        </div>
      </div>
    </div>
    ${interiorPageFooter()}
  </div>`
}

// ── Entry point ───────────────────────────────────────────────────────

export async function renderMsaPdf(
  msa: MsaDocument,
  prospect: MsaProspect,
): Promise<Buffer> {
  const html = docShell(
    `MSA — ${msa.msa_number}`,
    coverPage(msa, prospect)
    + termsPage(msa, prospect)
    + disclosuresPage(msa)
    + executionPage(msa, prospect),
  )
  return htmlToPdfBuffer(html, { format: 'Legal', printBackground: true })
}
