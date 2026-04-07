# Section Theater Rollout — Design Spec
**Date:** 2026-04-06
**Scope:** Roll out Section Theater style to all 22 non-wordpress-development service pages

---

## 1. Problem

The `wordpress-development` page is the Section Theater pilot — it has:
- `stats` prop → animated `StatsCounter` gradient band (4 teal numbers count up on scroll)
- `techStack` prop → `AnimatedTechStack` two-column section

All other 22 service pages have a hand-crafted `proofSection` with a **static inline-styled stat grid** — same data, no animation, not using the shared component.

Two pages also have a template-artifact bug in their proofSection stat values:
- `ai-automation-strategies`: `value: 'serviceCategory="ai-services".3M'` (should be `'$1.3M'`)
- `ai-workforce-automation`: `value: 'serviceCategory="ai-services".4-3.5K'` (should be `'$1.4-3.5K'`)

---

## 2. Changes Per Page

**Rule for every page:**
1. Remove `proofSection` prop (set to `undefined` or delete it)
2. Add `stats` prop with 4 relevant numeric stats
3. For tech/dev + AI pages only: add or keep `techStack` prop

**`useCountUp` constraint:** Uses `Math.round()` — stats must be integer values. Suffixes/prefixes handle non-integer display.

---

## 3. Page-by-Page Specification

### 3.1 Websites & Apps

#### react-next-webapps
- Has `techStack` ✅ — keep it
- Has `proofSection={<LighthouseScores />}` → remove
- Add `stats`:
```ts
stats={[
  { value: 100, suffix: '+', label: 'Vercel Edge Locations' },
  { value: 8, label: 'Top 10 SaaS Platforms on Next.js' },
  { value: 99, suffix: '%', label: 'Target Lighthouse Score' },
  { value: 48, suffix: 'hr', label: 'Project Scoping Turnaround' },
]}
```

#### mobile-apps
- Has `techStack` ✅ — keep it
- Remove `proofSection`
- Add `stats`:
```ts
stats={[
  { value: 60, suffix: '%', label: 'Web Traffic Is Mobile' },
  { value: 90, suffix: '%', label: 'Native Performance via RN' },
  { value: 2, suffix: 'wk', label: 'Avg App Store Approval' },
  { value: 50, suffix: '%', label: 'Dev Cost Savings vs Native' },
]}
```

#### vibe-coded
- Has `techStack` ✅ — keep it
- Remove `proofSection`
- Add `stats`:
```ts
stats={[
  { value: 10, suffix: 'x', label: 'Faster Than Traditional Dev' },
  { value: 50, suffix: '%', label: 'Cost Reduction Avg' },
  { value: 73, suffix: '%', label: 'AI-Assisted Code' },
  { value: 30, suffix: 'yr', label: 'Dev Experience Behind the AI' },
]}
```

#### design
- No `techStack` → **ADD**
- Remove `proofSection`
- Add `stats`:
```ts
stats={[
  { value: 94, suffix: '%', label: 'First Impressions Are Design' },
  { value: 88, suffix: '%', label: "Won't Return After Bad UX" },
  { value: 200, suffix: '%', label: 'Conversion Lift from Good Design' },
  { value: 33, suffix: '%', label: 'Faster Dev with Design Systems' },
]}
```
- Add `techStack`:
```ts
techStack={[
  { label: 'Design', value: 'Figma (components, auto-layout, tokens)' },
  { label: 'Prototyping', value: 'Figma Interactive Prototypes + AI' },
  { label: 'AI Tools', value: 'Claude API for copy + layout variations' },
  { label: 'Handoff', value: 'Figma Dev Mode + Tailwind CSS tokens' },
  { label: 'Icons', value: 'Lucide + custom icon sets' },
  { label: 'Assets', value: 'Optimized images + custom illustration' },
]}
techDescription="Every design we deliver is built for implementation — Figma files with proper auto-layout, component naming, and design tokens that map directly to Tailwind CSS classes."
```

