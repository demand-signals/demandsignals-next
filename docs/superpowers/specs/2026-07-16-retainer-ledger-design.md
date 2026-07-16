# Retainer Ledger ("bill like attorneys") — Design Spec

**Created:** 2026-07-16 · dsig-02 session · author: Claude (Opus 4.8) with Hunter
**Status:** DRAFT — awaiting Hunter review before schema mutation
**Surface:** DSIG platform (`Y:\DSIG\demandsignals-next`)
**Related:** [SOW phases](../../../src/lib/invoice-types.ts) · [time-entries](../../../src/lib/time-entries.ts) · [project-financials](../../../src/lib/project-financials.ts) · migration series 051 (coverage) / 055 (LLM billing)

---

## 1. Problem statement

The current SOW/billing system prices **only at the service level** — every deliverable under a phase carries `unit_price_cents × hours/qty → line_total_cents`. Phases are pure containers with **no price field**. This produces two failures:

1. **Phase-budgeted SOWs render wrong.** When the real budget is a per-phase or per-project hours range (`± 30–60 hrs`, `± 90–180 total`), every service under the phase is forced to `$0 / —` (see the BirdDog SOW render — all items show `$0`), and the phase's real number has nowhere to live.
2. **No retainer/trust-account model.** DSIG wants to **bill like attorneys**: money goes "on the books," and *all services of any kind* draw down from that balance. The system has no ledger, no drawdown, no depletion thresholds, no replenishment.

The existing "retainer" (`retainer.ts`) is a **monthly recurring subscription** (the /quote plan tiers) — a forward monthly charge, NOT a prepaid pool. Different concept; not reused for balance mechanics.

The existing **coverage seam** (migration 051: `time_entries.category ∈ {bulk_payment, services_contract}` + `covered_by_invoice_id`/`covered_by_subscription_id`) tags hours as "covered by" an invoice/subscription but does **no balance arithmetic**. It is ~60% of the plumbing; this spec completes it.

---

## 2. Decisions (locked by Hunter 2026-07-16)

| Axis | Decision |
|---|---|
| **Balance unit** | **Dollars (cents)** are the ledger currency. **Hours** are a derived reporting/NTE framing on the SOW, not the ledger unit. Everything debits dollars. |
| **Balance scope** | **Per client (prospect)** — one pooled trust balance. **No per-project earmarks.** A client has ONE pool; every SOW/project they request pulls from it. Debits tag `project_id` for reporting only. (`retainer_allocations` table dropped per Hunter 2026-07-16.) |
| **Debit trigger** | **Admin-approved.** Handoffs/work accrue as **pending** debits (auto-computed: hunter hrs × rate + **LLM billable per 055 — tokens draw down too**). Admin approves → posts to ledger. Auto-hours aren't always accurate, so nothing debits the live balance without a human OK. |
| **Waived ("on our dime")** | Admin can mark a pending debit **`waived`** — the work is **logged in history** (proof it was done) but **does NOT draw down** the balance. Distinct from `void`. Use case: DSIG error/rework we absorb. `waived` = real work, deliberately not charged; `void` = wrong/duplicate entry that never should have existed. |
| **Role-based rate card** (added 2026-07-16) | DSIG bills 6 **roles** ($500 Legal → $50 Admin) per the signed rate sheet, not one flat rate. A new DB **rate card** (`rate_card_roles` + `rate_card_markups`) is the single source of truth, replacing the $200 stub AND the standalone Python rate-sheet generator. Client-facing rate-sheet PDF moves onto the platform, generated from this table. |
| **LLM cost boundary** | The raw LLM **cost basis + margin %** stay ONLY in `llm-rates.json` (internal) — NEVER in the DB or any client surface (load-bearing rule; migration 055 + memory). The rate card holds human **role rates** (client-facing, in the agreement) + the **disclosed markup tiers** (+30%/+50%). The DB stores LLM **billable** only, never cost. |
| **Role capture** | The `/handoff` flow does NOT guess a role (zero change to the working handoff pipeline). A handoff accrues a **role-less pending debit** showing the hours. The **admin assigns the role at approval time** → the rate resolves from the rate card → the debit amount computes → approve. Role lives on `retainer_transactions.role`, set at approval. |
| **Depletion — notify** | At **XX% depleted (default 75%)** → notify client (email/SMS, no invoice). Configurable per client. |
| **Depletion — re-up** | At **YY% depleted (default 90%)** → **auto-DRAFT** a replenish invoice + alert admin; admin reviews and sends. Never auto-sends money-collection. Configurable per client. |
| **Near completion** | Thresholds are editable and auto-replenish is a per-client/per-project **toggle** — turn off dunning as a project wraps. |
| **SOW render** | Phase-budget/retainer phases render deliverables as **scope bullets** (no Qty/Rate/Total columns). Kills `$0/—` rows. SOW leads with retainer amount + hours-range NTE framing. |

