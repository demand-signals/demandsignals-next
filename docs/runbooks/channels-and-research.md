# Channels and Research — Operational Runbook

**Owner:** Hunter (DSIG)
**Last updated:** 2026-04-24
**Scope:** `prospects.channels` jsonb field, the 14-channel schema, the Claude web-search research flow, and the legacy column backfill.

> **The three things to know at 2am:**
> 1. **Admin edits win.** The "Run Research" button calls Claude to populate URLs and ratings — but it only overwrites fields that are currently null/empty. If an admin has manually set a URL or rating, Claude will not overwrite it.
> 2. **`channels` is one flat jsonb object, not a separate table.** All 14 channels live in `prospects.channels`. Review channels have a rich object shape `{url, rating, review_count, last_synced_at}`; simple channels are bare URL strings.
> 3. **Legacy columns are preserved but the UI no longer reads them.** `website_url`, `google_rating`, `google_review_count`, `yelp_rating`, `yelp_review_count` on `prospects` still exist. Migration 022a backfilled them into `channels`. Don't read them in new code — read `channels.website`, `channels.google_business.rating`, etc.

---

## Emergency procedures

### Channels showing stale or wrong data

1. Check the current channels value:
   ```sql
   SELECT channels FROM prospects WHERE id = '<prospect_id>';
   ```
2. Admin can edit channels directly at `/admin/prospects/[id]` → Research tab → Edit each channel URL/rating manually
3. For a full re-research: click "Run Research" button — Claude will only fill nulls, so first clear the fields you want refreshed:
   ```sql
   -- Clear just google_business so research re-fills it
   UPDATE prospects
   SET channels = jsonb_set(channels, '{google_business}', 'null'::jsonb)
   WHERE id = '<prospect_id>';
   ```
4. Then click Run Research again

### Research returns no results

**Likely causes:**
- Business name is too generic (e.g., "The Shop") — Claude can't locate it with web search
- Business has minimal web presence
- Anthropic API rate limit (check quote_config `ai_enabled` flag)

**Fix:** manually populate URLs at `/admin/prospects/[id]` → Research tab. Enter URLs directly from Yelp/Google Maps/etc.

---

## `prospects.channels` schema

Migration: `020a_prospect_channels_and_notes.sql`

The `channels` column is `jsonb NOT NULL DEFAULT '{}'`. Shape:

### Review channels (rich objects)

These 7 channels have ratings and review counts:

```json
{
  "google_business": {
    "url": "https://maps.google.com/...",
    "rating": 4.7,
    "review_count": 142,
    "last_synced_at": "2026-04-23T10:30:00Z"
  },
  "yelp": { "url": "...", "rating": 4.2, "review_count": 89, "last_synced_at": "..." },
  "facebook": { "url": "...", "rating": null, "review_count": null, "last_synced_at": null },
  "trustpilot": { "url": "...", "rating": 4.9, "review_count": 23, "last_synced_at": null },
  "bbb": { "url": "...", "rating": null, "review_count": null, "last_synced_at": null },
  "angi": { "url": "...", "rating": 4.5, "review_count": 67, "last_synced_at": null },
  "nextdoor": { "url": "...", "rating": null, "review_count": null, "last_synced_at": null }
}
```

### Simple channels (bare URL strings)

These 7 channels carry only a URL:

```json
{
  "website": "https://businessname.com",
  "linkedin": "https://linkedin.com/company/...",
  "tiktok": "https://tiktok.com/@...",
  "youtube": "https://youtube.com/@...",
  "instagram": "https://instagram.com/...",
  "twitter_x": "https://x.com/...",
  "pinterest": "https://pinterest.com/..."
}
```

**Full channels object:**
```json
{
  "website": "https://...",
  "google_business": { "url": "...", "rating": 4.7, "review_count": 142, "last_synced_at": "..." },
  "yelp": { "url": "...", "rating": 4.2, "review_count": 89, "last_synced_at": null },
  "facebook": { "url": "...", "rating": null, "review_count": null, "last_synced_at": null },
  "trustpilot": { ... },
  "bbb": { ... },
  "angi": { ... },
  "nextdoor": { ... },
  "linkedin": "https://...",
  "tiktok": null,
  "youtube": null,
  "instagram": "https://...",
  "twitter_x": null,
  "pinterest": null
}
```

---

## Research flow — "Run Research" button

Location: `/admin/prospects/[id]` → Research tab → "Run Research" button

**What it does:**
1. Calls `POST /api/admin/prospects/[id]/research`
2. Route sends the business name, city, state, and industry to Claude via `ANTHROPIC_API_KEY`
3. Claude performs web search via its built-in tool to find:
   - Google Business Profile URL + rating + review count
   - Yelp URL + rating + review count
   - Facebook URL
   - Website URL
   - LinkedIn, Instagram, etc.