#### hosting
- Has `techStack` ✅ — keep it
- Remove `proofSection`
- Add `stats`:
```ts
stats={[
  { value: 300, suffix: '+', label: 'Edge Locations Worldwide' },
  { value: 100, prefix: '<', suffix: 'ms', label: 'Global Load Time' },
  { value: 99, suffix: '%', label: 'Uptime Guarantee' },
  { value: 24, suffix: '/7', label: 'Monitoring & Alerting' },
]}
```

---

### 3.2 Demand Generation (no techStack added)

#### geo-aeo-llm-optimization
- Has `techStack` ✅ — keep it
- Remove `proofSection`
- Add `stats`:
```ts
stats={[
  { value: 48, suffix: '%', label: 'Searches Trigger AI Overviews' },
  { value: 61, suffix: '%', label: 'CTR Drop Without GEO' },
  { value: 527, suffix: '%', label: 'AI Referral Growth YoY' },
  { value: 72, suffix: '%', label: 'AI Citations Go to Top 3' },
]}
```

#### local-seo
- No `techStack` — skip
- Remove `proofSection`
- Add `stats`:
```ts
stats={[
  { value: 46, suffix: '%', label: 'Google Searches Are Local' },
  { value: 76, suffix: '%', label: 'Visit Within 24 Hours' },
  { value: 28, suffix: '%', label: 'Convert Same Day' },
  { value: 3, suffix: 'x', label: 'Lead Avg for Our Clients' },
]}
```

#### geo-targeting
- No `techStack` — skip
- Remove `proofSection`
- Add `stats`:
```ts
stats={[
  { value: 72, suffix: '%', label: 'Visit Within 5 Miles of Search' },
  { value: 93, label: 'Pages Built for One Client' },
  { value: 40, suffix: '+', label: '#1 Local Rankings Achieved' },
  { value: 11, label: 'Cities Covered per Client Avg' },
]}
```

#### gbp-admin
- No `techStack` — skip
- Remove `proofSection`
- Add `stats`:
```ts
stats={[
  { value: 7, suffix: 'x', label: 'More Clicks with Optimized GBP' },
  { value: 64, suffix: '%', label: 'Use GBP for Contact Details' },
  { value: 5, suffix: 'x', label: 'Review Response Rate with AI' },
  { value: 84, suffix: '%', label: 'Trust Reviews Like Referrals' },
]}
```

#### systems
- No `techStack` — skip
- Remove `proofSection`
- Add `stats`:
```ts
stats={[
  { value: 451, suffix: '%', label: 'Increase in Qualified Leads' },
  { value: 24, suffix: '/7', label: 'Automated Monitoring' },
  { value: 3, label: 'AI Domain Loops Working Together' },
  { value: 90, prefix: '<', suffix: 's', label: 'Avg Lead Response Time' },
]}
```

---

### 3.3 Content & Social (no techStack added)

#### ai-content-generation
- No `techStack` — skip
- Remove `proofSection`
- Add `stats`:
```ts
stats={[
  { value: 58, suffix: '%', label: 'Searches End Without a Click' },
  { value: 67, suffix: '%', label: 'More Leads with Content' },
  { value: 6, suffix: 'x', label: 'More Leads with 400+ Pages' },
  { value: 10, suffix: 'x', label: 'AI Volume vs Human Writing' },
]}
```

#### ai-social-media-management
- No `techStack` — skip
- Remove `proofSection`
- Add `stats`:
```ts
stats={[
  { value: 7, suffix: '/wk', label: 'Posts Per Week Automated' },
  { value: 67, suffix: '%', label: 'More Leads from Consistent Social' },
  { value: 5, label: 'Platforms Managed' },
  { value: 3, suffix: 'K+', prefix: '$', label: 'Monthly Savings vs Manager' },
]}
```

