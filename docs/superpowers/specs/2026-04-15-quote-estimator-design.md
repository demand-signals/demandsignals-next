# DSIG AI Quote Estimator — Design Specification

**Date:** 2026-04-15
**Status:** Draft
**Route:** `/quote`
**Codename:** AI Sales Engineer

---

## 1. Overview

An AI-powered budgetary estimator at `/quote` that guides prospects through building a custom project scope. The AI leads with business discovery and benefits, not pricing. Prospects provide their cell phone to unlock budgetary ranges — this simultaneously captures the lead, enables magic-link session continuity, and protects pricing from competitor scraping.

**Core principle:** Human-led strategy, AI-powered execution. DSIG isn't cheap — DSIG is efficient. AI multiplies human expertise 10x, and the client gets premium output at a fraction of traditional agency cost.

**What this is NOT:**
- Not a discount calculator (no "you save X%" framing)
- Not a competitor comparison tool (no crossed-out competitor prices)
- Not an instant checkout (estimates are budgetary ranges, not fixed quotes)

---

## 2. Page Structure

### Route & Navigation
- **URL:** `/quote`
- **Header CTA:** "Get a Quote" button points here (replaces current `/contact` target)
- **Additional CTAs:** "Let's Get Started" buttons on service pages link here
- **SEO:** `noindex` — this is a conversion tool, not a landing page

### Layout

**Desktop (>1024px):** Two-column split
- Left column (60%): AI chat interface
- Right column (40%): Configurator receipt panel (sticky, scrolls with viewport)

**Tablet (768-1024px):** Same two-column, proportions shift to 55/45

**Mobile (<768px):**
- Full-width AI chat
- Sticky bottom bar showing item count + "View Estimate" tap target
- Tap opens configurator as a slide-up drawer (full height)

---

## 3. User Flow

### Entry Points

**Path A — AI-Guided (Default)**
Page loads with AI greeting. The AI drives the conversation. Configurator fills as the conversation progresses.

**Path B — Manual Configurator (Fallback)**
Text link below AI greeting: *"I already know what I need"*
Jumps to full a la carte configurator with all categories expandable. AI watches selections and offers contextual nudges in a slim bottom bar.

### Phase 1 — Discovery (No Prices Visible)

AI opens with warmth and curiosity. Uses SPIN Selling question progression:

**Situation Questions (understand the business):**
1. *"Hey! I'm here to help you figure out what your project might look like. Tell me about your business — what do you do and where are you located?"*
2. *"How are customers finding you right now?"*
3. *"How many locations or service areas do you cover?"*

**Problem Questions (surface the pain):**
4. *"What's the biggest growth challenge you're facing?"*
5. *"Is there anything about your current online presence that's frustrating you?"*

**Implication Questions (make the pain urgent — THE CONVERSION LEVER):**
6. *"How many calls or leads do you think you're missing per month because of that?"*
7. *"What's a typical job worth to your business? / What's your average customer value?"*

The implication question is WHERE THE SALE HAPPENS. When the prospect says "probably 10-15 missed leads a month" and "average job is about $500" — they just told themselves they're losing $5,000-$7,500/month. The AI calculates it live:

> *"So at 10 missed leads a month with a $500 average job — that's roughly $5,000/month in revenue that's going to your competitors right now. That's $60,000 a year."*

Now every dollar in the estimate is measured against $60K/year in lost revenue, not against their checking account. The entire frame shifts.

**Micro-Commitments (sprinkled throughout):**
After each discovery answer, the AI confirms with small yes/no questions:
- *"Got it — so search visibility is the main priority. Does that sound right?"*
- *"Makes sense. Is getting more calls from local searches the main goal?"*

Each "yes" builds a pattern of agreement (Cialdini: Consistency). By the time CTAs appear, they've said yes 5-7 times.

Each answer:
- Builds the prospect profile in real-time
- Informs what the AI will recommend
- Gets logged to Supabase as a quote event
- Feeds the ROI calculator (see section 20)

The configurator panel is visible but empty during this phase — building anticipation. A subtle progress indicator shows "Discovery: Step 2 of 4" to keep momentum.

### Phase 2 — Recommended Build (Benefits-First, Still No Prices)

Based on discovery answers, the AI presents a **pre-populated Recommended Build** — not a blank configurator. This is the Assumptive Approach (Zig Ziglar) + Default Effect (behavioral economics):

> *"Based on what you've told me about {Business Name}, here's what I'd recommend as your starting package:"*

The configurator fills with 5-7 items, already checked, tailored to their answers. The AI walks through each one with the business case:

> *"I've included a React/Next.js site with 8 core pages — that's your home base. Then 24 location-specific landing pages because with 3 cities and 8 services, that's 24x more chances to show up in local search. We built something similar for a contractor in the area — they went from 8 calls a month to 30+ within 90 days."*

**Key behaviors in this phase:**
- **Recommend, don't ask** — "Here's what I'd recommend" not "What would you like?"
- **Social proof per category** — drop a relevant result/case study as each item is explained
- **Future state painting** — describe what their business looks like WITH the solution
- **Removing items is the action** — defaults are checked; prospect removes what they don't want (people keep defaults 70-80% of the time)
- **Phasing built in** — AI proactively says: *"I left off social media for now since your priority is search visibility — we can add that in phase 2 when you're ready."*

As the AI describes each capability, items appear in the configurator showing:
- Item name + quantity
- Benefit description
- Social proof snippet (e.g., "Clients avg 3x organic traffic in 6 months")
- AI-powered badge (e.g., "AI-generated, developer-reviewed")
- Price: locked icon (not yet unlocked)

### Phase 3 — Phone Unlock (The Gate)

**Trigger conditions** (all must be true):
- 2+ discovery questions answered
- 3+ items showing in configurator
- Natural conversation pause

**The ask** (exact phrasing):
> *"If you're comfortable, you can provide your cell to unlock the budgetary estimate as we work. We can also send a magic link so you can pick up the process at any time."*

**If they provide their number:**
1. `POST /api/sms/verify/send` — Twilio sends 6-digit code to their cell
2. Prospect enters code in a clean inline input (not a modal)
3. `POST /api/sms/verify/check` — validates code
4. On success:
   - Prices animate into every configurator line item
   - Magic link texted via Twilio 800#: *"Here's your Demand Signals estimate: {url} — pick it up anytime."*
   - Prospect record created/linked in Supabase
   - Session upgraded to "verified"

**If they decline:**
- AI continues conversation normally
- Configurator keeps building with benefits, no prices
- AI offers again later when more value is on screen (max 2 additional asks, spaced naturally)
- They can still reach the CTAs — "Book a Strategy Call" is always available even without phone

### Phase 4 — Refinement (Prices Visible)

After phone verification, the AI walks through recommendations:
- Prospect can confirm, remove, or adjust quantities
- Each removal/addition updates the running total instantly
- AI explains trade-offs using loss aversion framing (Kahneman): *"Removing the blog automation saves $200-500/mo, but consistent content is what feeds your search rankings — without it, competitors publishing weekly will outrank you over time."*
- More specific answers narrow ranges (see Range Narrowing section)
- The **ROI context** from Phase 1 is always present: *"Remember, we estimated you're leaving about $5,000/month on the table. This entire build pays for itself in the first month."*

**The Contrast Principle (Cialdini):**
The AI shows the full recommended build FIRST (the ideal scope), THEN offers to phase it down. The $5K starting point feels like a smart strategic choice after seeing the $12K full vision — not a compromise.

**Budget constraint handling:**
If prospect says "my budget is $5K":
- AI builds the best possible scope within that range
- Does NOT upsell past it
- Frames phasing as STRATEGY not limitation: *"Smart approach. Here's a strong starting point at $5K that covers your biggest revenue gaps. Once that's generating returns, these are the next services that would compound the results."*

**Need-Payoff Questions (SPIN Selling):**
As the prospect reviews items, the AI asks them to articulate the value:
- *"If you had 24 landing pages instead of 1, and each one could bring in even 2-3 leads a month — what would that mean for your business?"*
- When the PROSPECT says the value out loud, it's 10x more convincing than the AI saying it.

### Phase 4.5 — Verbal Recap (Trial Close)

Before showing CTAs, the AI delivers a full verbal recap — the prospect "hears" their entire project described back. This is the trial close (Sandler):

> *"Here's what we've put together for {Business Name}: a React/Next.js site with 8 core pages as your home base, 24 location-specific landing pages so you show up in every city you serve, local SEO to dominate the Map Pack in Folsom, EDH, and Roseville, AI review responders handling your Google reviews 24/7, and a monthly analytics package so you can see exactly what's working.*
>
> *Your team leads the strategy. AI handles the production. Based on what you told me about your average job value, this could pay for itself within the first month of going live.*
>
> *Ready to make it happen?"*

The prospect nods along to each item. By the time CTAs appear, they've mentally said "yes" to every component.

### Phase 5 — Conversion (Four CTAs + Risk Reversal)

**Risk Reversal (displayed above CTAs):**

> *"Every project starts with a free research report so you can see the quality of our work firsthand. For paid projects, your first milestone is satisfaction-guaranteed — if it doesn't meet your expectations, you owe nothing for that milestone."*

This eliminates the "what if it sucks?" fear (Hormozi: risk reversal is mandatory for high-converting offers). It's honest and realistic — not a blanket money-back guarantee, but a milestone-level safety net.

Running total is finalized. Four actions available, covering every buyer temperature:

1. **"Book a Strategy Call"** (primary) — Opens Google Calendar booking. Estimate summary, selected items, and prospect context are pre-loaded into the booking notes field.

2. **"Send This Estimate"** (secondary) — Pre-fills the `/contact` form with: all selected services, quantities, estimate range, payment preference, business context from AI conversation.

3. **"Let's Get Started"** (hot-intent) — Fast lane for ready-now prospects. Triggers immediate team notification + sends the prospect a "next steps" text with booking link.

4. **"Start With Research"** (any-temperature / zero-cost entry) — For any prospect, regardless of readiness. Offers a free research deliverable that creates the client relationship:

   **Free deliverables (pick one or more):**
   - Market Research Report (valued at $400–$600)
   - Competitor Analysis (valued at $400–$600)
   - Current Site & Social Audit (valued at $300–$500)

   **Free with paid projects:**
   - Comprehensive Project Plan (valued at $800–$1,200 — delivered when a paid project begins)

   The AI frames it naturally:
   > *"Want to see what we can do? Pick a free research report — we'll audit your current site, analyze your competitors, or map your market opportunity. No strings attached, and you'll have data you can use whether you work with us or not."*

   **Phase 1 delivery (MVP):**
   - Phone verification (Checkpoint 1) is sufficient — no OAuth required yet
   - Prospect enters their email at the CTA (stored on `quote_sessions.email`, new column)
   - Admin receives notification: "Research request from {Business Name} — {deliverable}"
   - Research is manually produced and emailed by the team within 24–48 hours (SLA stated to prospect)
   - A lightweight "receipt" PDF is attached showing the real value (e.g., "Competitor Analysis — Valued at $500") with a plain-text "Complimentary, no charge" line
   - The session is marked `conversion_action = 'research'` so the pipeline tracks it
   - No formal invoice record created in Phase 1 (the receipt PDF is generated ad-hoc from a template)

   **Phase 2 upgrade (Restaurant Rule — full experience):**

   Once OAuth and the invoicing system ship in Phase 2, the research CTA graduates to the full experience:

   - Prospect signs in with Google (Checkpoint 2) to create an account
   - Research deliverable is attached to their client portal
   - Every deliverable — free or paid — gets a real invoice. Free items show their full value with a 100% discount applied:

   ```
   +-----------------------------------------------+
   | INVOICE #DSIG-2026-0042                        |
   |                                                |
   | Competitor Analysis              $500.00       |
   | Discount (complimentary)        -$500.00       |
   |                          ──────────────        |
   | Total Due                          $0.00       |
   |                                                |
   | Thank you for choosing Demand Signals.         |
   +-----------------------------------------------+
   ```

   This trains the customer from day one:
   - **Everything we do has value** — they see the real price, even when they don't pay it
   - **We are professional and transparent** — invoices from interaction one
   - **They learn the system** — like a restaurant bill, every item appears whether it's $0 or $5,000
   - **Respect is built** — they understand that what they're getting for free costs real money
   - **Future paid invoices feel natural** — the format is familiar, the relationship is established

   **Why this works (Phase 2):**
   - Zero cost to the prospect — maximum conversion
   - DSIG gets: account created, invoicing relationship started, deep intel on the prospect's business
   - The research naturally reveals gaps that the full build addresses — it's a self-selling funnel
   - The $0 invoice with the real value shown is more powerful than "free" — it communicates competence and generosity simultaneously

   **Dependency note:** The Phase 1 CTA is fully functional end-to-end (lead captured, research delivered, relationship started) without OAuth or the invoice system. Phase 2 adds the portal, the formal invoice, and the account. No CTA copy changes are required between phases — the prospect-facing experience gets richer, not different.

---

## 4. Configurator Panel Design

