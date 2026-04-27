# Portal Messaging — Two-Way Client Comms — Stub Spec

**Status:** stub — full brainstorm pending after Project #2 (quick inquiry form) ships
**Date reserved:** 2026-04-27
**Project:** #3 of 3 in the email/messaging sequence (#1 Resend swap → #2 quick inquiry form → **this spec**)
**Triggered when:** Project #2 is in production AND the manual reply friction (admin replying from gmail instead of inside `/admin/inquiries/[id]`) becomes a felt pain point. Per Hunter's note 2026-04-27, this should follow #2 immediately — typical 1-week project assuming #2's data model is in place.

---

## 1. Problem (preview)

After Project #2 ships, every inbound inquiry lands in `prospect_inquiries` with full attribution and notification fan-out. Replying still happens **outside the system** (admin opens gmail, types, sends). That breaks the loop:

1. No record of the reply in `prospect_inquiries.responded_at`.
2. Inbound replies from the prospect to that gmail thread are not parsed back into the system.
3. No threading. The conversation lives in gmail, not in DSIG.
4. No way for a client to message the team via a logged-in portal experience post-contract.

Project #3 closes the loop with a portal messaging system: admin replies from inside `/admin/inquiries/[id]`, inbound replies are parsed via Resend's inbound webhook into new `prospect_inquiries` rows of source `portal_reply`, and post-contract clients get a magic-link or password-protected portal at `[client-code].demandsignals.co/messages` (TBD: subdomain vs. apex path) for two-way comms.

---

## 2. Locked-in decisions inherited from Projects #1 and #2

These are already committed by upstream specs and do NOT need re-brainstorming:

| Decision | Source | Detail |
|---|---|---|
| Single inquiries table | #2 | All inbound (quick form, contact form, portal reply) lands in `prospect_inquiries`. #3 writes rows of `source='portal_reply'`. |
| Email engagement tracking | #1 | Outbound replies use `sendEmail()` and surface in `email_engagement` automatically. #3 just calls `sendEmail()`. |
| Email transport | #1 | Resend with SMTP fallback. Inbound parsing uses Resend's inbound webhook (`/api/webhooks/resend-inbound` or extended `/api/webhooks/resend`). |
| Attribution model | #1, #2 | `dsig_attr` cookie + `prospects.id` is the canonical identity. Portal auth must reconcile with these. |
| `prospect_inquiries.responded_at` | #2 | Field exists. #3 flips it when a reply is sent (vs. #2's manual click). |
| `prospect_inquiries.email_send_id` | #2 | Soft FK to `email_engagement.id`. #3 uses this for In-Reply-To threading. |
| Reply button on inquiry detail | #2 | Currently `mailto:`. #3 swaps to portal compose route. UI layout already reserves space below message body for thread. |
| Client identity | #1, prior | `prospects.is_client = true`, `prospects.client_code = 'XXXX'`. Portal scopes to client_code. |
| Domain pattern for clients | §18 | Decision pending: `messages.demandsignals.co/[client-code]` apex path vs. `[client-code].portal.demandsignals.co` subdomain. Cookie scoping rules apply (admin cookies must NOT leak into client portal). |

---

## 3. Open questions (resolve at brainstorm time)

1. **Threading model** — flat `prospect_inquiries` rows linked by `parent_id`, OR new `inquiry_threads` table with conversation-level metadata (subject, last_message_at, participant_count)?
2. **Portal auth** — magic-link only, or magic-link + password option for repeat clients?
3. **Cookie scope** — separate cookie name for portal sessions (`dsig_portal`) to avoid mixing with admin (`dsig_admin`) and attribution (`dsig_attr`)?
4. **Inbound webhook signature verification** — Resend already supports Svix; same handler or separate?
5. **Reply-to address strategy** — single `replies@demandsignals.co` (Resend inbound parses + dispatches to thread by `In-Reply-To` header), OR per-thread plus addressing (`replies+abc123@demandsignals.co`)?
6. **What about inquiries from non-clients?** Quick-form / contact-form submissions come from people who don't have a `client_code` yet. Do they get a portal? (Probably not — they get admin-side replies via email; portal is for `is_client=true` only.)
7. **Mobile** — is portal messaging part of a future client mobile app, or web-only?
8. **Notifications to clients** on new admin replies — email + SMS? Same throttling rules as #1's system_notifications?

---

## 4. Probable file additions (preview)

```
src/lib/portal-auth.ts                           — magic-link issuance + cookie management
src/lib/inquiry-threading.ts                     — In-Reply-To header generation, thread resolution
src/app/api/webhooks/resend-inbound/route.ts     — inbound email parsing (or extended /resend)
src/app/api/admin/inquiries/[id]/reply/route.ts  — admin compose
src/app/portal/login/page.tsx                    — magic-link request
src/app/portal/auth/callback/route.ts            — magic-link verify
src/app/portal/messages/page.tsx                 — client thread list
src/app/portal/messages/[thread_id]/page.tsx     — single thread view + reply
supabase/migrations/030a_inquiry_threads.sql     — IF threading model decision adds a new table
supabase/migrations/030b_portal_sessions.sql     — portal session storage
```

---

## 5. Dependencies

- Project #1 must be in production (✅ — shipped 2026-04-27).
- Project #2 must be in production (pending — implementation plan to follow this stub).
- `ATTRIBUTION_COOKIE_SECRET` env var present (✅ — shipped #1).
- Resend inbound configured at Cloudflare (currently only outbound is configured; inbound MX → Resend or split: gmail keeps inbound for now and Resend handles only outbound replies).

---

## 6. Estimate

Roughly 1 week of work after #2 lands:

- 1 day: threading data model + migration
- 1 day: inbound webhook + parsing
- 2 days: admin compose UI + send pipeline
- 2 days: client portal auth + messaging UI
- 1 day: testing, edge cases, deployment

---

## 7. Status

**Do not start until Project #2 is shipped and in production.** This stub exists to:
1. Reserve the spec file so it shows up in `ls docs/superpowers/specs/`.
2. Capture decisions already locked by upstream specs.
3. Enumerate open questions for the eventual brainstorm session.
4. Prevent the work from being forgotten (per Hunter's 2026-04-27 directive).

When ready: invoke `superpowers:brainstorming` skill with this stub as context.
