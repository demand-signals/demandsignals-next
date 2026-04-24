# Prospect Channels + Review Ratings — Retrospective Spec

**Date:** 2026-04-24
**Status:** SHIPPED
**Author:** Hunter / Claude (retrospective capture)
**See also:** `docs/runbooks/channels-and-research.md` for operational procedures

---

## Problem

The original prospect data model tracked online presence through a handful of legacy scalar columns:

```sql
website_url text
google_rating numeric
google_review_count integer
yelp_rating numeric
yelp_review_count integer
```

This had three structural problems:

1. **Coverage gap.** DSIG's scoring engine needed review data from Facebook, Trustpilot, BBB, Angi, and Nextdoor — not just Google and Yelp. Adding a column pair per platform would have ballooned the table to 20+ rating/count columns.
2. **Simple channels had no home.** A prospect's LinkedIn, Instagram, TikTok, YouTube, Twitter/X, and Pinterest URLs had nowhere to live beyond an ad-hoc notes field. These are useful for research scoring (digital presence assessment) and for the outreach engine.
3. **Duplicate website field.** The prospect detail UI had `website_url` on the contact card AND a planned "Channels" section. Two UI surfaces for the same data created sync confusion — which one was authoritative?
4. **No sync metadata.** There was no way to know when a rating was last checked, making it impossible to identify stale data or schedule refreshes.

---

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| **Keep adding scalar columns** | Simple schema changes | 20+ rating/count columns; schema migration per new platform; no extensibility |
| **Separate `prospect_channels` table** | Proper relational normalization | JOIN on every prospect query; more complex API; no benefit over jsonb for this read-heavy, write-rare use case |
| **`channels jsonb` as single source of truth (chosen)** | Extensible; one column; queryable with `->>`; no migrations for new platforms | Not enforced by DB constraints; shape must be validated in application code |

---

## Chosen approach

One `channels jsonb NOT NULL DEFAULT '{}'` column on `prospects`. All 14 channel types live in this object. Legacy scalar columns are preserved but are no longer authoritative.

**Two channel categories with different shapes:**

### Review channels (7) — rich objects

Platforms where rating and review count data is available:

```json
{
  "google_business": { "url": "...", "rating": 4.7, "review_count": 142, "last_synced_at": "2026-04-23T10:30:00Z" },
  "yelp":            { "url": "...", "rating": 4.2, "review_count": 89,  "last_synced_at": null },
  "facebook":        { "url": "...", "rating": null, "review_count": null, "last_synced_at": null },
  "trustpilot":      { "url": "...", "rating": 4.9, "review_count": 23,  "last_synced_at": null },
  "bbb":             { "url": "...", "rating": null, "review_count": null, "last_synced_at": null },
  "angi":            { "url": "...", "rating": 4.5, "review_count": 67,  "last_synced_at": null },
  "nextdoor":        { "url": "...", "rating": null, "review_count": null, "last_synced_at": null }
}
```

### Simple channels (7) — bare URL strings

Platforms where only a URL (presence/absence) matters:

```json
{
  "website":   "https://businessname.com",
  "linkedin":  "https://linkedin.com/company/...",
  "tiktok":    null,
  "youtube":   null,
  "instagram": "https://instagram.com/...",
  "twitter_x": null,
  "pinterest": null
}
```

---

## Rationale

`jsonb` is the right choice when:
- The set of keys is known but small and stable (14 channels, not hundreds)
- New channels can be added without a migration (just write a new key)
- Postgres `->>`  and `->`  operators provide sufficient query power for the access patterns needed (filter by rating threshold, find prospects missing a website)
- The data is read often but written rarely (research fills it once; admin edits occasionally)

The alternative — a separate `prospect_channels` table with `(prospect_id, platform, url, rating, review_count, synced_at)` rows — would be more "correct" relationally but would require a JOIN on every prospect query and offer no practical benefit for this volume and access pattern.

---

## Data model

### Migration 020a (`supabase/migrations/020a_prospect_channels_and_notes.sql`)

