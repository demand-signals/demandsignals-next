# Quote Fix Pass — Design

**Date:** 2026-04-28
**Status:** approved, going straight to implementation
**Trigger:** Hunter ran `/quote` end-to-end (4th time) and it produced a broken conversation: repeated intro question, dead-end after phone unlock, fabricated pain points, single-value prices instead of ranges, terminal CTA reached without email or booking.

---

## Problems being fixed

1. **Repeated intro question.** When prospect answers "Demand Signals in El Dorado Hills" on turn 1, the AI extracts business_name but ignores location, then asks for business_name AGAIN. Wasted turn, looks broken.
2. **Same intro every time.** Identical opener fires on every quote session — feels canned.
3. **Asking for title.** Title is dead weight in the question flow. Skip.
4. **Question order doesn't match the actual scope build.** Should be Name → Company → Locations → (if website) Site Type → Page Count → APIs → Long-Tail → Social/Add-ons.
5. **"Ongoing Management after launch" appears as a quote line item.** It shouldn't — retainer is its own separate step (Essential/Growth/Full/Site-only). Inside the build quote, ongoing management is double-counting.
6. **Phone unlock dead-ends.** AI says "Let me walk you through the numbers." Then nothing happens. Prospect waits, types "walk me through it," AI redirects with a fabricated pain-point question.
7. **Single-value prices.** Every line item and total is one number. Should be a low–high range — that's how budgetary estimates actually work.
8. **AI fabricates pain points.** "Prospects landing on the site and just… not converting" was invented. Prospect rejected it. AI doubled down. Prospect rage-quit.
9. **No close-the-loop on rage-quit or terminal.** No email captured, no meeting booked, no follow-up path. The session ended with "your plan is saved" and zero contact info beyond the phone number.

---

## Fixes

### 1. Question order (locked)

```
Name → Company → Locations → (skip title) →
  if website: Site Type → Core Page Count → API Connections → Long-Tail → Social & Add-ons
```

Title is removed entirely from the slot list. Locations comes before any service questions because it drives long-tail page math.

### 2. Intro rotation (5 variants)

Random selection per session, persisted on `quote_sessions.intro_variant` so refreshes don't reroll.

1. "Hey — happy to help you rough out what your project could look like. Let's start with the basics — what's your business name and where are you located?"
2. "Welcome in. Quickest way to get you a budgetary range is to start with two things: business name and city you're in. What've you got?"
3. "Hey there. I'll walk you through a budgetary scope in a few minutes — first, what's the business and where's it based?"
4. "Glad you stopped by. To frame this up, tell me the business name and your location and we'll go from there."
5. "Alright, let's build you a rough number. Business name and city to kick it off?"

All 5 ask for **both** business name and location in the opener. The pre-parser (next item) handles single-utterance answers.

### 3. Single-utterance pre-parser

Before the AI sees the first user message, run deterministic regex extraction:

- **Pattern A:** `<name> in <location>` (case-insensitive)
- **Pattern B:** `<name>, <location>`
- **Pattern C:** `<name> located in <location>`
- **Pattern D:** city-only or business-only (fall through to AI)

If A/B/C matches, write `business_name` AND `location` to session in one pass, advance to the next unanswered slot. AI never sees the duplicate-question opportunity.

Implementation: `src/lib/quote-intro-parser.ts` exports `extractNameAndLocation(text: string): { businessName?: string; location?: string }`. Called from the chat route handler before invoking the AI when `business_name` is unset.

### 4. Remove "Ongoing Management after launch" from quote scope

Strip from:
- `quote-tools.ts` — scope item enum and tool definitions
- `quote-ai.ts` — system prompt scope list
- `QuoteSummaryPane.tsx` — line-item rendering (defensive: if any legacy session has it, hide)
- EST PDF renderer

Retainer remains its own dedicated step after scope is locked. No double-counting.

### 5. Phone unlock advances, doesn't dead-end

Replace the literal string "Let me walk you through the numbers." in `quote-ai.ts` system prompt with directive:

> When phone is verified, do NOT promise a walkthrough. Acknowledge the unlock in one short sentence ("Numbers are unlocked.") then immediately ask the next unanswered scope question, OR if scope is complete, move to email capture for the budgetary PDF.

### 6. Price ranges (±30%)