### Line Item Structure (After Phone Unlock)

```
+---------------------------------------------+
| [checkmark] Long-Tail Landing Pages (24 pg)  |
|  "24x more chances to be found locally"      |
|  [lightning] AI-generated, developer-reviewed |
|  [star] "Clients avg 3x organic traffic"     |
|  $600 - $1,200                               |
|                                      [remove] |
+---------------------------------------------+
```

- **Checkmark** — green when included, toggleable
- **Title + quantity** — what they're getting
- **Benefit line** — one sentence, business outcome language
- **AI badge** — lightning icon + how AI-first delivery makes it better
- **Social proof snippet** — star icon + one-line result from similar clients (see Social Proof Data in section 20)
- **Price range** — budgetary range (no competitor comparison)
- **Remove** — subtle text link

### Line Item Structure (Before Phone Unlock)

Same as above but price line shows a lock icon instead of the range.

### Categories

Grouped by business outcome, not technical category:

1. **Your Website** — base site, pages, design, platform choice
2. **Features & Integrations** — APIs, portals, semantic layers, custom functionality
3. **Get Found** — SEO, long-tail pages, GBP, citations, GEO/AEO
4. **Content & Social** — blogging, social automation, reviews, repurposing
5. **AI & Automation** — workforce automation, agents, outreach, private LLMs
6. **Research & Strategy** — market research, competitor analysis, project plan
7. **Monthly Services** — admin, analytics, Google management
8. **Hosting** — PHP, Node.js, enterprise

### Quick Start Anchor

At the top of the configurator, always visible:

```
+---------------------------------------------+
| [rocket] Quick Start: Ready-Made Single Page |
|  "Your business online today"                |
|  $600 - $1,000 flat + $15-$25/mo hosting    |
|  Updates billed at $40-$60/hr               |
|                                              |
|  [Buy This Now]        [I Want More -->]     |
+---------------------------------------------+
```

"Buy This Now" goes to contact/booking — no estimator needed.
"I Want More" scrolls to the AI chat / full configurator.

This anchors the floor. Everything else builds upward from here.

### Running Total (Sticky Footer)

Always visible at bottom of configurator panel:

```
+---------------------------------------------------+
|  FOLSOM PLUMBING CO.           Accuracy: ~80%  🎯  |
|  Project Estimate                                  |
|                                                    |
|  ( ) Pay Upfront      $5,750 - $7,500             |
|  ( ) Monthly Plan     $680 - $875/mo (12 mo)      |
|                                                    |
|  ROI CONTEXT:                                      |
|  Estimated missed revenue: ~$5,000/mo              |
|  This project could pay for itself in month 1      |
|                                                    |
|  Human-led strategy. AI-powered execution.         |
|  Your dedicated team + the output of ten.          |
|                                                    |
|  "Every project starts with a free research        |
|   report. First milestone satisfaction-guaranteed." |
|                                                    |
|  [Book a Strategy Call]   [Let's Get Started]      |
|  [Send This Estimate]     [Start With Research]    |
+---------------------------------------------------+
```

**Personalization:** The estimate header shows the prospect's business name (once captured in discovery). This creates psychological ownership — it's not an abstract estimate, it's THEIR project. (Dale Carnegie: use their name.)

**ROI Context:** If the prospect provided revenue/lead data during discovery (Phase 1 implication questions), the running total shows the payback calculation. This keeps the "cost of inaction" frame visible throughout.

**Risk Reversal:** The guarantee statement is always visible near the CTAs. Removes fear at the decision point.

**Non-binding disclaimer (always visible in the configurator footer and on shareable URLs):**

> *"Budgetary estimate — not a binding quote. Final scope, pricing, and timeline are confirmed in your Statement of Work."*

This appears in small but readable type below the CTAs, in the body of any SMS containing numbers, at the top of every shareable estimate URL, and on any receipt PDFs generated by the research CTA. The AI's language is designed to stay consistent with this disclaimer (see Section 12 — Non-Commitment directive). This is a legal protection, not marketing copy — do not remove it or soften it at the design level.

Payment toggle recalculates live:
- **Upfront:** lowest total cost
- **Monthly Plan:** 25% deposit + remaining build cost / 12 months + selected monthly services

Small note when monthly is selected: *"Upfront saves you ~$X over the monthly plan."*

### Comparison to Hiring (Always Visible When Monthly > $500)

When the monthly plan exceeds $500/mo, show a subtle comparison:

> *"$680-$875/mo replaces what would cost $4,000-$6,000/mo in marketing staff salary — and AI never calls in sick."*

This leverages DSIG's core positioning ("replaces marketing employees") at the exact moment it matters — when the prospect is evaluating the monthly cost.

---

## 5. Range Narrowing Logic

Ranges start wide and tighten as the prospect provides specifics:

| Detail Level | Example | Range Width |
|-------------|---------|-------------|
| Generic | "I need a website" | Wide (~50% spread) |
| Platform chosen | + "WordPress" | Narrows ~30% |
| Scope defined | + "8 pages, 2 APIs" | Narrows ~50% |
| Context given | + "local plumber, 3 cities" | Narrows ~65% |
| Specific requirements | + "with booking integration" | Narrows ~75-80% |

**Accuracy indicator:** A percentage badge on the running total (e.g., "Accuracy: ~80%") that increases as the range tightens. This gamifies specificity — prospects WANT to give more detail to see the range narrow.

**Implementation:** Each pricing item has a `baseRange` (widest) and an array of `narrowingFactors`. Each factor, when answered, adjusts the range. Factors are cumulative.

---

## 6. Payment Flexibility

### Option 1: Pay Upfront
- Full build cost paid before work begins
- Lowest total cost
- Monthly services billed separately

### Option 2: Monthly Plan
- **Deposit:** 25% of build cost low-end
- **Monthly add-on:** Remaining build cost divided by 12 months
- **Added to:** Any selected monthly services
- **Example:** $5,500 build = $1,375 deposit + $344/mo for 12 months + $200-300/mo services = $544-$644/mo total
- **Note shown:** "Upfront saves you ~$X,XXX over the monthly plan"

The financing adds roughly 10-15% to total cost (the convenience premium is implicit in the monthly total being higher, not an explicit interest rate).

### Option 3: Milestone Plan (Projects > $8,000)
Only shown when build cost exceeds $8,000. Ties payments to deliverables:

- **Milestone 1 — Discovery + Design:** ~25% of build cost (due at kickoff)
- **Milestone 2 — Core Build:** ~35% of build cost (due at design approval)
- **Milestone 3 — Content + SEO:** ~25% of build cost (due at beta launch)
- **Milestone 4 — Launch + Optimization:** ~15% of build cost (due at go-live)
- **Monthly services** begin after launch

Each milestone is individually satisfaction-guaranteed. If a milestone doesn't meet expectations, the prospect owes nothing for that milestone.

**Total cost:** Same as upfront (no premium). The benefit to DSIG: cash flow is spread but tied to work completion. The benefit to the prospect: they only pay as they see results.

---

## 7. Anti-Scraping Architecture

DSIG pricing data must never be publicly accessible:

| Layer | Protection |
|-------|-----------|
| Client-side JS | Zero pricing data in the bundle. `quote-pricing.ts` is server-only. |
| Pricing API | `POST /api/quote/prices` requires valid `session_id` + verified phone |
| Phone verification | Twilio 6-digit SMS code. Real phone, real person. |
| Rate limiting | 3 verification attempts per phone/hr. 10 sessions per IP/day. |
| Session binding | Prices returned only for items in that session's configurator. No bulk access. |
| Watermarking | Each estimate has a unique `share_token`. If pricing leaks, traceable to source. |

---

## 8. SMS & Twilio Integration