---

## 3. Data model (migration 059)

All amounts in **integer cents**. All new tables RLS `service_role` only (admin surface), matching `project_time_entries`.

### 3.1 `retainer_ledgers` — one balance per client

```
retainer_ledgers
  id                    uuid pk
  prospect_id           uuid  fk prospects(id)  UNIQUE   -- one ledger per client
  currency              text  default 'usd'
  balance_cents         integer not null default 0       -- DERIVED cache = sum(approved credits) - sum(approved debits); recomputed on each posting, never authoritative alone
  lifetime_credited_cents integer not null default 0
  lifetime_debited_cents  integer not null default 0
  -- thresholds (per-client; nullable → fall back to platform defaults 75/90)
  notify_pct            integer  default 75              -- XX
  reup_pct              integer  default 90              -- YY
  auto_reup_enabled     boolean  default true            -- toggle off as project wraps
  reup_target_cents     integer  null                    -- replenish invoice amount; null → same as last credit
  last_notified_at      timestamptz null                 -- dedup the XX% notice
  last_reup_drafted_at  timestamptz null                 -- dedup the YY% draft
  status                text default 'active'             -- active | closed
  notes                 text null
  created_at, updated_at timestamptz
```

`balance_cents` is a **cache**; the authoritative balance is always `SUM(approved credits) − SUM(approved debits)` over `retainer_transactions`. Every posting recomputes and writes the cache in the same transaction. A verification query (§9) asserts cache == recomputed.

### 3.2 `retainer_transactions` — the ledger (append-only, status-gated)

```
retainer_transactions
  id                uuid pk
  ledger_id         uuid fk retainer_ledgers(id)
  prospect_id       uuid fk prospects(id)          -- denormalized for query speed
  project_id        uuid fk projects(id) null      -- which project this work/allocation belongs to
  direction         text not null                  -- 'credit' | 'debit'
  status            text not null default 'pending'-- 'pending' | 'approved' | 'waived' | 'void'
  amount_cents      integer not null CHECK (amount_cents > 0)
  -- waived: real work, logged for history, deliberately NOT charged ("on our dime").
  --   affects balance = NO. shows in history = YES. Reason captured below.
  waived_by         text null
  waived_at         timestamptz null
  waive_reason      text null                        -- e.g. "rework on our error — SOW-BRDD-0710A phase 2"
  -- source linkage (what produced this row)
  source            text not null                  -- 'replenish_invoice' | 'handoff' | 'manual_debit' | 'manual_credit' | 'adjustment'
  time_entry_id     uuid fk project_time_entries(id) null   -- for handoff debits
  invoice_id        uuid fk invoices(id) null               -- for replenish credits (paid invoice → credit)
  -- audit
  description       text not null
  hours             numeric null                   -- reporting only; dollars are authoritative
  approved_by       text null
  approved_at       timestamptz null
  voided_by         text null
  voided_at         timestamptz null
  void_reason       text null
  created_by        text null
  created_at, updated_at timestamptz
```

**Only `status='approved'` rows affect the balance.** `pending` = accrued-but-not-approved (the admin approval queue). `waived` = real work absorbed by DSIG — stays in history, does NOT touch the balance. `void` = reversed/wrong entry. This gives the "admin approves debits" workflow natively: a handoff writes a `pending debit`; the admin approves it (→ recompute balance), waives it (→ logged, no charge), or voids it (→ gone).

Credits (replenishment): when a replenish **invoice is marked paid**, a `credit` transaction is auto-created as **`approved`** (money is real). Manual credits (check on the books, wire) also post approved.

### 3.3 Per-project reporting (NO allocation table)

Per Hunter 2026-07-16: **no earmarks.** The client has ONE pool; every SOW/project pulls from it. There is no `retainer_allocations` table. Per-project burn is a **query-time rollup**: `SUM(amount_cents) WHERE direction='debit' AND status='approved' AND project_id = ?`. The project detail page shows "this project has drawn $X from the retainer" derived on read — no stored earmark, no cap.

