// ── doc-numbering.ts ────────────────────────────────────────────────
// Platform-wide document number allocation.
// Format: TYPE-CLIENT-MMDDYY{SUFFIX}
//   TYPE   — EST | SOW | INV | RCT
//   CLIENT — 4-letter code on prospects.client_code
//   MMDDYY — America/Los_Angeles date
//   SUFFIX — sequential letter per (type, client, date): A, B, ..., Z, AA, AB, ...
//
// Allocation is server-side via allocate_document_number() Postgres RPC
// (atomic, row-level lock on the triple; SECURITY DEFINER, service_role only).
//
// TODO(est): wire allocateDocNumber with doc_type:'EST' once quote_sessions
// gains a doc_number column (requires a future migration).

import { supabaseAdmin } from '@/lib/supabase/admin'

export type DocType = 'EST' | 'SOW' | 'INV' | 'RCT'

export type DocRefTable = 'quote_sessions' | 'sow_documents' | 'invoices' | 'receipts'

/**
 * Auto-suggest a 4-letter client code from a business name.
 *
 * Rules:
 *   - Skip articles/fillers: the, and, of, for, at, to, or, a, an
 *   - Skip business suffixes: inc, llc, co, corp, pc, pllc, ltd, lp
 *   - Skip credentials: cpa, cpas, od, dmd, do (NOT md, dds, dr, mr, mrs, ms, miss — those are part of brand)
 *   - Skip single-letter tokens (initials like "J." / "B.")
 *   - Convert digit runs to first letter of first digit's English spelling
 *     (0→Z, 1→O, 2→T, 3→T, 4→F, 5→F, 6→S, 7→S, 8→E, 9→N)
 *   - Single remaining word → first 4 letters (pad with last char if shorter)
 *   - Two+ remaining words → 2 chars from each until we have 4
 *   - Collision resolution happens DB-side via the partial unique index;
 *     admin overrides in /admin/prospects if auto-generated collides.
 *
 * Examples:
 *   "Hangtown Range & Retail Store"     → "HARA"  (Ha + Ra)
 *   "The MD Aesthetics"                 → "MDAE"  (MD kept; The dropped)
 *   "Spa-520"                           → "SPAF"  (Spa + F for "five")
 *   "Brickyard"                         → "BRIC"  (single word, first 4)
 *   "Aaron B. Dosh, Attorney at Law"    → "AADO"  (B dropped, at dropped)
 *   "G & O Body Shop Inc."              → "BOSH"  (single letters + Inc dropped)
 *
 * Admin can override via /admin/prospects/[id].
 */
const NOISE_WORDS = new Set([
  'THE', 'AND', 'OF', 'FOR', 'AT', 'TO', 'OR', 'A', 'AN',
  'INC', 'LLC', 'CO', 'CORP', 'PC', 'PLLC', 'LTD', 'LP',
  'CPA', 'CPAS', 'OD', 'DMD', 'DO',
])

const DIGIT_INITIAL: Record<string, string> = {
  '0': 'Z', '1': 'O', '2': 'T', '3': 'T', '4': 'F',
  '5': 'F', '6': 'S', '7': 'S', '8': 'E', '9': 'N',
}

export function suggestClientCode(businessName: string): string {
  // Split into letter-runs and digit-runs; drop everything else
  const rawTokens = businessName.match(/[A-Za-z]+|[0-9]+/g) ?? []

  const tokens = rawTokens
    .map((t) => {
      if (/^[0-9]+$/.test(t)) return DIGIT_INITIAL[t[0]] ?? ''
      return t
    })
    .filter((t) => {
      if (t.length === 0) return false
      if (/^[A-Za-z]$/.test(t)) return false  // single-letter initials
      if (NOISE_WORDS.has(t.toUpperCase())) return false
      return true
    })

  let base: string
  if (tokens.length === 0) {
    base = 'XXXX'
  } else if (tokens.length === 1) {
    const w = tokens[0]
    base = w.length >= 4 ? w.substring(0, 4) : w.padEnd(4, w[w.length - 1])
  } else {
    base = tokens.map((t) => t.substring(0, 2)).join('').substring(0, 4)
  }

  if (base.length < 4) base = base.padEnd(4, base[base.length - 1] ?? 'X')
  return base.toUpperCase()
}

/**
 * Like suggestClientCode but checks the DB for collisions and resolves them
 * deterministically. If the base code is taken, tries base[0..2] + A/B/C/… (last
 * char varies), then base[0..1] + A/B/C/… + base[3] (third char varies).
 *
 * Pass exceptProspectId to skip that prospect's own existing code (edit case).
 */
export async function suggestAvailableClientCode(
  businessName: string,
  exceptProspectId?: string,
): Promise<string> {
  const base = suggestClientCode(businessName)

  // Fetch all existing client_codes (at most a few hundred — tiny result set)
  const { data } = await supabaseAdmin
    .from('prospects')
    .select('client_code, id')
    .not('client_code', 'is', null)

  const taken = new Set(
    (data ?? [])
      .filter((r: { id: string; client_code: string }) => r.id !== exceptProspectId)
      .map((r: { id: string; client_code: string }) => r.client_code as string),
  )

  if (!taken.has(base)) return base

  // First pass: replace last char with A..Z
  const prefix3 = base.substring(0, 3)
  for (let i = 0; i < 26; i++) {
    const candidate = prefix3 + String.fromCharCode(65 + i)
    if (candidate !== base && !taken.has(candidate)) return candidate
  }

  // Second pass: replace 3rd char A..Z, keep last char from base
  const prefix2 = base.substring(0, 2)
  const lastChar = base.substring(3, 4)
  for (let i = 0; i < 26; i++) {
    const candidate = prefix2 + String.fromCharCode(65 + i) + lastChar
    if (candidate !== base && !taken.has(candidate)) return candidate
  }

  // Extreme fallback: 2 random chars after prefix2 (shouldn't happen at realistic scale)
  const rand = Array.from({ length: 2 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26)),
  ).join('')
  return prefix2 + rand
}

/**
 * Allocates a new document number via the allocate_document_number() RPC.
 * Atomic, race-safe (DB takes a row-level lock on the (type, client, date) triple).
 *
 * Returns something like "INV-HANG-042326A".
 *
 * Throws if the prospect has no client_code set — the caller should surface
 * this to the admin as a recoverable error, not a 500.
 */
export async function allocateDocNumber(args: {
  doc_type: DocType
  prospect_id: string
  ref_table: DocRefTable
  ref_id: string
}): Promise<string> {
  const { data: prospect, error: pErr } = await supabaseAdmin
    .from('prospects')
    .select('client_code, business_name')
    .eq('id', args.prospect_id)
    .single()

  if (pErr) throw new Error(`Prospect lookup failed: ${pErr.message}`)
  if (!prospect?.client_code) {
    throw new Error(
      `Prospect "${prospect?.business_name ?? args.prospect_id}" has no client_code — ` +
        `set one in /admin/prospects before issuing documents.`,
    )
  }

  const { data, error } = await supabaseAdmin.rpc('allocate_document_number', {
    p_doc_type: args.doc_type,
    p_client_code: prospect.client_code,
    p_ref_table: args.ref_table,
    p_ref_id: args.ref_id,
  })
  if (error) throw new Error(`Doc number allocation failed: ${error.message}`)
  return data as string
}