Uses existing Twilio 800# with 2FA approval.

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/sms/verify/send` | POST | Send 6-digit verification code |
| `/api/sms/verify/check` | POST | Validate verification code |
| `/api/sms/magic-link` | POST | Send/resend magic link |
| `/api/sms/send` | POST | Send outbound SMS (notifications, follow-ups) |
| `/api/sms/webhook` | POST | Receive inbound SMS from Twilio |
| `/api/sms/status` | GET | Check delivery status |

### Outbound SMS Triggers (Immediate)

| Trigger | Message |
|---------|---------|
| Phone verified | Magic link: *"Here's your Demand Signals estimate for {Business Name}: {url} — pick it up anytime."* |
| Estimate completed | Summary: *"Your estimate for {Business Name}: $X-$Y. Book a call: {booking_url}"* |
| "Let's Get Started" clicked | *"We're on it! Someone from the team will text you shortly."* |
| Demo site paired | *"Your demo site is ready: {demo_url} — here's the estimate: {quote_url}"* |
| Team handoff | *"Connecting you with {name} from our team now."* |

### Multi-Touch Follow-Up Cadence (Abandoned Sessions)

Source: Fanatical Prospecting (Jeb Blount) — single-touch loses, multi-touch wins. Every touch adds VALUE, never desperation.

| Day | Touch | Content |
|-----|-------|---------|
| 1 | SMS | *"Your estimate for {Business Name} is saved and ready: {url}"* |
| 3 | SMS | Value-add: AI-selected blog post or industry insight matched to their business type. *"Thought you might find this useful — {article_title}: {link}"* |
| 7 | SMS | Social proof: *"Quick update — we just finished a project similar to yours. {result_snippet}. Your estimate is still ready: {url}"* |
| 14 | SMS | Gentle check-in: *"Still thinking about {Business Name}'s project? Reply anytime with questions — happy to help. {url}"* |
| 30 | SMS | *"Just checking in one last time. Your estimate will stay saved whenever you're ready: {url}. No pressure — we're here when the time is right."* |
| 45 | SMS (final — Name Your Price) | *"If you're still interested in any part of the scope we discussed, you can submit what you're comfortable investing and we'll see what we can make work: {bid_url}"* |

**Rules:**
- Cadence STOPS immediately if prospect resumes session, books a call, or replies "stop"
- Each message is personalized with business name and contextual content
- Day 3 and Day 7 content is AI-generated, matched to their industry/situation from discovery data
- All touches respect Twilio opt-out compliance (STOP to unsubscribe)
- Admin portal shows cadence status per prospect: which touch they're on, last interaction

### Exit Intent Recovery (Phone-Verified Sessions Only)

When a verified prospect disengages mid-session (detected via 5+ minutes of inactivity after active engagement), send a proactive text:

> *"I noticed you stepped away — your estimate for {Business Name} is saved right where you left it: {url}. Come back anytime."*

Only triggered once per session. Not triggered if they completed the estimate or clicked a CTA.

### Two-Way SMS

Inbound replies are routed to:
1. **AI** — if it's a question the AI can handle
2. **Admin portal** — logged as activity on prospect record, notification to team
3. **Human fallback** — if AI can't handle: *"Great question — connecting you with our team."*

### Magic Link

`/quote/s/{share_token}` — reconstructs the full configurator with:
- All selected items and quantities
- AI conversation history
- Running total and payment preference
- Full prospect context

Works on any device. Link never expires. Session always resumable.

---

## 9. Live Team Handoff

### Silent Availability Check

The AI silently pings the team when hot signals are detected. If a team member is available, the prospect is offered a live handoff. If not, nothing happens — the prospect never knows.

### Hot Signal Triggers (ANY of these)

- Phone verified + 5+ items in configurator
- Prospect asks urgency questions ("how fast can we start?")
- Prospect clicks "Let's Get Started"
- Estimate exceeds $10,000

### Flow

1. Hot signal detected
2. `POST /api/sms/send` to on-duty team member(s): *"Hot prospect on /quote: {business_name}, estimate $X-$Y. Reply YES to connect."*
3. **Team replies YES within 60 seconds:**
   - AI to prospect: *"I just checked and our team is online right now — would you like to continue with a person?"*
   - If prospect says yes: chat transitions to human. Team member sees full transcript + configurator + profile in admin portal.
   - Prospect sees: *"Connecting you with {name} from our team."*
4. **No reply within 60 seconds:**
   - Nothing happens. Prospect continues with AI. No indication the check occurred.

### Admin Portal — Live Queue

Dashboard shows active quote sessions with hot signals:
- Business name, estimate range, items selected, time on page
- "Join Chat" button to manually jump into any active session
- Real-time updates as sessions progress

---

## 10. Data Model

### Global Conventions

**Money storage:** All monetary columns are stored as **integers in cents (USD)**. A $5,500 estimate is stored as `550000`. Display formatting (dollar signs, thousands separators, range formatting) happens at the render layer. Never store money as decimal/float/numeric — always integer cents.

**Timestamps:** All `timestamptz` columns stored in UTC. Client-side rendering converts to user's local time.

**Identifiers:** All primary keys are `uuid v4` generated by Postgres (`gen_random_uuid()`). Session tokens and share tokens are cryptographically random 32-byte URL-safe strings generated server-side.

**JSON columns:** All `jsonb` columns have a documented shape in the relevant section. Schema drift is prevented by Zod validation at the API layer before insert/update.

**Nullability:** Fields captured progressively through the flow are `nullable` — they fill in as the prospect provides information. A session with only `session_token` + `created_at` is valid (anonymous visitor hasn't started the conversation yet).

### New Table: `quote_sessions`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid PK | Session identifier |
| `prospect_id` | uuid FK (nullable) | Links to prospects table when identified |
| `session_token` | text unique | Anonymous session ID |
| `share_token` | text unique | For shareable URLs `/quote/s/{token}` |
| `phone` | text (nullable) | Cell number (after verification) |
| `phone_verified` | boolean default false | Verification status |
| `email` | text (nullable) | Email address (captured at research CTA or OAuth) |
| `email_verified` | boolean default false | True after OAuth or email link click |
| `business_name` | text (nullable) | From AI discovery |
| `business_type` | text (nullable) | Industry/category |
| `business_location` | text (nullable) | Primary location |
| `location_count` | int (nullable) | Number of service areas |
| `service_count` | int (nullable) | Number of services they offer |
| `growth_challenge` | text (nullable) | Primary challenge from discovery |
| `discovery_answers` | jsonb | All discovery Q&A pairs |
| `conversation_summary` | jsonb (nullable) | AI-generated summary when context exceeds 30K tokens (see Section 22.1) |
| `total_tokens_used` | int default 0 | Running Claude API token count for this session |
| `last_ai_request_at` | timestamptz (nullable) | For rate limiting (messages-per-minute) |
| `selected_items` | jsonb | Array of {id, quantity, narrowing_answers} |
| `estimate_low` | int (nullable) | Current low-end estimate (cents) |
| `estimate_high` | int (nullable) | Current high-end estimate (cents) |
| `monthly_low` | int (nullable) | Monthly plan low-end (cents) |
| `monthly_high` | int (nullable) | Monthly plan high-end (cents) |
| `payment_preference` | text (nullable) | 'upfront' or 'monthly' |
| `accuracy_pct` | int default 50 | Range accuracy (50-95%) |
| `budget_signal` | text (nullable) | 'starter' / 'growth' / 'scale' / 'enterprise' |
| `conversion_action` | text (nullable) | 'booked_call' / 'sent_estimate' / 'lets_go' / 'bought_single' / 'research' / 'bid_submitted' / 'bid_accepted' / 'abandoned' |
| `existing_site_url` | text (nullable) | Prospect's current website URL |
| `build_path` | text (nullable) | 'new' / 'existing' / 'rebuild' |
| `bid_amount` | int (nullable) | Name Your Price bid (cents) |
| `bid_notes` | text (nullable) | Prospect's notes on their bid |
| `bid_status` | text (nullable) | 'pending' / 'accepted' / 'countered' / 'declined' |
| `referral_source` | text (nullable) | 'google' / 'social' / 'referral' / 'blog' / 'ad' / 'word_of_mouth' / 'other' |
| `referral_name` | text (nullable) | Name of referring person/client (if referral) |
| `preferred_channel` | text default 'sms' | 'sms' / 'email' / 'both' |
| `timeline_weeks_low` | int (nullable) | Calculated project timeline low-end |
| `timeline_weeks_high` | int (nullable) | Calculated project timeline high-end |
| `missed_leads_monthly` | int (nullable) | Prospect-stated missed leads/mo (for ROI calc) |
| `avg_customer_value` | int (nullable) | Prospect-stated average job value (cents) |
| `monthly_lost_revenue` | int (nullable) | Calculated: missed_leads × avg_value (cents) |
| `comparison_packages` | jsonb (nullable) | Saved Good/Better/Best comparison if generated |
| `handoff_offered` | boolean default false | Was live handoff offered? |
| `handoff_accepted` | boolean default false | Did prospect accept handoff? |
| `handoff_agent` | text (nullable) | Team member who took handoff |
| `referrer` | text (nullable) | Where they came from |
| `utm_source` | text (nullable) | UTM source parameter |
| `utm_medium` | text (nullable) | UTM medium parameter |
| `utm_campaign` | text (nullable) | UTM campaign parameter |
| `device` | text (nullable) | 'desktop' / 'mobile' / 'tablet' |
| `user_agent` | text (nullable) | Full browser user agent string |
| `ip_address` | text (nullable) | Hashed or raw IP |
| `geolocation` | jsonb (nullable) | {lat, lng, city, region, country} from browser API or IP |
| `screen_resolution` | text (nullable) | e.g., '1920x1080' |
| `browser_language` | text (nullable) | e.g., 'en-US' |
| `oauth_provider` | text (nullable) | 'google' (Checkpoint 2) |
| `oauth_email` | text (nullable) | Google account email |
| `oauth_name` | text (nullable) | Google profile name |
| `oauth_avatar` | text (nullable) | Google profile picture URL |
| `oauth_at` | timestamptz (nullable) | When they authenticated |
| `created_at` | timestamptz | Session start |
| `updated_at` | timestamptz | Last interaction |

### New Table: `quote_events`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid PK | Event identifier |
| `session_id` | uuid FK | Links to quote_sessions |
| `event_type` | text | See event types below |
| `event_data` | jsonb | Event-specific payload |
| `created_at` | timestamptz | When it happened |

**Event types:**
- `ai_message` — AI sent a message (data: {text})
- `user_message` — Prospect sent a message (data: {text})
- `item_added` — Item added to configurator (data: {item_id, quantity})
- `item_removed` — Item removed (data: {item_id})
- `item_adjusted` — Quantity or narrowing changed (data: {item_id, changes})
- `phone_submitted` — Phone number provided (data: {phone})
- `phone_verified` — Verification code confirmed
- `magic_link_sent` — Magic link texted
- `magic_link_opened` — Prospect opened magic link
- `estimate_viewed` — Prices unlocked and viewed
- `payment_toggled` — Switched between upfront/monthly (data: {preference})
- `cta_clicked` — CTA button clicked (data: {cta: 'book'|'send'|'start'|'buy_single'})
- `handoff_triggered` — Team ping sent
- `handoff_accepted` — Team member responded YES
- `handoff_connected` — Prospect accepted human chat
- `sms_inbound` — Prospect texted in (data: {text})
- `sms_outbound` — System texted prospect (data: {text, trigger})
- `session_resumed` — Returned via magic link (data: {device})
- `session_abandoned` — 30min inactivity after phone verification
- `bid_submitted` — Name Your Price bid (data: {amount, notes})
- `bid_accepted` — Admin accepted bid
- `bid_countered` — Admin countered with reduced scope (data: {revised_items, revised_estimate})
- `bid_declined` — Admin declined bid
- `existing_site_scanned` — URL quick-scan performed (data: {url, findings})
- `discovery_fork` — New build vs existing site decision (data: {path: 'new'|'existing'|'rebuild'})

### New Table: `quote_messages`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid PK | Message identifier |
| `session_id` | uuid FK | Links to quote_sessions |
| `role` | text | 'ai' / 'user' / 'human_agent' |
| `content` | text | Message text |
| `channel` | text | 'web' / 'sms' |
| `created_at` | timestamptz | When sent |

Separate from events for efficient transcript rendering and Claude API context building.

### Identity Resolution — Two Checkpoints

The prospect's identity is progressively built through two commitment checkpoints:

**Checkpoint 1 — Cell Phone (Low Friction, Early)**

Triggered: After 2-3 discovery questions + 3+ configurator items.

> *"If you're comfortable, you can provide your cell to unlock the budgetary estimate as we work. We can also send a magic link so you can pick up the process at any time."*

What it unlocks:
- Budgetary price ranges on all configurator items
- Magic link for session continuity
- SMS channel (estimates, follow-ups, two-way)

What it captures:
- Phone number (Twilio-verified)
- Links anonymous session to a known contact
- Auto-matches to existing prospect by phone number

**Checkpoint 2 — OAuth Sign-In (Deeper Commitment, Later)**

Triggered: When prospect wants to save, share, or take action. The AI offers naturally:

> *"Want to save this estimate to your account? You can sign in with Google — takes 2 seconds. You'll be able to come back, make changes, and track your project from here."*

Also triggered by clicking any of the three CTAs (Book / Send / Let's Go) — signing in is part of the conversion flow.

What it unlocks:
- Persistent account on the platform
- Save multiple estimates
- Project history and future client portal access
- Shareable estimate URLs with their branding

What it captures:
- Google profile (name, email, avatar)
- IP address
- Browser fingerprint (user agent, screen resolution, language)
- Geolocation (browser Geolocation API with permission, or IP-based fallback)
- Device type and OS
- Referrer and UTM parameters
- All data written to the admin portal customer record

**Full Identity Progression:**

| Stage | Identifier | Checkpoint | Data Captured |
|-------|-----------|------------|---------------|
| Anonymous | `session_token` (SHA256 hash) | — | IP, device, referrer, UTM, pages visited |
| Phone verified | Cell number | Checkpoint 1 | Phone, SMS channel open |
| Authenticated | Google OAuth | Checkpoint 2 | Name, email, avatar, geolocation, browser fingerprint |
| Prospect matched | `prospect_id` | Auto | All above merged into single prospect record |
| Client | Same `prospect_id` | Manual | Status upgraded when deal closes |

Auto-merge at every stage: if phone matches an existing prospect, link. If OAuth email matches, link. If business name fuzzy-matches, flag for manual review in admin. No duplicates.

---

## 11. Admin Portal Integration

### New Sidebar Item

Under **Prospecting** group in admin sidebar:
- **Quotes** — between Pipeline and Demos

### Quotes List Page (`/admin/quotes`)

Table of all quote sessions:

| Column | Content |
|--------|---------|
| Business | Name + type |
| Estimate | $X,XXX - $X,XXX |
| Items | Count of selected items |
| Accuracy | Percentage badge |
| Status | Active / Completed / Abandoned |
| Conversion | booked / sent / started / abandoned |
| Source | Device + referrer |
| Date | Created timestamp |

Filters: status, conversion action, date range, estimate range
Search: business name, phone

### Quote Detail Page (`/admin/quotes/[id]`)

Three-panel layout:

**Left panel — Prospect Profile:**
- Business name, type, location
- Phone (click to text from admin)
- Discovery answers
- Budget signal badge
- Link to prospect record (if matched)

**Center panel — AI Transcript:**
- Full conversation history (web + SMS)
- Messages tagged by channel (web chat vs SMS)
- Human agent messages highlighted differently

**Right panel — Configurator Snapshot:**
- All selected items with quantities and ranges
- Running total (upfront + monthly)
- Payment preference
- "Reconstruct Estimate" button → opens `/quote/s/{share_token}`

**Bottom — Event Timeline:**
- Chronological feed of all quote events
- Visual indicators for key moments (phone verified, handoff, CTA clicks)

### Live Queue (Dashboard Widget)

Active quote sessions with hot signals:
- Business name, estimate range, time on page, items selected
- Hot signal indicator (flame icon)
- "Join Chat" button to manually enter any active session
- Auto-refreshes every 10 seconds

### Prospect Detail Integration

Existing prospect detail page (`/admin/prospects/[id]`) gets new section:
- **Quote Sessions** — list of all quote sessions linked to this prospect
- Each session expandable to show summary: items, estimate, conversion action
- Full activity feed includes quote events inline with calls, emails, notes

---

## 12. AI System Prompt

### Model & Endpoint

- **Model:** Claude API (claude-sonnet-4-6 for speed, upgrade to opus for complex conversations)
- **Endpoint:** `POST /api/quote/chat`
- **Context per request:** System prompt + pricing data + current configurator state + prospect profile + conversation history

### System Prompt Core Directives

```
You are DSIG's AI project advisor. You help prospects understand what 
their project could look like and build a budgetary estimate.

═══════════════════════════════════════════════════
PERSONALITY
═══════════════════════════════════════════════════
- Warm, knowledgeable, direct. Not salesy. Not sycophantic.
- You're a trusted advisor who genuinely wants their business to succeed.
- Use the prospect's business name and context to make every 
  recommendation specific to THEM. Never generic.
- Mirror their language and energy level (Chris Voss: mirroring).

═══════════════════════════════════════════════════
CONVERSATION FLOW (SPIN Selling + Challenger Sale)
═══════════════════════════════════════════════════

Phase 1 — DISCOVERY (Situation + Problem questions):
- Ask about their business, location, how customers find them.
- Surface their biggest pain/challenge.
- 2-3 questions max before moving to implications.

Phase 2 — COST OF INACTION (Implication questions — THE LEVER):
- Ask: "How many leads/calls do you think you're missing per month?"
- Ask: "What's a typical job/customer worth to your business?"
- Calculate their lost revenue live: missed_leads × avg_value = monthly loss.
- State it clearly: "That's roughly $X,000/month going to competitors."
- This reframes the ENTIRE conversation. Every dollar in the estimate 
  is now measured against lost revenue, not their bank account.

Phase 3 — PHONE UNLOCK:
- After 2-3 discovery exchanges + 3+ configurator items, say EXACTLY:
  "If you're comfortable, you can provide your cell to unlock the 
  budgetary estimate as we work. We can also send a magic link so 
  you can pick up the process at any time."
