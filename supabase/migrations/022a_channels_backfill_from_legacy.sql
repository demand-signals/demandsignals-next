-- 022a: Backfill channels.website, channels.google_business, channels.yelp
-- from legacy columns (prospects.website_url, google_rating, google_review_count,
-- yelp_rating, yelp_review_count). Idempotent — only fills when target is empty.
--
-- After this migration, the UI reads from channels.* exclusively. Legacy
-- columns remain untouched for back-compat but are no longer authoritative.

UPDATE prospects
SET channels = COALESCE(channels, '{}'::jsonb) || jsonb_build_object(
  'website',
  CASE
    WHEN website_url IS NOT NULL
     AND (channels->>'website' IS NULL OR channels->>'website' = '')
    THEN to_jsonb(website_url)
    ELSE channels->'website'
  END,
  'google_business',
  CASE
    WHEN (google_rating IS NOT NULL OR google_review_count IS NOT NULL)
     AND (channels->'google_business' IS NULL OR jsonb_typeof(channels->'google_business') != 'object')
    THEN jsonb_build_object(
      'url', NULL,
      'rating', google_rating,
      'review_count', google_review_count,
      'last_synced_at', NULL
    )
    ELSE channels->'google_business'
  END,
  'yelp',
  CASE
    WHEN (yelp_rating IS NOT NULL OR yelp_review_count IS NOT NULL)
     AND (channels->'yelp' IS NULL OR jsonb_typeof(channels->'yelp') != 'object')
    THEN jsonb_build_object(
      'url', NULL,
      'rating', yelp_rating,
      'review_count', yelp_review_count,
      'last_synced_at', NULL
    )
    ELSE channels->'yelp'
  END
)
WHERE website_url IS NOT NULL
   OR google_rating IS NOT NULL
   OR google_review_count IS NOT NULL
   OR yelp_rating IS NOT NULL
   OR yelp_review_count IS NOT NULL;
