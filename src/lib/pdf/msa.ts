// ── pdf/msa.ts ────────────────────────────────────────────────────────
// Master Service Agreement PDF per DSIG PDF Generation Standard v2.
// Pages: Cover / Full Agreement Terms (§1–16) / Incorporated Disclosures
//        (linked codes + e-initials) / Execution & Signatures /
//        Signer Certificate (forensic fingerprint).
// Rendered per-client; uploaded to PRIVATE R2 (contains signatures/PII).
//
// Page-break rule (locked, SOW-DOCK-042826A): dark cover pages use
// min-height:100vh; white interior pages must NOT.

import { htmlToPdfBuffer } from './render'
import {
  T, FONT_STACK,
  esc, docShell,
  decorativeCircles, eyebrow,
  interiorPageHeader, interiorPageFooter,
  darkCoverTopStrip, darkCoverMetaBand, darkCoverFooterStrip,
} from './_shared'
import { SIGNATURE_FONT_FACE, SIGNATURE_FONT_FAMILY } from './signature-font'

// ── Types ─────────────────────────────────────────────────────────────

export interface MsaIncorporatedDisclosure {
  code: string
  title: string
  public_url: string
}

export interface SignerFingerprint {
  ip?: string | null
  ip_geo?: { city?: string; region?: string; country?: string; lat?: number; lon?: number; org?: string; timezone?: string } | null
  user_agent?: string | null
  browser?: string | null
  os?: string | null
  device?: string | null
  platform?: string | null
  vendor?: string | null
  languages?: string[] | string | null
  timezone?: string | null
  screen?: { w?: number; h?: number; dpr?: number; color_depth?: number } | null
  viewport?: { w?: number; h?: number } | null
  geolocation?: { lat?: number; lon?: number; accuracy?: number; at?: string } | null
  canvas_fp?: string | null
  webgl_vendor?: string | null
  webgl_renderer?: string | null
  hardware_concurrency?: number | null
  device_memory?: number | null
  touch_points?: number | null
  do_not_track?: string | null
  cookies_enabled?: boolean | null
  collected_at?: string | null
  [k: string]: unknown
}

export interface MsaDocument {
  msa_number: string
  public_uuid: string
  status: string
  title: string
  client_legal_name: string | null
  client_code: string | null
  client_entity_type: string | null
  effective_date: string | null
  incorporated_disclosures: MsaIncorporatedDisclosure[]
  dsig_signatory_name: string
  dsig_signatory_title: string
  dsig_signatory_email: string
  dsig_signatory_cell: string
  dsig_signed_at?: string | null
  executed_at: string | null
  executed_signature: string | null
  executed_ip?: string | null
  approver_name?: string | null
  approver_title?: string | null
  approver_email?: string | null
  approver_cell?: string | null
  esign_consent?: boolean | null
  esign_consent_at?: string | null
  signer_fingerprint?: SignerFingerprint | null
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

// Embedded handwriting font (rendered in serverless Chromium via @font-face),
// with system-font fallbacks for local/dev environments.
const CURSIVE = `'${SIGNATURE_FONT_FAMILY}','Brush Script MT','Segoe Script','Snell Roundhand',cursive`

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '________________'
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const months = ['January','February','March','April','May','June','July',
    'August','September','October','November','December']
  if (!y || !m || !d) return esc(iso)
  return `${months[m - 1]} ${d}, ${y}`
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return esc(iso)
  return d.toISOString().replace('T', ' ').replace('.000Z', ' UTC').replace('Z', ' UTC')
}

function initialFor(msa: MsaDocument, code: string): string {
  const hit = msa.disclosure_initials?.find((i) => i.code === code)
  return hit?.initials ?? ''
}

function clientName(msa: MsaDocument, prospect: MsaProspect): string {
  return msa.client_legal_name ?? prospect.business_name ?? '[Client]'
}

// Clause block helper: heading + paragraphs. Tight spacing to keep the full
// agreement compact (short-document goal).
function clause(num: number, title: string, body: string): string {
  return `
    <div style="margin-bottom:9px;break-inside:avoid;">
      <div style="font-size:11px;font-weight:700;color:${T.SLATE};margin-bottom:2px;">${num}. ${esc(title)}</div>
      <div style="font-size:10px;line-height:1.45;color:${T.BODY};">${body}</div>
    </div>`
}

// ── Page 1: Cover ─────────────────────────────────────────────────────

