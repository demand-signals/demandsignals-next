# Client SMS Notifications — SOW / Milestone / Invoice / Receipt — Stub Spec

**Status:** stub — full brainstorm pending
**Date reserved:** 2026-04-27
**Project:** Sequel after Project #3 (portal messaging). Per Hunter's 2026-04-27 directive: don't forget this.
**Triggered when:** Project #3 ships AND there's a felt need to notify clients via SMS on key lifecycle events (currently only email-based).

---

## 1. Problem (preview)

Today, every client lifecycle event sends an email:
- SOW issued → email to client with magic link to `/sow/[number]/[uuid]`
- Project milestone hit (phase complete, deliverable delivered) → no notification today
- Invoice issued → email to client with magic link to `/invoice/[number]/[uuid]`
- Receipt issued → email to client with magic link to `/receipt/[number]/[uuid]`
- Payment plan installment fired → email with new invoice link

Email is the canonical channel but has lag (open rates, threading, spam folder risk). SMS would massively reduce time-to-acknowledge for high-stakes events. Hunter has Twilio already wired for admin SMS (Project #1).

---

## 2. Locked-in decisions inherited from prior projects

| Decision | Source | Detail |
|---|---|---|
| SMS provider | Project #1 era | Twilio. `sendSms()` helper at `src/lib/twilio-sms.ts`. |
| Kill switch | Quote infra | `quote_config.sms_delivery_enabled` (JSONB boolean — see §12 of CLAUDE.md re: native vs string boolean). |
| Test mode | Existing | `SMS_TEST_MODE` env var + allowlist; failures `notify('warning','contact_sms')`. |
| Phone storage | Existing | `prospects.owner_phone` and/or `prospects.business_phone`. Need to confirm which is canonical for SMS dispatch to clients. |
| Notification log | #1 | `system_notifications` for failures. SMS engagement tracking would need a new table or extension to `email_engagement` (rename to `message_engagement`?). |
| Magic-link pages | #1 | `/sow/[number]/[uuid]`, `/invoice/[number]/[uuid]`, `/receipt/[number]/[uuid]` already track via `page_visits`. SMS-driven visits should attribute via the same UUID path. |

---

## 3. Open questions (resolve at brainstorm time)

1. **Opt-in / opt-out** — TCPA compliance. Clients must explicitly consent to receive SMS. Where does consent live?
   - New `prospects.sms_consent boolean` + `prospects.sms_consent_at timestamptz`?
   - Captured at SOW acceptance? Quote sessions? Separate opt-in page?
   - STOP / HELP keyword handling via Twilio inbound webhook?
2. **Per-event toggles** — does the client want SMS for ALL events, or just some? Per-prospect preferences:
   - `prospects.sms_prefs jsonb` with keys like `sow_issued`, `invoice_issued`, `milestone_complete`, `receipt_issued`?
   - Default to all on after consent?
3. **Message templates** — short, link-included. Do we use a dedicated short-link domain (e.g., `dsg.co/abc123`) or full magic-link URL in SMS? (Twilio cost is per-segment; long URLs split messages.)
4. **From-number strategy** — single Twilio number, or per-client?
5. **Quiet hours** — don't send 9PM–8AM client-local time? Need timezone on `prospects` (we have city/state — derive via timezone API).
6. **Engagement tracking** — does SMS click-through populate `page_visits` with a new attribution_source `sms`? (Probably yes — consistent with the unified attribution model.)
7. **What events fire SMS?** Final list:
   - SOW issued ✓ (high priority)
   - SOW signed (to admin AND client confirmation)?
   - Invoice issued ✓
   - Invoice paid (receipt issued) ✓
   - Payment installment fired ✓ (re-uses invoice path)
   - Phase started?
   - Phase completed?
   - Deliverable delivered?
   - Project complete?
8. **Failure handling** — same `notify('warning')` pattern as Project #1 admin SMS? Should client SMS failures be more severe (since it's customer-facing)?
9. **Duplication risk** — if email + SMS both go out, the client gets two notifications. Acceptable, or do we suppress email when SMS is configured?
10. **Cost ceiling** — Twilio cost per message. Need budget guardrail.

---

## 4. Probable file additions (preview)

```
src/lib/client-sms.ts                            — sendClientSms() with kind dispatch + consent check + quiet hours
src/lib/sms-consent.ts                           — opt-in / opt-out / STOP keyword handling
src/lib/sms-templates.ts                         — per-event message bodies
src/app/api/webhooks/twilio-inbound/route.ts     — STOP/HELP keyword handler
supabase/migrations/0XXa_sms_consent.sql         — sms_consent, sms_consent_at, sms_prefs columns on prospects
supabase/migrations/0XXb_message_engagement.sql  — extend or rename email_engagement to cover SMS
```

---

## 5. Dependencies

- Project #1 must be in production (✅).
- Project #2 must be in production (pending).
- Project #3 should be in production (probably — gives us the threading + reply infrastructure SMS responses might need).
- TCPA compliance review with legal-spec skill before launch.

---

## 6. Estimate

Roughly 4–5 days after #3:
- 1 day: consent model + opt-in flow
- 1 day: per-event SMS dispatch wiring (SOW accept route, invoice issued, etc.)
- 1 day: STOP/HELP/quiet-hours/timezone handling
- 1 day: testing + Twilio config + TCPA review
- 0.5 day: deployment + observability

---

## 7. Status

**Do not start until Project #3 is shipped.** This stub exists to:
1. Reserve the spec file.
2. Capture upstream decisions.
3. Enumerate open questions (especially TCPA consent — this is the biggest unknown).
4. Prevent the work from being forgotten (per Hunter's 2026-04-27 directive).

When ready: invoke `superpowers:brainstorming` skill with this stub as context.