#### ai-review-auto-responders
- No `techStack` — skip
- Remove `proofSection`
- Add `stats`:
```ts
stats={[
  { value: 88, suffix: '%', label: 'Trust Responsive Businesses' },
  { value: 33, suffix: '%', label: 'More Revenue with Good Reviews' },
  { value: 2, suffix: 'hr', label: 'Avg AI Response Time' },
  { value: 100, suffix: '%', label: 'Review Response Coverage' },
]}
```

#### ai-auto-blogging
- No `techStack` — skip
- Remove `proofSection`
- Add `stats`:
```ts
stats={[
  { value: 67, suffix: '%', label: 'More Leads with Consistent Blogging' },
  { value: 434, suffix: '%', label: 'More Indexed Pages' },
  { value: 6, suffix: 'x', label: 'More Leads with 400+ Blog Pages' },
  { value: 1000, suffix: '+', label: 'Words Per AI-Generated Post' },
]}
```

#### ai-content-repurposing
- No `techStack` — skip
- Remove `proofSection`
- Add `stats`:
```ts
stats={[
  { value: 300, suffix: '%', label: 'Audience Reach Increase' },
  { value: 60, suffix: '%', label: 'More Engagement' },
  { value: 10, label: 'Channels per Piece of Content' },
  { value: 80, suffix: '%', label: 'Time Savings on Distribution' },
]}
```

---

### 3.4 AI & Agents

#### ai-automation-strategies
- No `techStack` → **ADD**
- Remove `proofSection` (contains template-artifact bug)
- Add `stats`:
```ts
stats={[
  { value: 95, suffix: '%', label: 'AI Projects Fail Without Strategy' },
  { value: 72, suffix: '%', label: "Can't Move Past AI Pilots" },
  { value: 451, suffix: '%', label: 'More Leads with Automation' },
  { value: 4, suffix: 'wk', label: 'Avg Time to Deployment' },
]}
```
- Add `techStack`:
```ts
techStack={[
  { label: 'Audit', value: 'Operations mapping + ROI analysis' },
  { label: 'AI Tools', value: 'Claude API, n8n, Supabase' },
  { label: 'Reporting', value: 'Custom client portal dashboard' },
  { label: 'Integration', value: 'HubSpot, Salesforce, Zapier, custom APIs' },
  { label: 'Timeline', value: '1-2 week audit → phased implementation' },
  { label: 'Support', value: 'Ongoing optimization + Telegram alerts' },
]}
techDescription="We audit your current operations, map every manual process to an AI solution, and build a phased roadmap that starts with the highest-ROI wins — typically deployable within 2-4 weeks."
```

#### ai-workforce-automation
- No `techStack` → **ADD**
- Remove `proofSection` (contains template-artifact bug)
- Add `stats`:
```ts
stats={[
  { value: 85, suffix: '%', label: 'Cost Reduction Achievable' },
  { value: 10, suffix: 'K', prefix: '$', label: 'Human Team Monthly Cost' },
  { value: 3, suffix: 'K', prefix: '$', label: 'AI Replacement Starting Cost' },
  { value: 24, suffix: '/7', label: 'Continuous AI Operation' },
]}
```
- Add `techStack`:
```ts
techStack={[
  { label: 'Content', value: 'Claude API + GEO-structured output' },
  { label: 'Social', value: 'Multi-platform scheduler + brand voice engine' },
  { label: 'Reviews', value: 'AI sentiment analysis + response drafting' },
  { label: 'SEO', value: 'GSC monitoring + automated page updates' },
  { label: 'Reporting', value: 'Real-time dashboard + weekly reports' },
  { label: 'Integration', value: 'CRM sync, Slack, Telegram alerts' },
]}
techDescription="Our AI workforce systems connect directly to your existing tools — CRM, social platforms, Google, and review sites — replacing manual labor with automated pipelines that cost a fraction of human headcount."
```