### 3.4 SOW phase pricing mode (extend existing JSONB — no new column needed for the SOW shape)

`sow_documents.phases` is already JSONB (`SowPhase[]`). Add fields to the `SowPhase` TS type (no migration — JSONB is schemaless), rendered by the PDF/preview:

```ts
interface SowPhase {
  id, name, description, deliverables
  pricing_mode?: 'itemized' | 'scope_only'   // NEW. default 'itemized' (back-comp)
  hours_low?: number                          // NEW. NTE framing, scope_only phases
  hours_high?: number                         // NEW
  // no per-phase dollar price — money lives in the retainer ledger, not the SOW
}
```

`scope_only` → render deliverables as bullets, show `± hours_low–hours_high hrs` on the phase header, no price columns. `itemized` → unchanged.

The SOW gains a top-level **retainer framing** (also JSONB on the doc, or new columns — TBD in plan):
```
sow_documents.engagement_type   text default 'fixed_scope'  -- 'fixed_scope' | 'retainer'
sow_documents.retainer_initial_cents  integer null          -- opening "money on the books"
sow_documents.retainer_hours_low / _high  numeric null      -- ± NTE framing
```

On SOW **accept**, a `retainer` engagement seeds/reuses the client's `retainer_ledgers` row and creates the opening replenish invoice for `retainer_initial_cents`.

---

## 4. Drawdown flow (the core mechanic)

```
/handoff logs work  (NO change to the handoff pipeline — it never picks a role)
  → project_time_entries row (hunter_minutes, claude_minutes, llm_billable_cents [055])
  → NEW: on insert, if project's client has a retainer ledger,
    auto-create a role-less retainer_transactions row:
        direction='debit', status='pending', source='handoff',
        role=NULL,                       -- admin sets it at approval
        hours=hunter_hours,              -- captured, priced later
        llm_billable_cents baked into amount; human-hours portion pending role,
        amount_cents = llm_billable_cents (human $0 until role chosen),
        time_entry_id=…, project_id=…
  → appears in admin "Pending Debits" approval queue

Admin approval (this is where the human rate is applied)
  → admin picks ROLE (Legal/Exec/Consulting/Research/Engineering/Admin)
  → rate = rate_card_roles[role].hourly_rate_cents
  → amount_cents = round(hours × rate) + llm_billable_cents
  → Approve → posts; Waive → logged, no charge; Void → removed

Admin reviews queue (hours may be inaccurate)
  → Approve  → status='approved', recompute ledger balance
  → Edit     → adjust amount_cents/hours, then approve
  → Waive    → status='waived' + waive_reason ("on our dime"); logged in history, balance untouched
  → Void     → status='void', never hits balance (wrong/duplicate entry)

After each approval, evaluate thresholds (§5).
```

**Idempotency:** one `time_entry_id` → at most one debit in {pending, approved, waived} (partial unique index; `void` excluded so a voided entry can be re-created). Re-running handoff sync never double-debits.

---

## 5. Depletion lifecycle (cron + on-posting hooks)

Evaluated (a) synchronously after each approved debit, and (b) by a daily cron sweep as backstop.

```
pct_depleted = lifetime_debited_since_last_credit / current_retainer_size   (or simpler: 1 - balance/high-water)
```

- **≥ notify_pct (75%)** and `last_notified_at` older than this depletion cycle:
  → send client notification (email via Resend + optional SMS via Twilio, honoring kill switches),
     "your retainer is running low," NO invoice. Stamp `last_notified_at`.
- **≥ reup_pct (90%)** and `auto_reup_enabled` and not already drafted this cycle:
  → **auto-DRAFT** replenish invoice (`kind='business'`, status='draft', amount=`reup_target_cents ?? last_credit`),
     link it to the ledger, alert admin (system_notifications / dashboard).
     Admin reviews + sends manually. Stamp `last_reup_drafted_at`.
- **Replenish invoice paid** → webhook/mark-paid creates an **approved credit** → balance restored → thresholds reset (clear `last_notified_at`/`last_reup_drafted_at` for the new cycle).
- **Near completion** → admin flips `auto_reup_enabled=false` and/or lowers `reup_target_cents`; dunning stops.

Reuses existing infra: `system-alerts.ts` (admin notification), Resend `sendEmail()`, `booking-sms.ts`-style dispatch pattern, invoice draft creation (`/api/admin/invoices`).

---