function coverPage(msa: MsaDocument, prospect: MsaProspect): string {
  const issueDate = fmtDate(msa.sent_at?.slice(0, 10) ?? msa.created_at?.slice(0, 10) ?? null)
  const cl = clientName(msa, prospect)
  const line = msa.client_code ? `${cl} — ${msa.client_code}` : cl
  return `
  <div style="position:relative;width:100%;min-height:100vh;background:${T.SLATE};display:flex;flex-direction:column;overflow:hidden;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-family:${FONT_STACK};">
    ${decorativeCircles()}
    ${darkCoverTopStrip()}
    <div style="flex:1;min-height:0;position:relative;z-index:1;display:flex;flex-direction:column;justify-content:center;padding:0 56px">
      ${prospect?.business_name ? `<div style="font-family:Georgia, serif; font-style:italic; font-size:40px; font-weight:400; color:${T.WHITE}; line-height:1.1; margin-bottom:36px;">For ${esc(prospect.business_name)}</div>` : ''}
      ${eyebrow('Master Service Agreement', T.ORANGE_S)}
      <h1 style="font-size:44px;font-weight:700;line-height:1.1;letter-spacing:-0.01em;margin:0;">
        <span style="color:${T.WHITE};">Master Service</span><br>
        <span style="color:${T.TEAL_S};">Agreement</span>
      </h1>
      <div style="width:60pt;height:2pt;background:${T.ORANGE_S};margin:16px 0 14px 0;"></div>
      <p style="font-size:11px;color:${T.CCCC};margin:0;">${esc(line)}</p>
    </div>
    <div style="position:relative;z-index:1;flex-shrink:0">
      ${darkCoverMetaBand(esc(prospect.business_name), 'Demand Signals', issueDate)}
      ${darkCoverFooterStrip()}
    </div>
  </div>`
}

// ── Page 2: Full agreement terms (§1–16) ──────────────────────────────