#### ai-agent-infrastructure
- No `techStack` → **ADD**
- Remove `proofSection`
- Add `stats`:
```ts
stats={[
  { value: 99, suffix: '%', label: 'System Uptime Guarantee' },
  { value: 265, prefix: '$', label: 'Max Base Infrastructure / Month' },
  { value: 19, label: 'Autonomous Agents Running In-House' },
  { value: 60, suffix: 's', label: 'Downtime Detection Time' },
]}
```
- Add `techStack`:
```ts
techStack={[
  { label: 'Database', value: 'Supabase PostgreSQL + RLS' },
  { label: 'AI', value: 'Claude API (Sonnet 4.5, Haiku 4.5)' },
  { label: 'Orchestration', value: 'n8n + custom pipeline loops' },
  { label: 'Hosting', value: 'Vercel + Cloudflare' },
  { label: 'Alerts', value: 'Telegram + Resend email notifications' },
  { label: 'Auth', value: 'Supabase Auth + Vault (secrets)' },
]}
techDescription="Our infrastructure stack runs every client on the same base — Supabase, Vercel, Cloudflare — with strict row-level security ensuring complete data isolation. Base cost: $95-265/month regardless of client count."
```

#### ai-automated-outreach
- No `techStack` → **ADD**
- Remove `proofSection`
- Add `stats`:
```ts
stats={[
  { value: 65, suffix: '%', label: 'Open Rate Achieved' },
  { value: 15, suffix: '%', label: 'Reply Rate Achieved' },
  { value: 21, suffix: '%', label: 'Industry Avg Open Rate' },
  { value: 50, label: 'Personalized Touches Per Week' },
]}
```
- Add `techStack`:
```ts
techStack={[
  { label: 'Research', value: 'AI prospect research + web crawling' },
  { label: 'Messaging', value: 'Claude API for personalized copy' },
  { label: 'Sequences', value: 'Email + LinkedIn multi-step sequences' },
  { label: 'Delivery', value: 'Resend + domain warm-up' },
  { label: 'CRM', value: 'HubSpot, Salesforce, Pipedrive sync' },
  { label: 'Analytics', value: 'Open/reply/convert tracking dashboard' },
]}
techDescription="Our outreach system researches prospects individually using web crawling and AI analysis, then crafts personalized messages for each. Sequences run automatically with timing optimized per recipient engagement patterns."
```

#### ai-agent-swarms
- No `techStack` → **ADD**
- Remove `proofSection` (was custom inline grid)
- Add `stats`:
```ts
stats={[
  { value: 165, suffix: '+', label: 'Agent Types Available' },
  { value: 19, label: 'Agents Running In-House' },
  { value: 6, label: 'Agent Specializations per Swarm' },
  { value: 24, suffix: '/7', label: 'Hours of Continuous Operation' },
]}
```
- Add `techStack`:
```ts
techStack={[
  { label: 'AI', value: 'Claude API (multi-agent coordination)' },
  { label: 'Database', value: 'Supabase PostgreSQL (shared state)' },
  { label: 'Orchestration', value: 'Event-driven message queues' },
  { label: 'Monitoring', value: 'Real-time dashboards + Telegram' },
  { label: 'Agents', value: '165+ specialized agent types' },
  { label: 'Deployment', value: 'Vercel Functions + scheduled runs' },
]}
techDescription="Agent swarms coordinate through a shared Supabase database. Each agent reads from and writes to shared state — when the content agent publishes, the SEO agent automatically monitors rankings. All activity logged to your dashboard in real-time."
```

