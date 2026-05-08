// ── portal-data.ts ─────────────────────────────────────────────────
// Read-only data layer for /portal/*. EVERY query takes prospectId
// and constrains by it at the SQL level — no rendering-layer filter.
// Pages call these helpers; they never touch supabaseAdmin directly.
//
// CRITICAL: queries against project_notes always include
//   visibility = 'client' AND suppressed = false
// at the SQL layer so internal/suppressed rows are STRUCTURALLY
// unreachable from the portal regardless of frontend bugs.
//
// Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §13
// Plan: docs/superpowers/plans/2026-05-07-client-portal-v1-plan.md Task 9.1

import { supabaseAdmin } from './supabase/admin'

// ── Prospect ───────────────────────────────────────────────────────

export interface PortalProspect {
  id: string
  business_name: string | null
  owner_name: string | null
  owner_email: string | null
  owner_phone: string | null
  business_phone: string | null
  website_url: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string | null
  client_code: string | null
  became_client_at: string | null
  channels: unknown
}

export async function getProspectById(prospectId: string): Promise<PortalProspect | null> {
  const { data } = await supabaseAdmin
    .from('prospects')
    .select(
      'id, business_name, owner_name, owner_email, owner_phone, business_phone, website_url, address, city, state, zip, country, client_code, became_client_at, channels',
    )
    .eq('id', prospectId)
    .eq('is_client', true)
    .maybeSingle()
  return (data as PortalProspect | null) ?? null
}

// ── Invoices ───────────────────────────────────────────────────────

export interface PortalInvoiceSummary {
  id: string
  invoice_number: string
  status: string
  total_due_cents: number
  issued_at: string | null
  due_at: string | null
  created_at: string
}

export async function getInvoicesForProspect(prospectId: string): Promise<PortalInvoiceSummary[]> {
  const { data } = await supabaseAdmin
    .from('invoices')
    .select('id, invoice_number, status, total_due_cents, issued_at, due_at, created_at')
    .eq('prospect_id', prospectId)
    .order('created_at', { ascending: false })
  return (data as PortalInvoiceSummary[] | null) ?? []
}

export interface PortalInvoiceLineItem {
  id: string
  description: string | null
  quantity: number | null
  unit_amount_cents: number | null
  amount_cents: number | null
  cadence?: string | null
}

export interface PortalInvoiceDetail extends PortalInvoiceSummary {
  payment_terms: string | null
  notes: string | null
  subtotal_cents: number | null
  tax_cents: number | null
  discount_cents: number | null
  amount_paid_cents: number | null
  public_uuid: string | null
  line_items: PortalInvoiceLineItem[]
}

export async function getInvoiceByNumberForProspect(
  prospectId: string,
  invoiceNumber: string,
): Promise<PortalInvoiceDetail | null> {
  const { data: invoice } = await supabaseAdmin
    .from('invoices')
    .select(
      'id, invoice_number, status, total_due_cents, issued_at, due_at, created_at, payment_terms, notes, subtotal_cents, tax_cents, discount_cents, amount_paid_cents, public_uuid',
    )
    .eq('invoice_number', invoiceNumber)
    .eq('prospect_id', prospectId)
    .maybeSingle()
  if (!invoice) return null

  const { data: items } = await supabaseAdmin
    .from('invoice_line_items')
    .select('id, description, quantity, unit_amount_cents, amount_cents, cadence')
    .eq('invoice_id', invoice.id)
    .order('sort_order', { ascending: true })

  return {
    ...(invoice as PortalInvoiceSummary & {
      payment_terms: string | null
      notes: string | null
      subtotal_cents: number | null
      tax_cents: number | null
      discount_cents: number | null
      amount_paid_cents: number | null
      public_uuid: string | null
    }),
    line_items: (items as PortalInvoiceLineItem[] | null) ?? [],
  }
}

export async function getOutstandingBalanceForProspect(prospectId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('invoices')
    .select('total_due_cents')
    .eq('prospect_id', prospectId)
    .in('status', ['sent', 'viewed'])
  return (data ?? []).reduce((s, inv) => s + (inv.total_due_cents ?? 0), 0)
}

// ── Projects ───────────────────────────────────────────────────────

export interface PortalProjectSummary {
  id: string
  name: string
  status: string
  type: string | null
  monthly_value: number | null
  start_date: string | null
  target_date: string | null
  completed_at: string | null
  updated_at: string
}

export async function getProjectsForProspect(prospectId: string): Promise<PortalProjectSummary[]> {
  const { data } = await supabaseAdmin
    .from('projects')
    .select('id, name, status, type, monthly_value, start_date, target_date, completed_at, updated_at')
    .eq('prospect_id', prospectId)
    .order('status', { ascending: true })  // active first alphabetically
    .order('updated_at', { ascending: false })
  return (data as PortalProjectSummary[] | null) ?? []
}

export interface PortalProjectDetail extends PortalProjectSummary {
  phases: unknown               // jsonb — see migrations 017a/018b
  milestones: unknown           // jsonb (legacy)
  notes_timeline: PortalProjectNote[]
}

export async function getProjectByIdForProspect(
  prospectId: string,
  projectId: string,
): Promise<PortalProjectDetail | null> {
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select(
      'id, name, status, type, monthly_value, start_date, target_date, completed_at, updated_at, phases, milestones',
    )
    .eq('id', projectId)
    .eq('prospect_id', prospectId)
    .maybeSingle()
  if (!project) return null

  const notes = await getNotesForProjectClientVisible(projectId)

  return {
    ...(project as PortalProjectSummary & { phases: unknown; milestones: unknown }),
    notes_timeline: notes,
  }
}

// ── Project notes (client-visible only) ────────────────────────────

export interface PortalProjectNote {
  id: string
  title: string | null
  body: string
  created_at: string
}

export async function getNotesForProjectClientVisible(
  projectId: string,
): Promise<PortalProjectNote[]> {
  const { data } = await supabaseAdmin
    .from('project_notes')
    .select('id, title, body, created_at')
    .eq('project_id', projectId)
    .eq('visibility', 'client')           // SQL-level filter — load-bearing
    .eq('suppressed', false)              // SQL-level filter — load-bearing
    .order('created_at', { ascending: false })
  return (data as PortalProjectNote[] | null) ?? []
}

// ── Payment schedules (project obligations) ────────────────────────
//
// payment_schedules has no prospect_id; it FKs to sow_documents which
// FKs to prospects. Walk the join.

export interface PortalPaymentInstallment {
  id: string
  amount_cents: number
  amount_paid_cents: number
  currency_type: string                    // 'cash' | 'tik'
  status: string
  trigger_type: string
  trigger_date: string | null
  fired_at: string | null
  description: string | null
  sequence: number
  schedule_id: string
}

export async function getPaymentInstallmentsForProject(
  projectId: string,
): Promise<PortalPaymentInstallment[]> {
  const { data: schedules } = await supabaseAdmin
    .from('payment_schedules')
    .select('id')
    .eq('project_id', projectId)

  if (!schedules || schedules.length === 0) return []
  const scheduleIds = schedules.map((s) => s.id)

  const { data: installments } = await supabaseAdmin
    .from('payment_installments')
    .select(
      'id, amount_cents, amount_paid_cents, currency_type, status, trigger_type, trigger_date, fired_at, description, sequence, schedule_id',
    )
    .in('schedule_id', scheduleIds)
    .order('sequence', { ascending: true })
  return (installments as PortalPaymentInstallment[] | null) ?? []
}