function termsPage(msa: MsaDocument, prospect: MsaProspect): string {
  const cl = esc(clientName(msa, prospect))
  // Entity type is optional — render the phrase only when known, so a blank
  // never shows a "[entity type / state]" placeholder in the executed doc.
  const entityPhrase = msa.client_entity_type ? `, ${esc(msa.client_entity_type)},` : ''
  const codePhrase = msa.client_code ? `, client code <strong>${esc(msa.client_code)}</strong>` : ''
  const eff = fmtDate(msa.effective_date)

  const discLine = (msa.incorporated_disclosures ?? [])
    .map((d) => `${esc(d.title)} (<a href="${esc(d.public_url)}" style="color:${T.TEAL};">${esc(d.code)}</a>)`)
    .join('; ')

  const body = `
    <p style="font-size:11px;line-height:1.6;margin:0 0 14px 0;color:${T.BODY};">
      This Master Service Agreement (the &ldquo;Agreement&rdquo;) is entered into as of <strong>${eff}</strong>
      (the &ldquo;Effective Date&rdquo;), by and between <strong>Demand Signals LLC</strong>, a Delaware limited
      liability company (&ldquo;DSIG&rdquo; or the &ldquo;Company&rdquo;), and <strong>${cl}</strong>${entityPhrase}
      (the &ldquo;Client&rdquo;${codePhrase}). The Company and Client may each be referred
      to individually as a &ldquo;Party&rdquo; and collectively as the &ldquo;Parties.&rdquo;
    </p>

    <div style="column-count:2;column-gap:28px;column-fill:balance;">
    ${clause(1, 'Purpose & Structure',
      `This Agreement establishes the master terms and conditions governing the ongoing relationship between the
       Parties. It is intended to persist across multiple projects, engagements, and initiatives without
       re-execution. Specific services are described in one or more <strong>Statements of Work</strong> (each, a
       &ldquo;SOW&rdquo;) issued from time to time, each of which is governed by, and incorporated into, this
       Agreement upon the Client&rsquo;s acceptance &mdash; without requiring re-execution of this Agreement.`)}

    ${clause(2, 'Incorporated Disclosures',
      `This Agreement incorporates by reference the following standing Demand Signals Disclosures, which the Client
       acknowledges by initialing on the disclosures page: ${discLine || '[disclosures]'}. The terms and effect of
       the incorporated Disclosures are binding upon the Parties upon execution of this Agreement and govern all SOWs
       issued hereunder.`)}

    ${clause(3, 'Order of Precedence',
      `In the event of any conflict, the order of precedence is: (1) this Agreement; (2) the incorporated
       Disclosures; (3) the applicable SOW. A SOW may vary the commercial terms (scope, price, timeline) for that
       engagement only, and only where it expressly references the section it modifies. No SOW shall modify the
       Disclosures or this Agreement generally.`)}

    ${clause(4, 'Statements of Work',
      `<strong>(a)</strong> DSIG may issue a SOW describing the scope, deliverables, phases, price, and payment
       schedule for specific services; a SOW may be preceded by a non-binding budgetary Quote. <strong>(b)</strong>
       A SOW becomes binding upon the Client&rsquo;s acceptance, which may be effected by typing the Client&rsquo;s
       name as an electronic signature with the date; such acceptance constitutes a valid signature under the
       Electronic Signatures in Global and National Commerce Act (E-SIGN) and applicable state law and has the same
       legal effect as a handwritten signature. <strong>(c)</strong> Acceptance of a SOW automatically generates the
       deposit or initial-installment invoice, creates the corresponding project, and (for recurring deliverables)
       authorizes recurring billing on the stated cadence until terminated. <strong>(d)</strong> Each SOW is a
       separate undertaking; the expiration or termination of any individual SOW does not affect this Agreement or
       any other SOW.`)}

    ${clause(5, 'Term & Termination',
      `<strong>(a) Term.</strong> This Agreement commences on the Effective Date and continues until terminated; the
       expiration or completion of any individual SOW shall not terminate this Agreement. <strong>(b) For
       Convenience.</strong> Either Party may terminate upon thirty (30) days&rsquo; prior written notice, without
       affecting any SOW then in progress. <strong>(c) For Cause.</strong> Either Party may terminate immediately on
       written notice for an uncured material breach after fifteen (15) days. <strong>(d) Effect.</strong> Upon
       termination, the Client shall pay for all services rendered and costs incurred through the effective date;
       confidentiality, IP, payment obligations, indemnification, limitation of liability, non-solicitation, and
       dispute resolution survive.`)}

    ${clause(6, 'Intellectual Property & Work Product',
      `Ownership, license, and delivery of work product are as set forth in the applicable SOW and the incorporated
       Disclosures. Absent a contrary SOW provision, deliverables transfer to the Client upon full payment of all
       amounts due for the applicable SOW and satisfaction of all outstanding obligations. DSIG retains ownership of
       its pre-existing tools, frameworks, libraries, templates, methodologies, and general know-how, and may reuse
       the same across engagements; any such retained materials incorporated into a deliverable are licensed to the
       Client on a non-exclusive, perpetual basis for the Client&rsquo;s use of the deliverable.`)}

    ${clause(7, 'Governing Law',
      `This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware,
       without regard to its conflict of law principles. Any legal suit, action, or proceeding arising out of or
       related to this Agreement shall be instituted exclusively in the state or federal courts located in New
       Castle County, Delaware, and each Party irrevocably submits to the jurisdiction and venue of such courts.
       Dispute resolution, including mediation and arbitration, proceeds as set forth in the Standard Terms of
       Service Disclosure.`)}

    ${clause(8, 'Counterparts',
      `This Agreement may be executed in counterparts, each of which shall be deemed an original, but all of which
       together constitute one and the same agreement. A signed copy delivered by facsimile, e-mail, or other means
       of electronic transmission shall be deemed to have the same legal effect as delivery of an original signed
       copy.`)}

    ${clause(9, 'Amendments',
      `No amendment to or modification of this Agreement shall be effective unless in writing and signed by both
       Parties. For the avoidance of doubt, issuing a new SOW is not an amendment to this Agreement and does not
       require re-execution.`)}

    ${clause(10, 'Notices',
      `All notices shall be in writing and deemed given (a) when delivered by hand with written confirmation; (b)
       when received if sent by a nationally recognized overnight courier; (c) on the date sent by e-mail with
       confirmation during business hours (next business day otherwise); or (d) on the third day after mailing by
       certified or registered mail, return receipt requested. Notices must be sent to the addresses on the
       signature page.`)}

    ${clause(11, 'Indemnification',
      `Each Party shall indemnify, defend, and hold harmless the other Party and its affiliates, officers, directors,
       employees, agents, successors, and permitted assigns from and against all losses, damages, liabilities,
       deficiencies, claims, actions, judgments, settlements, interest, awards, penalties, fines, costs, or expenses
       of whatever kind, including reasonable attorney fees, arising out of or resulting from any third-party claim
       related to the services provided under this Agreement.`)}

    ${clause(12, 'Limitation of Liability',
      `In no event shall either Party be liable to the other or to any third party for any loss of use, revenue or
       profit, or for any consequential, indirect, incidental, special, exemplary, or punitive damages, whether
       arising out of breach of contract, tort (including negligence), or otherwise, regardless of whether such
       damage was foreseeable and whether or not the Party has been advised of such potential damages.`)}

    ${clause(13, 'Independent Contractor Status',
      `The relationship between DSIG and ${cl} is that of an independent contractor. DSIG performs the services as an
       independent contractor and not as an employee, agent, or representative of the Client. Neither Party has
       authority to bind the other, nor shall either Party hold itself out as having such authority.`)}

    ${clause(14, 'No Employment Relationship',
      `Nothing herein creates an employment, partnership, joint venture, or agency relationship. DSIG is solely
       responsible for all wages, taxes, and costs related to any individuals it engages, including federal, state,
       and local income taxes, FICA, unemployment insurance, and any other required payroll taxes or insurance.
       <strong>Control of Work.</strong> DSIG retains the sole right to control the manner and means by which the
       services are performed; the Client is interested only in the results obtained.`)}

    ${clause(15, 'Authority',
      `Each person signing this Agreement on behalf of a Party represents and expressly warrants that he/she/they
       have all requisite power and authority to enter into, execute, and deliver this Agreement for such Party, and
       that this Agreement, when so executed and delivered, will be a binding obligation of, and enforceable against,
       such Party in accordance with its terms.`)}

    ${clause(16, 'Entire Agreement',
      `This Agreement, together with the Disclosures incorporated herein and all SOWs issued hereunder, constitutes
       the entire agreement between the Parties with respect to the subject matter hereof and supersedes all prior
       and contemporaneous understandings, agreements, representations, and warranties, both written and oral.`)}
    </div>
  `

  return `
  <div style="break-before:page;background:#fff;font-family:${FONT_STACK};color:${T.BODY};padding:0 0 40px 0;">
    ${interiorPageHeader('01 — Agreement')}
    <div style="padding:24px 56px 0 56px">
      ${eyebrow('Parties & Terms', T.ORANGE_S)}
      <h1 style="font-size:24px;font-weight:700;color:${T.SLATE};margin:6px 0 4px 0;">Master Service Agreement</h1>
      <div style="width:50pt;height:2pt;background:${T.ORANGE_S};margin:0 0 16px 0;"></div>
      ${body}
    </div>
    ${interiorPageFooter()}
  </div>`
}