#### private-llms
- No `techStack` → **ADD**
- Remove `proofSection`
- Add `stats`:
```ts
stats={[
  { value: 61, suffix: '%', label: 'Cite Privacy as Top AI Barrier' },
  { value: 3, label: 'Open-Source Model Families' },
  { value: 100, suffix: '%', label: 'Data Stays On Your Network' },
  { value: 5000, label: 'Max Fine-Tuning Examples Needed' },
]}
```
- Add `techStack`:
```ts
techStack={[
  { label: 'Models', value: 'Llama 3, Mistral, Phi (open-source)' },
  { label: 'Deployment', value: 'On-premise or private cloud (AWS/GCP/Azure)' },
  { label: 'Fine-tuning', value: 'Custom dataset training + RLHF' },
  { label: 'Inference', value: 'Ollama, vLLM, or custom serving layer' },
  { label: 'Monitoring', value: 'Usage tracking + performance dashboards' },
  { label: 'Security', value: 'Air-gapped or VPN-isolated networks' },
]}
techDescription="Private LLMs run on your infrastructure — on-premise hardware or a dedicated private cloud instance. We handle model selection, deployment, fine-tuning, and ongoing maintenance. Your data never leaves your network."
```

#### clawbot-setup
- No `techStack` → **ADD**
- Remove `proofSection`
- Add `stats`:
```ts
stats={[
  { value: 89, suffix: '%', label: 'Say CI Directly Influences Strategy' },
  { value: 24, suffix: '/7', label: 'Continuous Monitoring' },
  { value: 100, suffix: '%', label: 'Compliant & Ethical Crawling' },
  { value: 5, label: 'Data Source Types Monitored' },
]}
```
- Add `techStack`:
```ts
techStack={[
  { label: 'Crawling', value: 'Python Playwright + Selenium' },
  { label: 'Parsing', value: 'Claude API for data extraction + analysis' },
  { label: 'Storage', value: 'Supabase (versioned, timestamped data)' },
  { label: 'Scheduling', value: 'Configurable per-source crawl frequency' },
  { label: 'Alerts', value: 'Telegram + email on detected changes' },
  { label: 'Compliance', value: 'robots.txt respect + rate limiting' },
]}
techDescription="Clawbots are deployed as scheduled workers that crawl configured sources, extract structured data with AI assistance, and feed results into your Supabase database for use by other AI agents. All crawling respects robots.txt and platform terms of service."
```

---

## 4. Summary of Changes

| Page | Remove proofSection | Add stats | Add techStack |
|------|---------------------|-----------|---------------|
| react-next-webapps | ✅ (LighthouseScores) | ✅ | — (has it) |
| mobile-apps | ✅ | ✅ | — (has it) |
| vibe-coded | ✅ | ✅ | — (has it) |
| design | ✅ | ✅ | ✅ |
| hosting | ✅ | ✅ | — (has it) |
| geo-aeo-llm-optimization | ✅ | ✅ | — (has it) |
| local-seo | ✅ | ✅ | — |
| geo-targeting | ✅ | ✅ | — |
| gbp-admin | ✅ | ✅ | — |
| systems | ✅ | ✅ | — |
| ai-content-generation | ✅ | ✅ | — |
| ai-social-media-management | ✅ | ✅ | — |
| ai-review-auto-responders | ✅ | ✅ | — |
| ai-auto-blogging | ✅ | ✅ | — |
| ai-content-repurposing | ✅ | ✅ | — |
| ai-automation-strategies | ✅ (+ bug) | ✅ | ✅ |
| ai-workforce-automation | ✅ (+ bug) | ✅ | ✅ |
| ai-agent-infrastructure | ✅ | ✅ | ✅ |
| ai-automated-outreach | ✅ | ✅ | ✅ |
| ai-agent-swarms | ✅ | ✅ | ✅ |
| private-llms | ✅ | ✅ | ✅ |
| clawbot-setup | ✅ | ✅ | ✅ |

**22 pages total. No component changes. No template changes.**

---

## 5. Constraints

- No pricing sections (CLAUDE.md §13) — dollar stats like "$3K savings vs manager" are context stats, not service prices. Acceptable.
- ServicePageTemplate stays a server component — no changes needed.
- All stats use integer `value` due to `Math.round()` in `useCountUp`. Decimals (like 2.3x) are expressed as integer with adjusted suffix instead.
- `LighthouseScores` import removed from react-next-webapps (unused after proofSection removal).
