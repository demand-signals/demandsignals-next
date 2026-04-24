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
 * Takes the first 2 letters of each of the first 2 words, uppercased.
 *
 * Examples:
 *   "Hangtown Range & Retail Store" → "HANG"  (Ha + ng → first 2 of "Hangtown" + first 2 of "Range")
 *   "South Side MMA"                → "SOSI"  (So + Si from first two words)
 *   "Acme"                          → "ACME"  (first 4 of single word)
 *
 * Admin can override via /admin/prospects/[id] — this is just a default.
 */
export function suggestClientCode(businessName: string): string {
  const words = businessName
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .slice(0, 2)

  if (words.length === 0) return 'XXXX'
  if (words.length === 1) return words[0].substring(0, 4).toUpperCase().padEnd(4, 'X')
  return (words[0].substring(0, 2) + words[1].substring(0, 2)).toUpperCase().padEnd(4, 'X')
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