Every dollar value renders as `${low.toLocaleString()}–${high.toLocaleString()}` where `low = round(value * 0.7)` and `high = round(value * 1.3)`.

Applied at:
- `QuoteSummaryPane.tsx` — line item prices + total
- Scope summary text the AI generates (system prompt directive: "Always quote prices as ranges, never single numbers. Use ±30%.")
- EST PDF renderer (line items + total)
- Retainer plan tiles (already ranges in some places; standardize)

New helper: `src/lib/price-range.ts` exports `formatPriceRange(cents: number, spread: number = 0.3): string`.

### 7. Close-the-loop before terminal

Before any goodbye message — including rage-quit — AI MUST run this sequence:

1. **If email not captured:** ask for it ("Want me to email you the rough numbers so you have them?")
2. **If email captured + booking not made:** call `offer_meeting_slots` (15-min intro)
3. **If prospect declines slots:** confirm save + send PDF link to email + end gracefully

Rage-quit detection (existing `detect_walkaway` tool) does NOT skip the loop. It softens the language: "Before you go, want me to email you the numbers?" → if yes, capture email, send PDF, then optionally offer slot. The hard goodbye only fires if prospect declines email AND declines slot.

System prompt addition:

> NEVER end a session without attempting email capture first. If email is captured but no meeting is booked, offer two slots via offer_meeting_slots before saying goodbye. The only acceptable terminal state without email is if the prospect explicitly refuses email twice.

### 8. No fabricated pain points

System prompt addition:

> You may NOT assert specific prospect pain points (e.g., "prospects landing on your site and not converting") unless the prospect has explicitly described that pain. Site-quality observations must come from research data only — page speed, schema presence, mobile responsiveness, etc. (objective facts). Speculation about prospect behavior, conversion rates, or psychology is forbidden. If the prospect rejects an assumption, apologize once and pivot to asking what the actual pain is — do not double down.

### 9. Single-value vs range applies to "math out the project pays for itself"

Existing logic computes monthly recovered revenue as a single number. Update to range: `25%-capture × ($2K–$5K retainer × 10 leads) = $5K–$12.5K/month recovered`. Annualized: `$60K–$150K/year`. AI must present the range, never a fake-precision midpoint.

---

## Files touched

| File | Change |
|---|---|
| `src/lib/quote-ai.ts` | System prompt: 5 intro variants reference, anti-fabrication rule, range-only pricing rule, close-the-loop rule, phone-unlock language fix |
| `src/lib/quote-tools.ts` | Remove "Ongoing Management" scope item; remove `capture_title` if it exists; reorder slot list |
| `src/lib/quote-intro-parser.ts` | NEW — deterministic name+location extractor |
| `src/lib/price-range.ts` | NEW — `formatPriceRange()` helper |
| `src/app/api/quote/chat/route.ts` (or equivalent) | Wire pre-parser before AI call on first user turn |
| `src/components/quote/QuoteSummaryPane.tsx` | Render line items + totals as ranges; hide legacy "Ongoing Management" |
| `src/lib/pdf/quote-est.ts` (or equivalent) | EST PDF renders ranges |
| Migration `036_quote_intro_variant.sql` | Add `quote_sessions.intro_variant smallint` (1–5), default null, set on first turn |

---

## Out of scope

- Public `/book` page (still deferred per CLAUDE.md §11).
- Retainer plan UX changes — only the build-quote scope is in scope here.
- Rewriting research observations themselves — only the AI's freedom to speculate beyond research data is constrained.

---

## Verification

After deploy, run a fresh `/quote` session in incognito:

1. Open URL, expect one of 5 intros.
2. Type "Acme Plumbing in Folsom" → AI must NOT re-ask for business name. Must advance to the next slot.
3. Refuse to answer title → AI must not ask for title.
4. Verbal confirmation that quote line items render as ranges.
5. Refuse phone unlock once, then provide it → AI must NOT say "let me walk you through the numbers" — must advance to next scope question.
6. Reject an AI assumption ("not at all") → AI must apologize and pivot, not double down.
7. Type "I'm out of here" → AI must attempt email capture before saying goodbye.
8. After email captured, AI must offer two meeting slots.
9. Decline slots → AI sends PDF + ends gracefully.

If all 9 pass, fix is live.