## 6. Admin UI

- **Client detail (`/admin/clients/[id]`)** → **Retainer** panel: current balance (big number), lifetime credited/debited, thresholds (editable), auto-reup toggle, transaction history, "Add funds"/"Manual debit" actions.
- **Pending Debits queue** — new admin view (or panel on client/project): list of `pending` debits with hours/amount/source, Approve / Edit / Void per row, bulk-approve.
- **Project detail (`/admin/projects/[id]`)** → allocation card: earmark vs. spent for this project; per-project burn.
- **SOW builder (`/admin/sow/new`, `/admin/sow/[id]`)** → per-phase `pricing_mode` toggle (`itemized` / `scope_only` + hours range); doc-level `engagement_type` (`fixed_scope` / `retainer`) + opening retainer amount + hours NTE.

## 7. Public / PDF render

- SOW PDF (`src/lib/pdf/sow.ts`) + preview (`doc-preview.ts`) + public page (`/sow/[number]/[uuid]`):
  - `scope_only` phase → phase header shows `± X–Y hrs`, deliverables as bullet list, **no price table**.
  - `retainer` engagement → pricing block shows "Retainer: $X,XXX on account · ± Y–Z hrs NTE" + terms language ("all work drawn from retainer; replenished as needed").
- `itemized` phases + `fixed_scope` engagements → **completely unchanged** (zero regression risk to existing SOWs).

## 8. Build order (commits)

1. **Migration 059** + APPLY wrapper (web-editor-safe, inlined per §12 lesson): **2 tables** (`retainer_ledgers`, `retainer_transactions`) + SOW doc columns (`engagement_type`, `retainer_initial_cents`, `retainer_hours_low/high`) + indexes + partial unique on `time_entry_id`. **Hunter applies.**
2. **Types** — `retainer-types.ts` + extend `SowPhase`/`SowDocument` in `invoice-types.ts`.
3. **Ledger lib** — `retainer-ledger.ts`: `getOrCreateLedger`, `postTransaction`, `approveDebit`, `voidTransaction`, `recomputeBalance`, `evaluateThresholds`. Pure functions + Supabase writes, compensating rollback per R2 pattern.
4. **Handoff hook** — extend time-entry insert path to accrue pending debits.
5. **Admin APIs** — pending-debits list/approve/void, ledger CRUD, thresholds, manual credit/debit.
6. **Admin UI** — client retainer panel, pending-debits queue, project allocation card.
7. **SOW builder UI** — pricing_mode + engagement_type controls.
8. **PDF/preview render** — scope_only + retainer treatments.
9. **Threshold automation** — on-posting eval + daily cron + replenish-invoice draft + paid→credit hook.
10. **Verification script** — `scripts/verify-retainer-ledger.mjs` (credit → debit → approve → threshold → reup-draft → paid → credit → balance asserts).

Each step: `npm run build` clean before commit. Push via GCM (works).

## 9. Verification (must all pass)

- Balance cache == `SUM(approved credits) − SUM(approved debits)` after every posting.
- A pending debit never moves the balance; approving it does; voiding an approved one restores it.
- One `time_entry_id` cannot produce two live debits (idempotent handoff).
- 75% → exactly one client notification per depletion cycle (dedup).
- 90% → exactly one draft replenish invoice per cycle; never auto-sent.
- Replenish paid → approved credit → thresholds reset.
- Existing itemized/fixed_scope SOWs render byte-identically (regression guard).

## 10. Resolved (Hunter 2026-07-16) + remaining review-gate items

**Resolved:**
- **Balance scope** → per-client pool, **no per-project earmarks** (allocations table dropped). ✓
- **LLM debits** → tokens draw down (hours + LLM billable both debit). ✓
- **Waivers** → admin can mark a debit `waived` ("on our dime"): logged, not charged. NEW state added to model. ✓
- **Opt-in fallback** → no ledger = today's behavior, unchanged. ✓

**Remaining (non-blocking defaults; override at review):**
1. Thresholds **75% notify / 90% re-up** as platform defaults, per-client overridable. → assumed yes.
2. Replenish invoice `kind` — reuse existing `business` kind vs. add `retainer_replenish` for cleaner reporting. → **assumed reuse `business`** with `category_hint='service_revenue'`; revisit if reporting needs the split.
3. Waived debits — should they still show on the client-facing history (portal), or admin-only? → **assumed admin-only** (client sees charges + balance, not our internal write-offs). Confirm.