- If declined, continue building value. Offer max 2 more times, spaced naturally.

Phase 4 — RECOMMENDED BUILD (Assumptive approach):
- Present a pre-populated recommended build. NEVER a blank configurator.
- "Based on what you've told me about {Business Name}, here's what 
  I'd recommend as your starting package:"
- Walk through each item with: benefit → social proof → AI advantage.
- Proactively explain what you LEFT OUT and why: "I left off social 
  media for now since search is your priority. Phase 2 material."
- Use the Contrast Principle: show the ideal scope first, then offer 
  to phase it. The starting point feels smart, not cheap.

Phase 5 — REFINEMENT:
- Let them adjust. For removals, use loss aversion framing:
  "Removing X saves $Y/mo, but competitors publishing weekly will 
  outrank you. Your call — just want you to have the full picture."
- Ask Need-Payoff questions: "If 24 landing pages each brought in 
  2-3 leads per month, what would that mean for {Business Name}?"
  (Let THEM say the value. 10x more convincing than you saying it.)

Phase 6 — VERBAL RECAP (Trial Close):
- Before CTAs, summarize the entire project in one flowing paragraph.
- Use their business name. Reference their stated pain and the ROI calc.
- End with: "Ready to make it happen?"

═══════════════════════════════════════════════════
MICRO-COMMITMENTS (Cialdini: Consistency)
═══════════════════════════════════════════════════
- After each discovery answer, confirm: "Does that sound right?"
- After recommendations: "Want me to keep going, or does this 
  feel like a solid starting point?"
- After recap: "Ready to make it happen?"
- Each "yes" makes the final "yes" easier. 5-7 micro-yeses before CTAs.

═══════════════════════════════════════════════════
SOCIAL PROOF (drop naturally, never forced)
═══════════════════════════════════════════════════
- When recommending a service, reference a similar client result.
- Use the SOCIAL_PROOF_DATA provided in context.
- Format: "We built something similar for {industry} in {region} — 
  {result}."
- Never fabricate specifics. Use anonymized results from the data layer.
- If no matching proof exists for that service, skip it — don't force it.

═══════════════════════════════════════════════════
PRICING RULES
═══════════════════════════════════════════════════
- Never hallucinate prices. Only use PRICING_DATA provided.
- All prices are ranges, not fixed quotes.
- Frame as "budgetary estimate" — final scope in strategy call.
- Never mention competitor pricing unprompted. If asked, give brief 
  context conversationally. No specific dollar comparisons.
- ALWAYS tie price back to ROI: "The SEO setup is $500-$1,200, 
  and based on what you told me about missed leads, it could 
  recover that in the first 2-3 weeks."

═══════════════════════════════════════════════════
VALUE FRAMING (Never "Discount". Always "Efficient".)
═══════════════════════════════════════════════════
- "Human-led strategy, AI-powered execution."
- "Your dedicated team + the output of ten."
- Explain HOW AI makes each service better, not just cheaper.
- When monthly costs exceed $500, mention the hiring comparison:
  "$680/mo replaces what would cost $4,000-$6,000/mo in staff."

═══════════════════════════════════════════════════
BUDGET SIGNALS & PHASING
═══════════════════════════════════════════════════
- Never ask "what's your budget?" directly.
- If they volunteer a budget, build the BEST scope within it.
- If scope > $15K and prospect hesitates, reframe phasing as 
  STRATEGY: "Smart approach — start with the revenue generators, 
  add the force multipliers once cash flow proves the model."
- Never hard-sell. Never pressure. The ROI math does the work.

═══════════════════════════════════════════════════
NON-COMMITMENT (HARD RULE — DO NOT VIOLATE)
═══════════════════════════════════════════════════
You are producing BUDGETARY ESTIMATES, not binding quotes.
You have NO authority to commit DSIG to pricing, timelines,
scope, or deliverables. Only the human team, via a signed
Statement of Work, can commit DSIG.

When quoting numbers or timelines, use language that
preserves this:
  GOOD: "budgetary range", "typically runs", "roughly",
        "preliminary estimate", "directional", "finalized
        in your strategy call"
  BAD:  "your price is", "we guarantee", "you will get",
        "locked in at", "firm quote", "definitely", "promise"