4. Returns a `channels`-shaped JSON object
5. Admin route merges: **Claude only overwrites null/empty fields.** Admin-set fields are preserved.
6. `last_synced_at` is set to now() for channels that were updated

**Merge behavior (pseudocode):**
```typescript
// For review channels:
if (!existing.google_business?.url && research.google_business?.url) {
  channels.google_business = { ...research.google_business, last_synced_at: now }
}
// For simple channels:
if (!existing.website && research.website) {
  channels.website = research.website
}
```

---

## `prospect_notes` table

Migration: `020a_prospect_channels_and_notes.sql`

Append-only timeline of admin notes and activity entries. Stacked newest-first in the UI.

```sql
CREATE TABLE prospect_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  body        text NOT NULL,
  created_by  text,     -- admin user email or system tag (e.g. 'system:sow_accept')
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

**Admin UI:** `/admin/prospects/[id]` → Timeline tab. New note form at the top. Notes cannot be deleted (append-only by design — they are an audit trail).

To add a system note programmatically:
```typescript
await supabaseAdmin.from('prospect_notes').insert({
  prospect_id: prospect.id,
  body: 'SOW SOW-HANG-042326A accepted. Deposit invoice INV-HANG-042326A auto-created.',
  created_by: 'system:sow_accept',
})
```

---

## Legacy column backfill (migration 022a)

**File:** `supabase/migrations/022a_channels_backfill_from_legacy.sql`

This was a one-time data migration that copied from legacy columns into `channels`:

| Legacy column | → channels key |
|---|---|
| `prospects.website_url` | `channels.website` |
| `prospects.google_rating` + `google_review_count` | `channels.google_business.{rating, review_count}` |
| `prospects.yelp_rating` + `yelp_review_count` | `channels.yelp.{rating, review_count}` |

The migration was idempotent — it only filled target fields that were null/empty. Legacy columns remain in the schema but are no longer authoritative. **New code must read from `channels.*`.**

To verify backfill ran:
```sql
SELECT COUNT(*) FROM prospects
WHERE (google_rating IS NOT NULL OR yelp_rating IS NOT NULL)
  AND (channels->>'google_business' IS NULL OR channels->>'yelp' IS NULL);
-- If this returns > 0: backfill didn't run. Apply APPLY-022-2026-04-23.sql.
```

---

## Querying channel data

**Find all prospects with Google rating >= 4.5:**
```sql
SELECT business_name, (channels->'google_business'->>'rating')::numeric AS google_rating
FROM prospects
WHERE (channels->'google_business'->>'rating')::numeric >= 4.5
ORDER BY google_rating DESC;
```

**Find prospects missing a website:**
```sql
SELECT id, business_name
FROM prospects
WHERE channels->>'website' IS NULL
  AND is_client = false
ORDER BY created_at DESC;
```

**Find prospects with no research done:**
```sql
SELECT id, business_name
FROM prospects
WHERE channels = '{}'::jsonb OR channels IS NULL;
```

---

## TODO: scheduled weekly sync

For clients (`is_client = true`), a weekly sync of review channels is planned but not yet implemented. Current workaround: manually click "Run Research" on active client prospect pages weekly.

When implemented, it should:
1. Query `SELECT id FROM prospects WHERE is_client = true`
2. For each: call the research agent
3. Overwrite `google_business.rating`, `yelp.rating`, `review_count`, and `last_synced_at` (even if admin-set — weekly sync is authoritative for fresh data)
4. Flag any rating drops for admin review

---

## Troubleshooting

### `column "channels" does not exist`

Migration 020a not applied. Apply `APPLY-020-2026-04-23.sql`. See `supabase-migrations.md`.

### Research fills wrong business (false positive)

Claude found a different "Smith HVAC" in a different city. Fix:
1. Clear the wrongly-filled fields (set to null in channels)
2. Manually input the correct URLs
3. Claude won't overwrite admin-set values on subsequent research calls

### Rating shows as string instead of number in UI

The `channels` column is jsonb — ratings can be stored as strings if the research agent returned them that way. The UI should cast: `(channels->'google_business'->>'rating')::numeric`. If the UI shows "4.7" as a string: check the admin component that reads it and add `.parseFloat()` or a Postgres cast.

### `prospect_notes` rows not appearing

Check RLS:
```sql
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'prospect_notes';
-- Should have: "Admins read prospect_notes" (FOR SELECT) and "Admins write prospect_notes" (FOR ALL)
```

If policies are missing: re-apply `020a_prospect_channels_and_notes.sql` individually via SQL Editor.

---

## Cross-references

- `supabase-migrations.md` — how to apply 020a and 022a
- `admin-portal.md` — Research tab is part of the prospect detail page
- `quote-estimator.md` (existing) — the research subagent that fires during the quote flow (separate from the admin research button, but same channel shape)