// ── Page 3: Incorporated disclosures (e-initials + linked codes) ──────

// ── Page 3: Disclosures + Execution (combined to reduce white space) ──

function disclosuresAndExecutionPage(msa: MsaDocument, prospect: MsaProspect): string {
  const rows = (msa.incorporated_disclosures ?? []).map((d) => {
    const ini = esc(initialFor(msa, d.code))
    return `
      <div style="display:flex;align-items:center;gap:14px;padding:8px 0;border-bottom:1px solid ${T.RULE};">
        <div style="flex-shrink:0;width:56px;text-align:center;">
          <div style="font-family:${CURSIVE};font-size:20px;color:${T.SLATE};min-height:22px;line-height:1;">${ini}</div>
          <div style="border-top:1px solid ${T.SLATE};margin-top:1px;font-size:7px;color:${T.GRAY};letter-spacing:0.04em;padding-top:1px;">INITIAL</div>
        </div>
        <div style="flex:1;">
          <div style="font-size:12px;font-weight:600;color:${T.SLATE};line-height:1.3;">DSIG ${esc(d.title)}</div>
          <a href="${esc(d.public_url)}" style="font-size:10px;color:${T.TEAL};text-decoration:underline;">${esc(d.code)}</a>
        </div>
      </div>`
  }).join('')

  const executed = !!msa.executed_at && !!msa.executed_signature
  const cl = esc(clientName(msa, prospect))
  const clientSig = executed
    ? `<div style="font-family:${CURSIVE};font-size:24px;color:${T.SLATE};border-bottom:1px solid ${T.RULE};padding-bottom:2px;min-height:32px;line-height:1.1">${esc(msa.executed_signature ?? '')}</div>`
    : `<div style="border-bottom:1px solid ${T.SLATE};min-height:32px;"></div>`
  const val = (v: string | null | undefined) => v ? `<strong>${esc(v)}</strong>` : `<span style="display:inline-block;border-bottom:1px solid ${T.SLATE};min-width:160px;">&nbsp;</span>`
  const dsigDate = msa.dsig_signed_at ?? msa.sent_at ?? null
  const dsigSig = `<div style="font-family:${CURSIVE};font-size:24px;color:${T.SLATE};border-bottom:1px solid ${T.RULE};padding-bottom:2px;min-height:32px;line-height:1.1">${esc(msa.dsig_signatory_name)}</div>`

  return `
  <div style="break-before:page;background:#fff;font-family:${FONT_STACK};color:${T.BODY};padding:0 0 32px 0;">
    ${interiorPageHeader('02 — Disclosures & Execution')}
    <div style="padding:22px 56px 0 56px">
      ${eyebrow('Incorporated Disclosures', T.ORANGE_S)}
      <p style="font-size:10.5px;line-height:1.5;margin:6px 0 10px 0;">
        This Agreement incorporates by reference the following standing Demand Signals Disclosures. By initialing
        beside each, the Client acknowledges it has received, reviewed, and agrees to be bound by that Disclosure.
      </p>
      <div>${rows || `<p style="font-size:11px;color:${T.GRAY};">No disclosures attached.</p>`}</div>

      <div style="margin-top:22px;">${eyebrow('Authorization & Signatures', T.ORANGE_S)}</div>
      <p style="font-size:10px;line-height:1.5;margin:6px 0 14px 0;color:${T.BODY};">
        IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date. Electronic acceptance
        has the same legal effect as a handwritten signature under the E-SIGN Act.${msa.esign_consent ? ' The Client has affirmatively consented to electronic signatures.' : ''}
      </p>

      <div style="display:flex;gap:40px;">
        <div style="flex:1;">
          <div style="font-size:11px;font-weight:700;color:${T.SLATE};margin-bottom:4px;">Company: Demand Signals LLC</div>
          <div style="font-size:9px;color:${T.GRAY};letter-spacing:0.04em;">SUBMITTED BY</div>
          ${dsigSig}
          <div style="font-size:10.5px;margin-top:6px;line-height:1.7;">
            Date: <strong>${fmtDate(dsigDate)}</strong><br>
            Name: <strong>${esc(msa.dsig_signatory_name)}</strong><br>
            Title: <strong>${esc(msa.dsig_signatory_title)}</strong><br>
            Email: <strong>${esc(msa.dsig_signatory_email)}</strong><br>
            Cell: <strong>${esc(msa.dsig_signatory_cell)}</strong>
          </div>
        </div>
        <div style="flex:1;">
          <div style="font-size:11px;font-weight:700;color:${T.SLATE};margin-bottom:4px;">Client: ${cl}</div>
          <div style="font-size:9px;color:${T.GRAY};letter-spacing:0.04em;">APPROVED BY</div>
          ${clientSig}
          <div style="font-size:10.5px;margin-top:6px;line-height:1.7;">
            Date: ${executed ? `<strong>${fmtDate(msa.executed_at)}</strong>` : val(null)}<br>
            Name: ${val(msa.approver_name ?? msa.executed_signature)}<br>
            Title: ${val(msa.approver_title)}<br>
            Email: ${val(msa.approver_email)}<br>
            Cell: ${val(msa.approver_cell)}
          </div>
        </div>
      </div>
    </div>
    ${interiorPageFooter()}
  </div>`
}