```sql
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS channels jsonb NOT NULL DEFAULT '{}'::jsonb;
```

Also added: `prospect_notes` table (append-only timeline of admin activity notes).

### Migration 022a (`supabase/migrations/022a_channels_backfill_from_legacy.sql`)

One-time backfill copying legacy scalar columns into `channels`:

| Legacy column | → channels key |
|---|---|
| `prospects.website_url` | `channels.website` |
| `prospects.google_rating` + `google_review_count` | `channels.google_business.{rating, review_count}` |
| `prospects.yelp_rating` + `yelp_review_count` | `channels.yelp.{rating, review_count}` |

Idempotent — only fills null/empty target fields. Legacy columns remain in the schema for backward compatibility but are no longer read by any new code.

---

## Research flow

The "Run Research" button at `/admin/prospects/[id]` → Research tab calls `POST /api/admin/prospects/[id]/research`. The route:

1. Sends business name, city, state, and industry to Claude via the Anthropic API
2. Claude performs web search to find URLs, ratings, and review counts
3. Returns a `channels`-shaped JSON object
4. Route merges with **admin-wins** semantics: Claude only overwrites null/empty fields; admin-set fields are preserved
5. `last_synced_at` is stamped on channels that were updated

This design ensures that manually curated data (which may be more accurate than Claude's web search) is never silently overwritten by an automated research run.

---

## API surface

Channels are read and written through the existing prospect CRUD:

- `GET /api/admin/prospects/[id]` — returns full prospect including `channels`
- `PATCH /api/admin/prospects/[id]` — accepts partial update including `channels` object
- `POST /api/admin/prospects/[id]/research` — AI research flow, returns updated channels

The admin UI renders 14 channel editors on the Research tab of the prospect detail page. Each review channel has URL + rating + review count inputs; simple channels have a single URL input.

---

## Querying channel data

```sql
-- Prospects with Google rating >= 4.5
SELECT business_name, (channels->'google_business'->>'rating')::numeric AS google_rating
FROM prospects
WHERE (channels->'google_business'->>'rating')::numeric >= 4.5;

-- Prospects missing a website
SELECT id, business_name FROM prospects
WHERE channels->>'website' IS NULL AND is_client = false;

-- Prospects with no research done
SELECT id, business_name FROM prospects
WHERE channels = '{}'::jsonb OR channels IS NULL;
```

---

## Rollout notes

- Migrations: `020a_prospect_channels_and_notes.sql` + `022a_channels_backfill_from_legacy.sql`
- Apply files: `APPLY-020-2026-04-23.sql` + `APPLY-022-2026-04-23.sql`
- The prospect scoring engine (`src/lib/scoring.ts`) reads `channels.google_business.rating` and `channels.google_business.review_count` for the "review authority" signal. It must use the `channels` key, not the legacy `google_rating` column.
- The legacy columns (`website_url`, `google_rating`, `google_review_count`, `yelp_rating`, `yelp_review_count`) remain on the `prospects` table for backward compatibility but should not be written to or read from in any new code.

---

## Open questions

1. **Scheduled weekly sync for clients.** For active clients (`is_client = true`), weekly review count and rating sync is planned but not implemented. The `last_synced_at` field on each review channel supports this — a sync job would update rating, review_count, and last_synced_at, overriding admin-set values (weekly sync should be authoritative for fresh data, unlike the one-time research flow). See `docs/runbooks/channels-and-research.md` TODO section.
2. **Rate limiting and ToS.** The research flow calls Claude's web search. Scraping review counts from Yelp/Google/etc. may conflict with those platforms' ToS. For now, Claude's web search uses publicly visible data. Monitor if automated sync is added.
3. **Privacy.** `channels` may contain personal business information. Ensure it is not exposed to the public API (it is currently admin-only via RLS).
4. **New platforms.** Adding a new channel (e.g., Google Maps, Houzz, HomeAdvisor) requires: (a) updating the TypeScript type for `channels`, (b) adding a UI field on the Research tab, (c) updating the research prompt to look for the new platform. No migration needed — jsonb absorbs new keys without schema changes.
