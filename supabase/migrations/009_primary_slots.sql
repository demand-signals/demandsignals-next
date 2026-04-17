-- Seed two "primary slot" config keys for the Sandler two-slot booking methodology.
-- AI reads these and says "Monday 10am or Tuesday 3pm?" as the first booking ask.
-- Admin rotates these weekly from /admin/quotes/config (or directly in SQL).
--
-- Values are plain strings — human-readable, timezone inline.
-- Example: "Monday 10am PT" / "Tuesday 3pm PT"

INSERT INTO quote_config (key, value, description) VALUES
  ('primary_slot_a', '"Tomorrow 10am PT"'::jsonb, 'First booking slot offered (Sandler methodology: an early-in-day option).'),
  ('primary_slot_b', '"Day after at 3pm PT"'::jsonb, 'Second booking slot offered (Sandler: a late-in-day option on the NEXT day).'),
  ('fallback_slot', '"Friday 2pm PT"'::jsonb, 'Fallback slot offered when prospect says primary slots do not work.')
ON CONFLICT (key) DO NOTHING;