// ── Page 5: Signer certificate (forensic fingerprint) ─────────────────

function certificatePage(msa: MsaDocument): string {
  if (!msa.executed_at) {
    return `
    <div style="break-before:page;background:#fff;font-family:${FONT_STACK};color:${T.BODY};padding:0 0 40px 0;">
      ${interiorPageHeader('04 — Certificate')}
      <div style="padding:28px 56px 0 56px">
        ${eyebrow('Signature Certificate', T.ORANGE_S)}
        <h1 style="font-size:26px;font-weight:700;color:${T.SLATE};margin:6px 0 4px 0;">Not Yet Executed</h1>
        <div style="width:50pt;height:2pt;background:${T.ORANGE_S};margin:0 0 18px 0;"></div>
        <p style="font-size:12px;color:${T.GRAY};">This certificate is generated once the Client executes the Agreement.</p>
      </div>
      ${interiorPageFooter()}
    </div>`
  }

  const fp = msa.signer_fingerprint ?? {}
  const geo = fp.ip_geo ?? {}
  const gl = fp.geolocation ?? {}
  const scr = fp.screen ?? {}
  const langs = Array.isArray(fp.languages) ? fp.languages.join(', ') : (fp.languages ?? '')

  const row = (label: string, value: unknown) => {
    const v = value === null || value === undefined || value === '' ? '—' : String(value)
    return `<tr>
      <td style="padding:5px 12px 5px 0;font-size:10px;color:${T.GRAY};white-space:nowrap;vertical-align:top;">${esc(label)}</td>
      <td style="padding:5px 0;font-size:10px;color:${T.SLATE};word-break:break-all;">${esc(v)}</td>
    </tr>`
  }

  return `
  <div style="break-before:page;background:#fff;font-family:${FONT_STACK};color:${T.BODY};padding:0 0 40px 0;">
    ${interiorPageHeader('04 — Certificate')}
    <div style="padding:28px 56px 0 56px">
      ${eyebrow('Signature Certificate', T.ORANGE_S)}
      <h1 style="font-size:24px;font-weight:700;color:${T.SLATE};margin:6px 0 4px 0;">Certificate of Electronic Signature</h1>
      <div style="width:50pt;height:2pt;background:${T.ORANGE_S};margin:0 0 14px 0;"></div>
      <p style="font-size:10.5px;line-height:1.5;margin:0 0 16px 0;color:${T.BODY};">
        This certificate records the electronic execution of ${esc(msa.msa_number)} and the signing event metadata
        captured at the time of signature, in support of the authenticity and integrity of the executed Agreement
        under the E-SIGN Act.
      </p>

      <div style="font-size:11px;font-weight:700;color:${T.SLATE};margin:10px 0 4px;">Signature</div>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Document', msa.msa_number)}
        ${row('Signer name', msa.approver_name ?? msa.executed_signature)}
        ${row('Signer title', msa.approver_title)}
        ${row('Signer email', msa.approver_email)}
        ${row('Typed signature', msa.executed_signature)}
        ${row('E-signature consent', msa.esign_consent ? `Yes — ${fmtDateTime(msa.esign_consent_at)}` : 'Not recorded')}
        ${row('Executed at (UTC)', fmtDateTime(msa.executed_at))}
        ${row('Disclosures initialed', (msa.disclosure_initials ?? []).map((d) => d.code).join(', '))}
      </table>

      <div style="font-size:11px;font-weight:700;color:${T.SLATE};margin:14px 0 4px;">Network & Location</div>
      <table style="width:100%;border-collapse:collapse;">
        ${row('IP address', fp.ip ?? msa.executed_ip)}
        ${row('IP geolocation', [geo.city, geo.region, geo.country].filter(Boolean).join(', '))}
        ${row('IP coordinates', geo.lat != null ? `${geo.lat}, ${geo.lon}` : null)}
        ${row('IP org / ASN', geo.org)}
        ${row('IP timezone', geo.timezone)}
        ${row('Browser geolocation', gl.lat != null ? `${gl.lat}, ${gl.lon} (±${gl.accuracy ?? '?'}m)` : 'Not granted')}
      </table>

      <div style="font-size:11px;font-weight:700;color:${T.SLATE};margin:14px 0 4px;">Device & Browser</div>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Browser', fp.browser)}
        ${row('Operating system', fp.os)}
        ${row('Device', fp.device)}
        ${row('Platform', fp.platform)}
        ${row('Vendor', fp.vendor)}
        ${row('Languages', langs)}
        ${row('Timezone', fp.timezone)}
        ${row('Screen', scr.w ? `${scr.w}×${scr.h} @${scr.dpr ?? 1}x, ${scr.color_depth ?? '?'}-bit` : null)}
        ${row('Hardware threads', fp.hardware_concurrency)}
        ${row('Device memory (GB)', fp.device_memory)}
        ${row('Touch points', fp.touch_points)}
        ${row('WebGL renderer', fp.webgl_renderer)}
        ${row('Canvas fingerprint', fp.canvas_fp)}
        ${row('Do Not Track', fp.do_not_track)}
        ${row('User agent', fp.user_agent)}
        ${row('Captured at (UTC)', fmtDateTime(fp.collected_at))}
      </table>
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
    `<style>${SIGNATURE_FONT_FACE}</style>`
    + coverPage(msa, prospect)
    + termsPage(msa, prospect)
    + disclosuresAndExecutionPage(msa, prospect)
    + certificatePage(msa),
  )
  return htmlToPdfBuffer(html, { format: 'Legal', printBackground: true })
}