If a prospect asks for a firm commitment ("is this the
final price?", "can you guarantee this timeline?"),
respond honestly:
  "This is a budgetary estimate — we finalize the real
  numbers in your strategy call and lock them in the
  Statement of Work. That protects both of us — you get
  pricing built around your actual scope, and we don't
  undercommit on something that turns out to need more."

NEVER produce output that a prospect could screenshot and
reasonably claim is a binding offer. Every estimate
implicitly carries the "budgetary, non-binding" qualifier
that is visible in the UI — your language must not contradict it.

═══════════════════════════════════════════════════
RISK REVERSAL (state near conversion)
═══════════════════════════════════════════════════
- "Every project starts with a free research report so you can 
  see our work quality firsthand."
- "Your first milestone is satisfaction-guaranteed."
- Keep it brief. One sentence. Don't oversell the guarantee.

═══════════════════════════════════════════════════
AVAILABLE ACTIONS (tool use)
═══════════════════════════════════════════════════
- add_item(item_id, quantity) — add to configurator
- remove_item(item_id) — remove from configurator  
- adjust_item(item_id, quantity) — change quantity
- set_recommended_build(items[]) — populate recommended build
- request_phone_verify(phone) — trigger phone verification
- send_magic_link() — send/resend magic link
- trigger_handoff() — ping team for live handoff
- calculate_roi(missed_leads, avg_value) — compute lost revenue
```

### Pricing Data Injection

The full pricing catalog (from section 13) is injected into the system prompt context as structured data. This data never leaves the server — it's only used by the AI to reference accurate prices.

---

## 13. Pricing Catalog

Server-side only. Never in client bundle. Loaded from `src/lib/quote-pricing.ts`.

### Data Contract

The catalog is a `PricingItem[]`. Every field listed here is required on every item unless marked optional. The tables that follow are a human-readable summary of the same data — the source of truth is the TypeScript file.

**All monetary values in the catalog are stored as integers in cents** (per section 10 conventions). `$600` is stored as `60000`.

```typescript
// src/lib/quote-pricing.ts (NEVER imported client-side)

export type QuoteCategory =
  | 'your-website'
  | 'existing-site'
  | 'features-integrations'
  | 'get-found'
  | 'content-social'
  | 'ai-automation'
  | 'research-strategy'
  | 'monthly-services'
  | 'hosting'
  | 'team-rates';

export type PricingType = 'one-time' | 'monthly' | 'both';

export interface NarrowingFactor {
  id: string;                    // e.g., 'page-count', 'integration-count'
  question: string;              // What the AI asks to narrow the range
  type: 'number' | 'select' | 'boolean';
  options?: string[];            // For 'select' type
  // Effect on the range: each factor can tighten the spread and/or shift the midpoint
  tightenBy?: number;            // 0.0-1.0 — how much this answer narrows the range width
  shiftMultiplier?: number;      // Multiplier applied to midpoint (e.g., 1.2 = 20% higher)
}

export interface PricingItem {
  // Identity
  id: string;                    // Stable slug — referenced in quote_sessions.selected_items
  category: QuoteCategory;
  name: string;                  // Display name, e.g., "React/Next.js Website"
  benefit: string;               // One-sentence business outcome, shown in configurator
  aiBadge: string;               // How AI makes this better, shown in line item
  description?: string;          // Optional longer description for AI context

  // Pricing
  type: PricingType;             // one-time, monthly, or both (setup + monthly)
  baseRange: [number, number];   // [low, high] in cents — widest range before narrowing
  monthlyRange?: [number, number]; // If type is 'both' or 'monthly', [low, high]/month in cents

  // Quantity (for per-unit items like landing pages, citations, platforms)
  quantifiable: boolean;
  quantityLabel?: string;        // e.g., 'pages', 'platforms', 'integrations'
  perUnitRange?: [number, number]; // [low, high] per unit in cents (replaces baseRange when quantifiable)
  defaultQuantity?: number;      // Starting quantity if added without specification
  minQuantity?: number;
  maxQuantity?: number;

  // Range narrowing
  narrowingFactors: NarrowingFactor[]; // Questions the AI asks to tighten the range

  // Timeline
  timelineWeeks: [number, number]; // [min, max] weeks to deliver
  parallelGroup: string;         // Items in the same group run concurrently (e.g., 'build', 'seo', 'content')

  // Financing
  financeable: boolean;          // Can be included in the 12-month monthly plan
  financingTermMonths?: number;  // Default 12 if financeable

  // Relationships
  suggestsWith?: string[];       // IDs of items commonly bundled (for AI recommendations)
  requiresBase?: boolean;        // If true, requires a base website item to be selected
  excludes?: string[];           // IDs of items that cannot coexist (e.g., WordPress vs React build)

  // Availability / gating
  phase: 1 | 2 | 3;              // Which implementation phase introduces this item
  availableForBid: boolean;      // Can be included in Name Your Price bids
  isFree?: boolean;              // True for research deliverables (invoiced at 100% discount)
  freeWithPaidProject?: boolean; // True for project plan (free only when paired with paid work)
}
```

**Validation rules (enforced at load time):**
- If `quantifiable === true`, `perUnitRange` and `quantityLabel` are required
- If `type === 'both'`, both `baseRange` (setup) and `monthlyRange` are required
- `baseRange[0] <= baseRange[1]` always
- `timelineWeeks[0] <= timelineWeeks[1]` always
- All IDs in `suggestsWith` and `excludes` must resolve to existing items

### Your Website (New Build — React/Next.js Platform)

| ID | Name | Type | Range | Per-Unit | AI Badge |
|----|------|------|-------|----------|----------|
| `single-page` | Single Page Site | one-time | $600-$1,000 | — | Ready-made, deploy today |
| `react-nextjs-site` | React/Next.js Website | one-time | $4,000-$9,000 | — | Human-led design, AI-built, blazing fast |
| `react-nextjs-app` | React/Next.js Web App | one-time | $6,000-$14,000 | — | Full-stack, SSR, edge-deployed |
| `mobile-app` | Mobile App (iOS & Android) | one-time | $8,000-$18,000 | — | Cross-platform, one codebase |
| `additional-pages` | Additional Core Pages | one-time | — | $75-$150/pg | AI-drafted, developer-polished |
| `ui-ux-design` | UI/UX Design | one-time | $1,500-$4,000 | — | Conversion-optimized, mobile-first |

*Note: WordPress is not offered as a new build platform. React/Next.js is faster, AI-native, and delivers better performance. See "Existing Site Services" for WordPress maintenance.*

### Existing Site Services (For Prospects Who Already Have a Site)

| ID | Name | Type | Range | Per-Unit | AI Badge |
|----|------|------|-------|----------|----------|
| `fractional-webmaster` | Fractional Webmaster | monthly | $200-$500/mo | — | Your pro on call for updates |
| `site-restyle` | Site Restyle / Refresh | one-time | $1,500-$4,000 | — | Modern look, same platform |
| `performance-optimization` | Performance Optimization | one-time | $500-$1,500 | — | Speed, Core Web Vitals, mobile |
| `seo-retrofit` | SEO Retrofit | one-time | $800-$2,000 | — | Schema, meta, structure, sitemap |
| `content-migration` | Content Migration | one-time | $500-$2,000 | — | Move everything to new platform |
| `ai-integration-existing` | AI Integration (Existing Site) | one-time | $800-$2,500 | — | Add chatbot, AI tools to current site |

### Features & Integrations

| ID | Name | Type | Range | Per-Unit | AI Badge |
|----|------|------|-------|----------|----------|
| `api-connection` | API Connection | one-time | — | $400-$1,200/ea | Plug into any system |
| `admin-portal` | Backend Admin Portal | one-time | $400-$1,200 | — | Manage your business data |
| `customer-portal` | Customer Portal | one-time | $400-$1,200 | — | Self-service for your clients |
| `semantic-layers` | Semantic Site Layers | one-time | $800-$1,400 | — | Human + bot + AI layers |
| `custom-functionality` | Custom App Functionality | one-time | — | $400-$1,200/modal | Built to your spec |

### Get Found

| ID | Name | Type | Range | Per-Unit | AI Badge |
|----|------|------|-------|----------|----------|
| `local-seo` | Local SEO | both | $500-$1,200 setup | + $200-$400/mo | AI monitors, team optimizes |
| `long-tail-pages` | Long-Tail Landing Pages | one-time | — | $20-$35/pg | AI-generated, developer-reviewed |
| `geo-aeo-llm` | GEO/AEO/LLM Optimization | both | $800-$1,400 setup | + $250-$500/mo | Get cited by ChatGPT & Gemini |
| `gbp-setup` | Google Business Profile | one-time | $200-$450 | — | Full setup + optimization |
| `citations` | Citation Sites | one-time | — | $20-$45/ea | Consistent NAP everywhere |
| `geo-targeting` | Geo-Targeting Campaigns | monthly | $300-$800/mo | — | Zip-code precision |

### Content & Social

| ID | Name | Type | Range | Per-Unit | AI Badge |
|----|------|------|-------|----------|----------|
| `auto-blogging` | AI Auto-Blogging | monthly | $200-$500/mo | — | AI writes, team reviews, SEO-optimized |
| `catchup-blogs` | Catchup Blog Posts | one-time | — | $125-$225/ea | Close the content gap fast |
| `automated-posts` | Automated Blog Posts | monthly | — | $20-$55/ea | AI pipeline, team-reviewed |
| `social-automation` | Social Media Automation | monthly | — | $125-$225/platform | Site to social, hands-free |
| `social-integration` | Social Media Integration | one-time | — | $40-$125/platform | Social feeds on your site |
| `review-responders` | AI Review Auto-Responders | monthly | $175-$225/mo | — | Every review answered 24/7 |
| `content-repurposing` | AI Content Repurposing | monthly | $200-$450/mo | — | One piece becomes ten |

### AI & Automation

| ID | Name | Type | Range | Per-Unit | AI Badge |
|----|------|------|-------|----------|----------|
| `ai-strategy` | AI Adoption Strategy | one-time | $1,200-$3,000 | — | Roadmap + ROI analysis |
| `ai-workforce` | AI Workforce Automation | one-time | $2,000-$6,000 | — | Replace manual processes |
| `ai-infrastructure` | AI Agent Infrastructure | both | $2,000-$5,000 setup | + $400-$1,000/mo | Deploy, monitor, scale |
| `ai-outreach` | AI Powered Outreach | both | $1,500-$4,000 setup | + $300-$800/mo | Personalized at scale |
| `ai-swarms` | AI Agent Swarms | both | $3,000-$8,000 setup | + $500-$1,500/mo | Coordinated AI workforce |
| `private-llm` | Private LLM Setup | one-time | $4,000-$12,000 | — | Your data stays yours |
| `clawbot` | Clawbot Setup | one-time | $1,500-$4,000 | — | Competitive intelligence |

### Research & Strategy

| ID | Name | Type | Range | Per-Unit | AI Badge |
|----|------|------|-------|----------|----------|
| `market-research` | Market Research Report | one-time | $400-$600 (FREE — invoiced at 100% discount) | — | Industry + opportunity analysis |
| `competitor-analysis` | Competitor Analysis | one-time | $400-$600 (FREE — invoiced at 100% discount) | — | Know your competition |
| `site-social-audit` | Current Site & Social Audit | one-time | $300-$500 (FREE — invoiced at 100% discount) | — | Know exactly where you stand |
| `project-plan` | Comprehensive Project Plan | one-time | $800-$1,200 (FREE with paid project — invoiced at 100% discount) | — | Full scope + roadmap |

### Monthly Services

| ID | Name | Type | Range | AI Badge |
|----|------|------|-------|----------|
| `site-admin` | Site Admin Services | monthly | $85-$450/mo | Updates, security, content edits |
| `review-admin` | Review Admin Services | monthly | $175-$225/mo | Monitoring + management |
| `analytics` | Analytics Package | monthly | $20-$85/mo | DNS analytics, replays, heatmaps |
| `google-admin` | Google Admin & Updates | monthly | $200-$275/mo | GBP, search console, ads |

### Hosting

| ID | Name | Type | Range | AI Badge |
|----|------|------|-------|----------|
| `hosting-php` | PHP Server | monthly | $15-$25/mo | Shared hosting, single page |
| `hosting-node` | Node.js Server | monthly | $35-$50/mo + usage | App hosting, edge-deployed |
| `hosting-enterprise` | Enterprise Stack | monthly | $85-$125/mo + usage | Full infrastructure |

### Team Rates (Hourly/Custom Work)

| ID | Role | Range |
|----|------|-------|
| `rate-team` | Team Member | $40-$60/hr |
| `rate-senior` | Senior Team | $85-$120/hr |
| `rate-developer` | Developer | $125-$175/hr |
| `rate-executive` | Executive | $200-$300/hr |
| `rate-legal` | Legal | $450-$650/hr |

---

## 14. Shareable Estimate URLs

**Route:** `/quote/s/{share_token}`

Reconstructs the full configurator with:
- All selected items and quantities
- Running total with payment options
- Read-only mode (no AI chat, no editing)
- "Make Changes" button that creates a NEW session cloned from this one
- "Book a Strategy Call" and "Let's Get Started" CTAs still active

**Use cases:**
- Prospect revisits their estimate
- Prospect shares with business partners
- Sales team sends updated estimates post-call
- Paired with demo site URLs

---

## 15. API Endpoints Summary

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/quote/chat` | POST | AI conversation + configurator actions | Session token |
| `/api/quote/prices` | POST | Fetch prices for selected items | Session + verified phone |
| `/api/quote/session` | POST | Create new quote session | None (creates session) |
| `/api/quote/session/[id]` | GET | Retrieve session state | Session token or share token |
| `/api/quote/session/[id]` | PATCH | Update session (selections, profile) | Session token |
| `/api/sms/verify/send` | POST | Send verification code | Session token |
| `/api/sms/verify/check` | POST | Validate verification code | Session token |
| `/api/sms/magic-link` | POST | Send/resend magic link | Verified session |
| `/api/sms/send` | POST | Send outbound SMS | Admin auth or system |
| `/api/sms/webhook` | POST | Receive inbound SMS | Twilio signature |
| `/api/quote/handoff/ping` | POST | Ping team for availability | System (triggered by AI) |
| `/api/quote/handoff/respond` | POST | Team responds to ping | Twilio webhook (YES/NO) |
| `/api/quote/bid` | POST | Submit Name Your Price bid | Share token (bid page) |
| `/api/quote/bid/respond` | POST | Admin accept/counter/decline bid | Admin auth |
| `/api/quote/scan` | POST | Quick-scan a prospect's existing site URL | Session token |
| `/api/quote/compare` | POST | Generate Good/Better/Best comparison | Session token |
| `/api/quote/sow` | POST | Generate SOW/contract from accepted estimate | Admin auth |
| `/api/quote/revision` | POST | Create revised estimate from admin | Admin auth |
| `/api/quote/revision/send` | POST | Send revised estimate to prospect | Admin auth |
| `/api/admin/quotes/new` | POST | Admin-initiated estimate builder | Admin auth |

---

## 16. Implementation Phases

### Phase 1 — Core Estimator (MVP)

**Quote Page & AI Engine:**
- `/quote` page with AI chat + configurator panel (responsive: desktop, tablet, mobile drawer)
- Full pricing catalog (server-side, anti-scrape architecture)
- SPIN-based AI conversation flow with implication questions
- Cost-of-inaction ROI calculator (missed leads × avg value)
- Recommended Build logic (pre-populated by industry/discovery)
- Smart defaults by 7 industry types
- Discovery fork: new build vs existing site vs rebuild
- Package comparison view (Good/Better/Best auto-generation)
- Micro-commitments throughout AI conversation
- Verbal recap / trial close before CTAs (Phase 4.5)
- Objection handling matrix in AI prompt
- Emotional state detection (excitement/hesitation/sticker shock)
- Social proof data layer (10-15 initial entries)
- Progress indicators in chat and configurator
- "How did you find us?" referral tracking

**Phone Gate & Verification:**
- Phone verification via Twilio (Checkpoint 1)
- Price unlock animation on all line items
- Magic link generation + SMS

**Configurator Panel:**
- Personalized estimate headers (business name)
- Running total with upfront/monthly/milestone toggle
- ROI context display (payback period, missed revenue)
- Hiring comparison when monthly > $500
- Time-to-launch estimate per configuration
- Risk reversal statement above CTAs
- "What Happens Next" roadmap (dynamic based on selections)

**Conversion:**
- Four CTAs (Book / Send / Let's Go / Start With Research)
  - "Start With Research" in Phase 1: email capture + admin notification + manual team delivery within 24–48 hours. Lightweight receipt PDF, no formal invoice or client portal yet.
- Manual configurator fallback mode ("I already know what I need")
- Quick Start single page anchor card

**Data & Admin:**
- Supabase tables: `quote_sessions`, `quote_events`, `quote_messages`
- Basic admin page: quotes list + detail view
- Behavioral analytics layer (scroll depth, hover time, click patterns)
- WCAG 2.1 AA accessibility compliance

### Phase 2 — SMS Channel + Live Handoff + Invoicing + Admin Tools

**SMS & Communication:**
- Two-way SMS (AI + human routing)
- Email as alternative channel (prospect chooses preference)
- Multi-touch follow-up cadence (Day 1/3/7/14/30/45)
- Exit intent recovery SMS (5min inactivity after engagement)
- "Name Your Price" bid system (Day 45 final touch)

**Live Handoff:**
- Hot signal detection + silent team ping (60-second window)
- Live handoff flow (AI → human transition in chat)
- Admin live queue widget on dashboard

**Identity & Auth:**
- OAuth sign-in (Checkpoint 2) for account creation
- Prospect auto-matching (phone/email/business name)

**Invoicing:**
- Invoice system (tables, admin UI, client-facing view)
- Free research report delivery via $0 invoice (Restaurant Rule)
- SOW/contract auto-generation from accepted estimates
- Milestone payment schedule for projects > $8K

**Admin Tools:**
- Admin estimate builder (bidirectional — build estimates for prospects)
- Post-call estimate revision + "Send Revised Estimate"
- Shareable estimate URLs with "Why DSIG" champion brief
- Quote versioning (snapshot on significant changes)
- Bid management (accept/counter/decline with scope adjustment)

### Phase 3 — Client Portal + Lifecycle + Intelligence

**Client Portal:**
- Magic link evolves to client portal (`/portal/{token}`)
- Project status, invoices, change requests
- Demo site pairing
- Full prospect timeline (quote → client → invoice)

**Intelligence:**
- Competitor site quick-scan (live URL analysis in conversation)
- Seasonal/contextual nudges
- Social proof library management in admin portal
- Re-engagement engine (90/180/365 day recovery cadence)

**Analytics & Optimization:**
- Emotional state detection refinement
- A/B testing (completion percentage, package comparison layouts)
- Session analytics dashboard (funnel visualization, drop-off analysis)
- Aggregate behavioral analytics (which items get most attention)
- Referral tracking dashboard + future referral bonus program

---

## 17. Technical Architecture

### Client-Side Components
- `QuotePage` — page wrapper, layout, responsive breakpoints
- `QuoteChat` — AI conversation interface (WebSocket or polling)
- `QuoteConfigurator` — receipt panel with categories, items, running total
- `QuoteLineItem` — individual item with benefit, badge, price, remove
- `QuoteTotal` — sticky footer with payment toggle and CTAs
- `QuoteQuickStart` — single page anchor card
- `PhoneVerification` — inline phone input + code entry
- `QuoteDrawer` — mobile slide-up configurator

### Server-Side
- `src/lib/quote-pricing.ts` — pricing catalog (NEVER client-imported)
- `src/lib/quote-engine.ts` — range calculation, narrowing logic, financing math
- `src/lib/quote-ai.ts` — Claude API integration, system prompt builder, tool definitions
- `src/lib/quote-sms.ts` — Twilio integration (verify, send, webhook handling)
- `src/lib/quote-handoff.ts` — hot signal detection, team ping, handoff state machine

### Real-Time Updates
- Configurator updates: optimistic UI with server confirmation
- AI responses: streaming via Claude API streaming endpoint
- Live queue (admin): polling every 10 seconds or WebSocket upgrade later

### Security
- Rate limiting on all quote API endpoints
- Twilio signature verification on all webhooks
- Session tokens: cryptographically random, httpOnly cookies
- Phone numbers: stored encrypted in Supabase
- Pricing data: never in client bundle, served only to verified sessions
- CSRF protection on all mutation endpoints

---

## 18. Success Metrics

| Metric | Target | How Measured |
|--------|--------|-------------|
| Phone capture rate | 40%+ of sessions | Verified phones / total sessions |
| Research CTA uptake | 30%+ of non-converting sessions | "Start With Research" clicks / sessions that didn't Book/Start |
| ROI calculator engagement | 50%+ of verified sessions | Sessions where prospect provided lead/revenue data |
| Follow-up cadence re-engagement | 15%+ | Sessions resumed after Day 1+ follow-up SMS |
| Champion share rate | 20%+ of completed estimates | Shareable URLs opened by a different device/IP |
| OAuth conversion (Checkpoint 2) | 25%+ of phone-verified sessions | OAuth completions / verified sessions |
| Estimate completion rate | 60%+ of verified sessions | Sessions with 5+ items / verified sessions |
| CTA conversion rate | 25%+ of completed estimates | CTA clicks / completed estimates |
| Average estimate value | $5,000+ | Mean of estimate_high across completed |
| Range accuracy at completion | 75%+ | Mean accuracy_pct at conversion |
| Live handoff acceptance | 70%+ when offered | Accepted / offered |
| Session resume rate | 30%+ | Magic links opened / magic links sent |
| Time to phone capture | <3 minutes | Median time from session start to verification |

---

## 19. Invoicing System (Admin Portal)

### The Restaurant Rule

Every deliverable — free or paid — gets a formal invoice. This is a core business philosophy, not an afterthought. It trains clients from day one that everything DSIG does has quantifiable value.

### Invoice Data Model

**New Table: `invoices`**

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid PK | Invoice identifier |
| `invoice_number` | text unique | Sequential: DSIG-2026-0001 |
| `prospect_id` | uuid FK | Links to prospect/client |
| `quote_session_id` | uuid FK (nullable) | Links to originating quote session |
| `status` | text | 'draft' / 'sent' / 'viewed' / 'paid' / 'void' |
| `subtotal` | int | Sum of line items (cents) |
| `discount_total` | int | Sum of discounts (cents) |
| `total_due` | int | subtotal - discount_total (cents) |
| `currency` | text default 'USD' | Currency code |
| `due_date` | date (nullable) | When payment is due |
| `paid_at` | timestamptz (nullable) | When payment was received |
| `notes` | text (nullable) | Invoice notes/memo |
| `sent_at` | timestamptz (nullable) | When emailed/texted to client |
| `viewed_at` | timestamptz (nullable) | When client opened the invoice |
| `created_at` | timestamptz | Created timestamp |
| `updated_at` | timestamptz | Last modified |

**New Table: `invoice_line_items`**

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid PK | Line item identifier |
| `invoice_id` | uuid FK | Parent invoice |
| `description` | text | Service name (e.g., "Competitor Analysis") |
| `quantity` | int default 1 | Number of units |
| `unit_price` | int | Price per unit (cents) |
| `subtotal` | int | quantity x unit_price (cents) |
| `discount_pct` | int default 0 | Discount percentage (0-100) |
| `discount_amount` | int default 0 | Calculated discount (cents) |
| `discount_label` | text (nullable) | e.g., "Complimentary", "Project kickoff bonus" |
| `line_total` | int | subtotal - discount_amount (cents) |
| `sort_order` | int | Display order |

### Invoice Generation Triggers

| Trigger | Invoice Created | Line Items |
|---------|----------------|------------|
| "Start With Research" CTA | Auto-generated | Selected research items at 100% discount |
| Paid project kickoff | Auto-generated | Project Plan at 100% discount + first project milestone |
| Monthly service cycle | Auto-generated | All active monthly services |
| Custom (admin) | Manual from admin portal | Admin adds line items |

### Admin Portal — Invoices Page (`/admin/invoices`)

Table of all invoices:
- Invoice number, client name, total due, status, date
- Filters: status, date range, amount range, client
- Quick actions: send, mark paid, void, duplicate

### Invoice Detail View

- Full line-by-line breakdown with discounts shown
- Send via email and/or SMS
- Track: sent, viewed, paid timestamps
- PDF export (branded, professional)
- Link to prospect/client record and originating quote session

### Client-Facing Invoice View

`/invoice/{invoice_number}` (authenticated via magic link or OAuth):
- Clean, branded invoice display
- Payment integration (future: Stripe)
- Download PDF
- "Questions about this invoice?" → routes to team

### Implementation Phase

Invoicing is a **Phase 2** deliverable — the admin portal needs it before the research CTA can fully work. However, Phase 1 can stub it by creating the invoice record in Supabase and sending a simple formatted email/SMS with the line items. Full admin UI and client-facing views come in Phase 2.

---

## 20. Sales Psychology Framework

This section documents the proven sales principles embedded throughout the estimator and the data layers that support them.

### Principles Applied

| # | Principle | Source | Where Applied |
|---|-----------|--------|---------------|
| 1 | **Reciprocity** | Cialdini (Influence) | Free research reports create obligation before asking for commitment |
| 2 | **Commitment & Consistency** | Cialdini | Micro-commitments throughout chat build yes-pattern toward final CTA |
| 3 | **Social Proof** | Cialdini | Case study snippets in AI conversation + configurator line items |
| 4 | **Authority** | Cialdini | AI demonstrates deep industry knowledge; "human-led" framing shows expertise |
| 5 | **Liking** | Cialdini | AI uses prospect's business name, mirrors their language, shows genuine interest |
| 6 | **Loss Aversion** | Kahneman & Tversky | Cost-of-inaction calculator; removal trade-off framing |
| 7 | **Default Effect** | Behavioral Economics | Recommended Build is pre-populated; removing is the action, not adding |
| 8 | **Contrast Principle** | Cialdini | Show full scope first, then phase down — starting point feels strategic |
| 9 | **SPIN Questioning** | Neil Rackham | Situation → Problem → Implication → Need-Payoff question flow |
| 10 | **Teach, Tailor, Take Control** | Challenger Sale | AI educates, personalizes to industry, recommends assertively |
| 11 | **Pain Funnel** | Sandler | Discovery deepens from surface to cost-of-inaction |
| 12 | **Assumptive Close** | Zig Ziglar | "Here's what I'd recommend" not "What would you like?" |
| 13 | **Trial Close** | Sandler | Verbal recap with "Ready to make it happen?" before CTAs |
| 14 | **Risk Reversal** | Hormozi ($100M Offers) | Milestone guarantee + free research removes fear |
| 15 | **Value Equation** | Hormozi | Benefits framing + ROI calculator shows dream outcome / perceived cost |
| 16 | **Anchoring** | Kahneman | $0 invoices show real value; full scope shown before phased version |
| 17 | **Completion Bias** | Zeigarnik Effect | Progress indicators drive prospects to finish the estimate |
| 18 | **Personalization** | Dale Carnegie | Business name on estimate, magic links, invoices |
| 19 | **Multi-Touch Persistence** | Jeb Blount (Fanatical Prospecting) | 5-touch follow-up cadence, each adding value |
| 20 | **Champion Arming** | MEDDIC | Shareable estimate with "Why DSIG" brief for internal selling |

### Social Proof Data Layer

Server-side data structure loaded alongside pricing. The AI references these contextually during conversation. All anonymized — no real client names unless permission is granted.

```typescript
// src/lib/quote-social-proof.ts

interface SocialProofItem {
  id: string;
  industry: string;          // 'plumbing', 'dental', 'legal', 'restaurant', etc.
  region: string;            // 'Northern California', 'Sacramento area', etc.
  serviceCategory: string;   // maps to configurator category
  serviceIds: string[];      // which pricing items this applies to
  metric: string;            // '3x organic traffic', '30+ calls/month', etc.
  timeframe: string;         // 'within 90 days', 'in 6 months', etc.
  fullSnippet: string;       // for AI conversation use
  shortSnippet: string;      // for configurator line item display
}

// Example entries:
const SOCIAL_PROOF: SocialProofItem[] = [
  {
    id: 'sp-contractor-ltp',
    industry: 'contractor',
    region: 'Northern California',
    serviceCategory: 'get-found',
    serviceIds: ['long-tail-pages', 'local-seo'],
    metric: '3x more leads',
    timeframe: 'within 90 days',
    fullSnippet: 'We built something similar for a contractor in the Sacramento area — 24 location pages with local SEO. They went from 8 calls a month to 30+ within 90 days.',
    shortSnippet: 'Clients avg 3x organic traffic in 6 months'
  },
  // ... more entries per industry/service combination
];
```

**Matching logic:** When the AI recommends a service, it checks `SOCIAL_PROOF` for entries matching the prospect's industry AND the service being recommended. Best match wins. If no industry match, falls back to region match. If nothing matches, no proof is shown — never fabricate.

**Building the proof library:** Start with 10-15 entries covering the most common industry/service combinations. Expand over time as real client results come in. Admin portal could have a "Social Proof" management page to add/edit entries.

### ROI Calculator

Embedded in the AI conversation and displayed in the configurator running total.

**Inputs (from Phase 1 discovery):**
- `missed_leads_per_month` — prospect's estimate of missed leads
- `avg_customer_value` — prospect's average job/customer value
- `current_monthly_revenue` — optional, for percentage uplift framing

**Calculations:**
```
monthly_lost_revenue = missed_leads_per_month × avg_customer_value
annual_lost_revenue = monthly_lost_revenue × 12
payback_period_months = estimate_midpoint / monthly_lost_revenue
roi_first_year = (annual_lost_revenue - estimate_midpoint) / estimate_midpoint × 100
```

**Display in running total (after phone unlock):**
```
ROI CONTEXT:
Estimated missed revenue: ~$5,000/mo ($60,000/yr)
Project payback: ~1.2 months
First-year ROI: ~850%
```

**Display in AI conversation:**
> *"At 10 missed leads per month with a $500 average job, that's roughly $5,000/month going to your competitors — $60,000 a year. This entire project could pay for itself in the first 5-6 weeks."*

If the prospect doesn't provide numbers, the ROI section simply doesn't appear. No assumptions, no made-up numbers.

### Progress Indicators

Subtle progress cues keep the prospect moving forward (Zeigarnik Effect — people want to complete what they've started):

**In the AI chat:** Small step indicator: "Discovery → Recommendations → Estimate → Next Steps"
The current step is highlighted. Completed steps get a checkmark.

**In the configurator:** Item count + a soft message:
- 0 items: "Let's build your project"
- 3 items: "Your project is taking shape"
- 5+ items: "Looking great — almost ready for your estimate"
- After phone: "Estimate unlocked — review and adjust below"

**Completion percentage** (optional, test in A/B): "Your estimate is 75% complete" — nudges them toward 100%.

### Champion Arming (MEDDIC: The Champion)

When a prospect shares their estimate with a business partner, they need to be able to SELL internally. The shareable estimate URL (`/quote/s/{share_token}`) includes:

**"Why DSIG" Brief** — a one-page section below the estimate:
- Who DSIG is (1 paragraph)
- AI-first advantage (2-3 bullet points)
- Risk reversal (milestone guarantee)
- Three relevant social proof snippets
- "Questions? Call us: (916) 542-2423"

This arms the champion with everything they need to convince a partner/spouse/CFO without DSIG being in the room. The brief is auto-generated — pulls from the prospect's industry and selected services.

### Emotional State Management

The AI monitors the prospect's emotional signals and adjusts:

| Signal | Detection | Response |
|--------|-----------|----------|
| **Excitement** | Multiple items added quickly, positive language | Match energy, keep building, suggest more |
| **Hesitation** | Long pauses, "I'm not sure", "that seems like a lot" | Slow down, validate: "Totally fair — let me explain why I recommended this..." |
| **Sticker shock** | "Wow" after seeing prices, removing items rapidly | Immediately suggest phasing: "Let's focus on just the revenue generators first" |
| **Ready to buy** | "How fast can we start?", "Let's do it" | Trigger team handoff ping, surface "Let's Get Started" CTA |
| **Just browsing** | Short answers, not sharing details | Offer free research: "No pressure — want a free competitor analysis to start?" |
| **Comparison shopping** | "What do other agencies charge?", "I got a quote from..." | Don't compete on price. Differentiate: "We focus on outcomes, not hours. Here's what that means for your business..." |

### Urgency Without Scarcity (Honest Capacity Signals)

No fake countdown timers. No "only 2 spots left." Instead, honest signals about team capacity:

The AI can check a simple admin-set flag (`team_capacity` in Supabase) and mention:
- *"Our team is currently onboarding 2 new projects this month — typical lead time for a project like yours is about 3-4 weeks from kickoff."*
- *"We have availability opening up in [month] for new builds."*

This creates natural urgency without manipulation. The admin portal has a simple toggle: "Current onboarding capacity" (1-5 scale) that the AI references.

### Objection Handling Matrix

Pre-loaded responses for common objections. The AI uses these as guidelines, not scripts:

| Objection | Response Framework |
|-----------|-------------------|
| "Too expensive" | Reframe against ROI: "I hear you. Let's look at it differently — at $5K/mo in missed revenue, this pays for itself in {X} weeks." If still hesitant, offer phasing. |
| "I need to think about it" | Validate + preserve: "Absolutely — that's what the magic link is for. Your estimate is saved. Would a free competitor analysis help you think it through?" |
| "I can get this cheaper" | Don't compete on price: "You probably can. The difference is AI-powered execution — our team produces 10x what a traditional agency does. You're not paying more per hour, you're getting more per dollar." |
| "I need to talk to my partner" | Arm the champion: "Makes total sense. I'll text you the estimate link — it includes a summary you can share. Want me to include a competitor analysis they can review too?" |
| "Just looking/researching" | Remove all pressure: "No problem at all. Grab a free research report — market research, competitor analysis, or a site audit. It's yours whether you work with us or not." |
| "We already have a website" | Pivot to enhancement: "Great — so this isn't about starting from scratch. It's about making what you have work harder. How's your current site performing for leads?" |
| "AI content isn't as good" | Address directly: "Fair concern. Our AI drafts, our humans refine. Every page is reviewed by a real developer. The AI handles the heavy lifting so you're not paying someone $150/hr to stare at a blank screen." |
| "How do I know you'll deliver?" | Risk reversal: "Start with a free research report — see the quality firsthand. For paid work, your first milestone is satisfaction-guaranteed." |

---

## 21. Additional Enhancements

### Smart Defaults by Industry

When the AI identifies the prospect's industry during discovery, it can pre-select the most relevant configurator items before presenting the Recommended Build:

| Industry | Default Recommendations (New Build) | If Existing Site |
|----------|--------------------------------------|-----------------|
| **Local Service** (plumber, HVAC, electrician) | React/Next.js site, long-tail pages (services × cities), local SEO, GBP, review responders, analytics | Fractional webmaster, SEO retrofit, GBP, review responders, long-tail pages |
| **Restaurant/Bar** | React/Next.js site, GBP, review responders, social automation (Instagram, Facebook), citations | Site restyle, GBP, review responders, social automation |
| **Professional Services** (lawyer, accountant, dentist) | React/Next.js app, additional pages, GEO/AEO, content repurposing, admin portal | Performance optimization, SEO retrofit, GEO/AEO, content repurposing |
| **E-Commerce** | React/Next.js app, customer portal, API connections, social automation, analytics | AI integration, performance optimization, social automation |
| **Real Estate** | React/Next.js site, long-tail pages (neighborhoods × services), GBP, social automation, AI outreach | SEO retrofit, long-tail pages, GBP, AI outreach |
| **SaaS/Tech** | React/Next.js app, semantic layers, AI agent infrastructure, auto-blogging, analytics | Content migration (recommend rebuild), semantic layers, auto-blogging |
| **Multi-Location** | React/Next.js site, long-tail pages (all locations × services), GBP per location, citations, geo-targeting | Fractional webmaster, long-tail pages, GBP per location, geo-targeting |

These are starting points that the AI adjusts based on discovery answers. The prospect sees a tailored recommendation, not a generic menu.

### Session Recovery Intelligence

When a prospect returns via magic link, the AI picks up with context:

> *"Welcome back! Last time we were looking at a React site with local SEO for your {3} locations. You had {5} items in your estimate at ${X,XXX}-${X,XXX}. Want to pick up where we left off, or start fresh?"*

### Quote Versioning

Each time the prospect makes significant changes (3+ items added/removed), the system snapshots the configurator state as a version. Admin portal can see the evolution:

- v1: AI recommended build (7 items, $8,200-$11,400)
- v2: Prospect removed AI swarms, added more blog posts (6 items, $5,800-$8,200)
- v3: After budget discussion, phased approach (4 items, $4,200-$6,100)

This tells the sales team the full story before the call.

### "Name Your Price" — Last Resort Conversion

For prospects who have gone completely dark — no site clicks, no magic link opens, no text replies after the full 30-day follow-up cadence — deploy one final conversion mechanism:

**Day 45 SMS (The Hail Mary):**
> *"Hey — I know timing might not be right for the full project. If you're still interested in any part of the scope we discussed, you can submit what you're comfortable investing and we'll see what we can make work: {bid_url}"*

**The Bid Page (`/quote/s/{share_token}/bid`):**
Reconstructs their estimate in read-only mode with a single input field:

```
+---------------------------------------------------+
|  FOLSOM PLUMBING CO. — Project Scope               |
|                                                    |
|  WordPress Site (8 pages)                          |
|  24 Long-Tail Landing Pages                        |
|  Local SEO (3 cities)                              |
|  AI Review Auto-Responders                         |
|  Analytics Package                                 |
|                                                    |
|  Our estimate: $5,500 - $7,800                     |
|                                                    |
|  What's your budget for this project?              |
|  [$ ____________]                                  |
|                                                    |
|  Optional: Tell us what's most important to you    |
|  [____________________________________]            |
|                                                    |
|  [Submit Your Budget]                              |
|                                                    |
|  "We'll review and get back to you within 24       |
|   hours with what we can do at your number."       |
+---------------------------------------------------+
```

**What happens on submit:**
1. Bid logged to `quote_sessions` (new event type: `bid_submitted`)
2. Admin notification via SMS: *"Bid received: {Business Name} offered ${X} on a ${Y-Z} scope. Review: {admin_url}"*
3. Admin portal shows bid with three options:
   - **Accept** — "We can do the full scope at your number." (Auto-texts prospect)
   - **Counter with reduced scope** — Admin selects which items to keep/remove. System generates a revised estimate. *"We can do ${X} — here's what that looks like: {revised_url}."* The revised URL shows checked items (included) and unchecked items (moved to Phase 2).
   - **Decline** — *"Thanks for your interest — that number is a bit below what we can do for this scope. Want us to send over a free competitor analysis so you have data for when the timing is right?"* (Routes them to free research — STILL captures value.)

**The psychology:**
- **Endowment effect** — they built this estimate, they feel ownership. Bidding is easier than starting over elsewhere.
- **Negotiation anchor** — their bid is always measured against the original estimate. A $4K bid on an $8K scope feels like a discount, not a lowball.
- **Scope flexibility** — "Yes at $4K, but we'd move long-tail pages to a later phase." They get a win. You get a client. The upsell happens naturally later.
- **No matter what their budget, we can win** — $2K? Single page + SEO. $4K? Core site + local SEO. $8K? Full recommended build. $15K? Everything.

**Admin Portal — Bid Management:**
New section on the Quotes detail page: "Bids" tab showing:
- Bid amount, optional notes, timestamp
- Accept / Counter / Decline actions
- Counter-offer builder: drag items between "Included" and "Phase 2" columns
- Auto-generated revised estimate URL
- Full communication history

### Discovery Fork: New Build vs. Existing Site

Early in discovery (Phase 1), the AI asks:

> *"Do you currently have a website, or are you starting from scratch?"*

This forks the entire recommendation engine:

**Path A — "Starting fresh" (Default path, already designed)**
Full configurator with new build options. React/Next.js as the platform.

**Path B — "I have a site already"**
AI follows up:
> *"Got it — what's the URL? And what's bothering you most about it — is it the look, the performance, the leads it's generating, or all of the above?"*

This unlocks a different set of configurator items (see Existing Site Services category below). The AI can also offer the live quick-scan:
> *"Let me take a quick look at your current site while we talk..."*

**Path C — "I have a site but I want to rebuild"**
AI validates the rebuild instinct:
> *"Smart move. With AI-powered development, we can build a new React site faster than it would take to untangle an old template. And the performance difference is night and day."*

Routes to Path A (new build) but notes the existing site URL for competitive analysis during the project.

### Existing Site Services (New Configurator Category)

For prospects who already have a site and want to improve rather than replace:

| ID | Name | Type | Range | AI Badge |
|----|------|------|-------|----------|
| `fractional-webmaster` | Fractional Webmaster | monthly | $200-$500/mo | Your pro on call for updates |
| `site-restyle` | Site Restyle / Refresh | one-time | $1,500-$4,000 | Modern look, same platform |
| `performance-optimization` | Performance Optimization | one-time | $500-$1,500 | Speed, Core Web Vitals, mobile |
| `seo-retrofit` | SEO Retrofit | one-time | $800-$2,000 | Schema, meta, structure, sitemap |
| `content-migration` | Content Migration (to new platform) | one-time | $500-$2,000 | Move everything, lose nothing |
| `ai-integration-existing` | AI Integration (Existing Site) | one-time | $800-$2,500 | Add chatbot, automation, AI tools to current site |

**The AI's honest take on WordPress:**
If the prospect has a WordPress site and wants improvements, the AI is transparent:

> *"I'll be honest — WordPress can be tricky at this point. It's slow, hard to connect with modern AI tools, and updates are a constant maintenance headache. We can absolutely do fractional webmaster work on your current WordPress site — keep it running, update content, fix issues. But if you're open to it, we can build a new React site faster than it would take to overhaul the WordPress template, and you'd end up with something dramatically faster and AI-native from day one."*

This positions the rebuild as the SMART choice without trash-talking their current decision. If they still want WordPress maintenance, we do it — it's revenue.

### WordPress Reframing in Pricing Catalog

Remove WordPress as a primary build option. Reframe as existing-site-only:

**BEFORE:**
```
| wordpress-site | WordPress Website | one-time | $4,000-$9,000 |
```

**AFTER:** WordPress removed from "Your Website" category. React/Next.js is the default build platform. WordPress only appears in the "Existing Site Services" category as fractional webmaster work.

### Seasonal/Contextual Nudges

The AI can reference timing when relevant:
- Q1: *"New year is a great time to launch — your competitors are still planning while you're already ranking."*
- Q4: *"Getting your site live before the holiday season means you capture that traffic spike."*
- Summer: *"Summer's typically slower for {industry} — perfect time to build so you're ready for fall rush."*

Not fake urgency — genuine strategic timing advice.

### Time-to-Launch Estimate

Every item in the pricing catalog includes a `timelineWeeks` range. The configurator shows estimated project timeline alongside cost:

```
YOUR PROJECT ESTIMATE         Accuracy: ~80%
Pay Upfront:    $5,500 - $7,800
Monthly Plan:   $680 - $875/mo (12 mo)
Timeline:       3-5 weeks to launch
```

**Timeline calculation logic:**
- Items run in parallel where possible (SEO setup runs alongside build)
- Critical path: design → build → content → launch
- Each item has `timelineWeeks: [min, max]` and `parallelGroup` (items in same group run concurrently)
- Total = longest parallel path, not sum of all items

**Timeline data per item:**

| Category | Item | Timeline |
|----------|------|----------|
| Website | Single page | 0.5-1 week |
| Website | React/Next.js site | 2-4 weeks |
| Website | React/Next.js app | 3-6 weeks |
| Website | Mobile app | 4-8 weeks |
| Get Found | Long-tail pages | 1-2 weeks (parallel with build) |
| Get Found | Local SEO | 2-4 weeks (parallel, ongoing after) |
| Content | Blog catchup | 1-2 weeks (parallel) |
| AI | Agent infrastructure | 2-4 weeks |

The AI references timeline in conversation:
> *"A project this size typically goes live in about a month. Traditional agencies take 3-6 months for the same scope — AI-powered execution compresses the timeline by 60-70%."*

### "What Happens Next" Roadmap

After ANY CTA click, show a clear 30-day roadmap to reduce the #1 conversion killer — uncertainty:

```
+---------------------------------------------------+
|  WHAT HAPPENS NEXT                                 |
|                                                    |
|  Day 1-2:  Strategy call — finalize scope together |
|  Day 3:    Free research report delivered           |
|  Day 5:    Project plan + $0 invoice delivered      |
|  Day 7-10: Design concepts and wireframes           |
|  Day 14-21: Build + review cycles                   |
|  Day 28-35: Launch + handoff                        |
|  Ongoing:  Monthly services kick in                 |
|                                                    |
|  Your dedicated team leads every step.              |
|  AI handles the heavy lifting behind the scenes.    |
+---------------------------------------------------+
```

The roadmap is dynamically generated based on selected items — a single-page site shows a 1-week roadmap, a full app build shows 6-8 weeks. Makes the "after" concrete and buyable.

### Package Comparison View (Good/Better/Best)

The AI can auto-generate 2-3 package configurations for side-by-side comparison:

> *"Want me to show you three options — a starter, a growth package, and the full build? That way you can see the trade-offs."*

```
+---------------------------------------------------+
|           STARTER     GROWTH      FULL BUILD       |
|                                                    |
| Site      Single pg   8-page      8-page + app     |
| Pages     —           —           24 LTP pages     |
| SEO       —           Local SEO   Local + GEO/AEO  |
| Social    —           1 platform  3 platforms       |
| Reviews   —           —           AI responders     |
| Monthly   $35-75      $420-680    $825-1,350       |
| Upfront   $600-1K     $4.8-6.2K  $8.5-12.4K       |
| Timeline  1 week      3-4 weeks   5-7 weeks        |
| ROI       Basic       Moderate    Maximum           |
|                                                    |
|  [Select]  [Select ★]  [Select]                    |
+---------------------------------------------------+
```

**Psychology:** Most people pick the middle option (Goldilocks Effect). The "Growth" package becomes the anchor. Starring the recommended option nudges further.

**Implementation:** The AI generates three tiers from the prospect's discovery data:
- **Starter:** Absolute minimum to go live (usually single page + hosting)
- **Growth:** Core revenue-generating services (the recommended build minus extras)
- **Full Build:** Everything the AI would recommend (the full recommended build)

Prospect can select a tier as their starting point, then adjust individual items from there.

### Milestone Payment Schedule (Large Projects)

For projects with build cost over $8,000, offer a milestone-based payment option alongside upfront and monthly:

```
PAYMENT OPTIONS:

( ) Pay Upfront       $8,500 - $12,400  (lowest total)
( ) Monthly Plan      $910 - $1,230/mo for 12 mo
( ) Milestone Plan    4 payments tied to deliverables:

    Milestone 1: Discovery + Design     $2,100-$3,100  (at kickoff)
    Milestone 2: Core Build             $2,800-$4,100  (at design approval)
    Milestone 3: Content + SEO          $2,100-$3,100  (at beta launch)
    Milestone 4: Launch + Optimization  $1,500-$2,100  (at go-live)

    Each milestone is satisfaction-guaranteed individually.
```

**Psychology:** Lower perceived commitment per payment. Aligns cost with visible progress. Each satisfaction-guaranteed milestone reduces risk further.

### Referral Tracking ("How Did You Find Us?")

Added to AI discovery flow after the main questions:

> *"One last thing — how did you find us? Just helps us know what's working."*

**Options captured:** Google search, social media, referral (who?), blog post, ad, word of mouth, other.

**Data stored:** `quote_sessions.referral_source` and `quote_sessions.referral_name` (nullable).

**Uses:**
- Admin analytics: which channels produce quote sessions and at what conversion rate
- Referral tracking: if a name is given, link to the referring client's record
- UTM validation: does their answer match the UTM parameters captured on page load?
- Future: referral bonus program for clients who send business

### Admin Estimate Builder (Bidirectional Tool)

The quote configurator isn't just prospect-facing — the sales team can build estimates FROM the admin portal:

**Admin Portal → New Estimate:**
- Same configurator interface, but accessed from `/admin/quotes/new`
- Admin selects items, quantities, adjusts ranges based on real conversation
- Attaches to an existing prospect record
- Click "Send to Prospect" → SMS/email with shareable URL
- Prospect receives a personalized estimate they can review, adjust, and accept

**Use cases:**
- Post-strategy-call: build a refined estimate based on the conversation
- Upsell existing clients: "Here's what adding social media would look like"
- Quick quotes during phone calls: build live while talking
- Re-engagement: send a fresh estimate to a dormant prospect

### Post-Call Estimate Revision

After a strategy call, the team updates the estimate from admin:
- Adjust items, quantities, narrow ranges based on real specifics
- Add notes: "Per our call — agreed to phase SEO into month 2"
- Click "Send Revised Estimate" → SMS: *"Updated estimate based on our call: {url}"*
- Revision history visible to both admin and prospect
- Each revision is a new quote version (see Quote Versioning)

The estimate stays the **living document** throughout the entire sales cycle.

### SOW/Contract Auto-Generation

When an estimate is accepted (via CTA, bid acceptance, or admin action), auto-generate a Statement of Work:

**SOW Template pulls from:**
- Selected configurator items → Scope & Deliverables section
- Ranges → Pricing section (narrowed to final agreed numbers)
- Timeline estimates → Timeline section
- Payment preference → Payment Terms section
- Risk reversal → Satisfaction Guarantee section
- Business name + contact → Client Information section

**Delivered as:**
- PDF via the invoicing system
- Viewable in client portal
- The SOW IS the first real invoice (with Phase 1 deliverables + payment schedule)

**Closes the loop:** Estimate → SOW → Invoice → Delivery — all from the same data. No re-entering information. No scope confusion.

### Re-Engagement Engine (Closed-Lost Recovery)

For prospects who declined, went cold, or had bids rejected:

| Day | Trigger | Content |
|-----|---------|---------|
| 90 | Scheduled SMS | *"Hey — a lot has changed since we last talked. Want an updated estimate for {Business Name}? {url}"* |
| 180 | Scheduled SMS | *"It's been 6 months — your competitors have been busy. Want a free updated competitor analysis to see where things stand?"* |
| 365 | Scheduled SMS (final) | *"Happy anniversary 😄 — your original estimate for {Business Name} is still here if you ever want to revisit it: {url}"* |

**Business logic:** Business needs change. The prospect who said no at $8K in April might say yes at $5K in October, or their competitor launched a new site and now they're motivated.

**Admin control:** Re-engagement can be toggled on/off per prospect. Admin can also trigger manual re-engagement at any time.

### Email as Alternative Channel

Not everyone wants text. After phone verification, offer the choice:

> *"Would you prefer updates via text or email?"*

**Stored as:** `quote_sessions.preferred_channel` ('sms' | 'email' | 'both')

All follow-up cadence messages, magic links, estimate revisions, and notifications respect this preference. Email allows richer content (formatted estimates, embedded case studies, PDF attachments).

### Behavioral Analytics Layer

Track engagement signals on the estimate page:

| Signal | How Captured | What It Reveals |
|--------|-------------|----------------|
| Scroll depth | Scroll position tracking | How far they read |
| Hover time per item | Mouse enter/leave events | What interests them most |
| Click patterns | Click event logging | What they expand/collapse |
| Time on page | Session duration | Total engagement |
| Item toggle velocity | Add/remove timestamps | Decision confidence |
| CTA hover vs click | Hover tracking on buttons | Intent without commitment |

**Feeds into:**
- Admin portal: engagement heatmap per session
- Hot signal detection: 8+ min engagement = high intent
- AI conversation: if the AI sees them hovering on "AI Agent Swarms" for 30 seconds, it can proactively explain it
- Aggregate analytics: which items get the most attention across all sessions

### WCAG 2.1 AA Accessibility (Non-Negotiable)

The entire quote flow must be fully accessible:

- **Keyboard navigation:** Tab through chat, configurator items, CTAs. Enter to select/deselect.
- **Screen reader:** ARIA labels on all interactive elements. Live regions for configurator updates. Chat messages announced as they arrive.
- **High contrast mode:** Respects `prefers-contrast` and `prefers-color-scheme`.
- **Focus indicators:** Visible focus ring on every interactive element.
- **Reduced motion:** All animations respect `prefers-reduced-motion`. Price unlock works without animation.
- **Font scaling:** Layout doesn't break at 200% zoom.
- **Error states:** Clear, descriptive error messages (not just red borders).
- **Mobile touch targets:** Minimum 44x44px touch targets on all buttons and toggles.

This matches the site's existing accessibility page commitment (WCAG 2.1 AA) and is legally prudent.

### Competitor Site Quick-Scan

If the prospect mentions a competitor or their own current website URL in conversation, the AI could offer:

> *"Want me to take a quick look at that site? I can give you a 30-second read on what's working and what's missing."*

If they share a URL, the AI (or a server-side tool) does a quick scan:
- Is it mobile-responsive?
- Does it have schema markup?
- Page speed estimate
- Visible SEO issues (missing meta, no H1, etc.)
- Social media presence check

This feeds back into the conversation: *"I took a quick look — your site loads in about 6 seconds (should be under 2), no local schema, and you're only ranking for your business name, not your services. That lines up with what we talked about — the location pages and SEO would fix all three of those."*

**This is a live version of the free site audit**, delivered in real-time during the conversation. Incredibly high impact.

---

## 22. Operational Guardrails

This section covers the non-negotiable operational rules that keep the estimator financially, legally, and reputationally safe. Every item here is in scope for Phase 1.

### 22.1 Claude API Cost Controls

Unbounded conversation length is the single biggest financial risk. A verbose prospect can easily burn $5–$10 in API calls in a single session.

**Token budget per session:**

| Limit | Value | Enforcement |
|-------|-------|-------------|
| Max input tokens per request | 8,000 | Hard cap — reject request |
| Max output tokens per request | 1,024 | `max_tokens` param |
| Max total session tokens (cumulative) | 60,000 | Soft cap — summarize + continue |
| Max session duration | 45 minutes | Force "let's move to a call" CTA |
| Max messages per session | 50 | Same as above |

**Conversation summarization:** When a session crosses 30,000 cumulative tokens, the oldest half of the conversation is replaced by an AI-generated summary stored in `quote_sessions.conversation_summary` (new jsonb column). The summary preserves: business name, discovery answers, ROI inputs, selected items, sentiment. Raw messages remain in `quote_messages` for admin review but are excluded from the Claude context window.

**Prompt caching (required for Phase 1):**
- The system prompt (~2,000 tokens) is static — use Anthropic prompt caching with the `cache_control` parameter
- The pricing catalog (~4,000 tokens) is static — cache it
- Cache TTL 5 minutes; re-prime on first message of each session
- Expected cost reduction: 70–90% on cached portions

**Rate limits:**

| Limit | Value | Scope |
|-------|-------|-------|
| Sessions per IP | 10 per day | Prevents scraping via session creation |
| Messages per session per minute | 10 | Prevents spam / abuse |
| Phone verification attempts per phone | 3 per hour | Prevents brute force |
| Phone verifications per IP | 5 per day | Prevents abuse |

**Kill switch:** An admin flag `ai_enabled` in Supabase. If costs spike or an incident occurs, flipping this flag causes the estimator to fall back to a static "configure manually" mode with no AI chat.

**Monitoring:** Daily cron job sends admin SMS/email with: total sessions, total tokens, total API cost, cost per session (avg/p95/max), any sessions that hit hard caps. Alerts if daily spend exceeds $50.

### 22.2 ROI Calculator Display Rules

The ROI calculator is a conversion lever when it works and a credibility destroyer when it doesn't. Guard rails:

**Required inputs (both must be present):**
- `missed_leads_monthly` > 0
- `avg_customer_value` > 0

**Display thresholds:**

| Condition | Display |
|-----------|---------|
| Payback period ≤ 6 months | Full ROI display (monthly lost revenue, annual, payback period, first-year ROI) |
| Payback period 6–12 months | Partial display (monthly lost revenue only, skip payback/ROI) |
| Payback period 12–24 months | Skip ROI entirely. AI reframes to long-term positioning: "This is a compounding investment — revenue builds over 18–24 months." |
| Payback period > 24 months | Skip ROI entirely. No revenue-loss framing at all. |
| Annual lost revenue > $2,000,000 | Cap display at "$2M+" and add note: "Real lost revenue may be higher — let's unpack this on the call." Never show "$15M lost per year" even if the math says so. |
| Prospect declines to answer | ROI section does not appear anywhere — no placeholders, no "estimated X". |

**Truthfulness rules for the AI:**
- NEVER extrapolate missed leads or customer value if the prospect didn't state them
- NEVER round aggressively in DSIG's favor (e.g., "10 leads × $500 = $5K" is fine; "rounded up to $7K" is not)
- If the math produces an absurd number, the AI says so: "That works out to a surprisingly big number — let's double-check those figures on the call." Does not display the absurd number in the configurator.

### 22.3 Non-Commitment Compliance

Covered in detail in Section 12 (AI system prompt) and Section 4 (configurator disclaimer). Summary of where the non-binding disclaimer must appear:

- Configurator footer (always visible, below CTAs)
- Every shareable estimate URL (top and bottom of page)
- Every SMS containing a dollar figure or timeline (e.g., "Your estimate: $5,500–$7,800 — budgetary, not final. Full SOW at kickoff.")
- Email with estimate or research deliverable
- Receipt PDFs for free research (clear "complimentary — no payment due")
- The Statement of Work generation template (header states: "This SOW supersedes all prior budgetary estimates.")

**Language audit:** Any new copy added to this flow — AI prompts, UI strings, SMS templates, email templates — must pass a quick audit against the "GOOD vs BAD" language list in Section 12 before shipping.

### 22.4 Data Retention & Session Validity

**Quote session lifetime:**

| State | Retention |
|-------|-----------|
| Active session (engaged in last 30 days) | Unlimited — stays live |
| Abandoned session (no activity 30 days, anonymous) | Auto-purge after 90 days |
| Abandoned session (phone-verified, no conversion) | Retain 2 years (prospect record) |
| Converted session (booked call / research requested) | Retain indefinitely — linked to prospect/client |

**Estimate validity window:**
- Every estimate carries a "Valid until {date}" — 60 days from last update
- After 60 days, the share URL still works but shows a banner: "This estimate is more than 60 days old — pricing and availability may have changed. Request an updated estimate?"
- Day 90 re-engagement SMS references this: "Want an updated estimate? Pricing may have shifted."

**Prospect data retention:** Inherits from the existing admin CRM retention policy (not changed by this spec).

### 22.5 Failure Modes & Fallbacks

| Failure | Fallback |
|---------|----------|
| Claude API down or throttled | Estimator shows "temporarily unavailable — please book a call" with the booking CTA. Chat disabled. Configurator remains usable in manual mode. |
| Twilio down | Phone verification fails gracefully: "We're having trouble sending the code — please try again in a minute or use email instead." Email fallback (Phase 2+); Phase 1 just retries. |
| Supabase unreachable | Session creation fails → show "please refresh" page. No silent data loss — never proceed without persistence. |
| Prospect provides VOIP number or invalid phone | Verification simply fails with no special handling. VOIP detection is out of scope for Phase 1 (acknowledged gap). |
| AI hallucinates a price not in the catalog | System prompt forbids this (Section 12). Additional safeguard: all prices displayed in the configurator come from the server-side pricing engine, never from AI-generated text. If AI mentions a number that disagrees with the configurator, the configurator wins visually. |
| Session token collision | Cryptographically random 32-byte tokens — collision probability is negligible. No special handling. |

### 22.6 Observability Requirements

Phase 1 ships with:
- Per-session event log (already in `quote_events`)
- Daily cost report (cron — see 22.1)
- Funnel metrics dashboard (new session → discovery complete → phone verified → 5+ items → CTA clicked)
- AI conversation review queue in admin (flag sessions with: prospect frustration signals, AI errors, manually review for prompt tuning)

Phase 2+ adds heatmaps, A/B testing infrastructure, and aggregate behavioral analytics (see Section 21).

---
