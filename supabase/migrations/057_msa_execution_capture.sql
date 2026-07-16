-- 057: MSA execution capture — approver identity, e-sign consent, and full
-- signer fingerprint for the signer certificate page.

-- Client approver identity (captured at execution)
ALTER TABLE msa_documents ADD COLUMN IF NOT EXISTS approver_name text;
ALTER TABLE msa_documents ADD COLUMN IF NOT EXISTS approver_title text;
ALTER TABLE msa_documents ADD COLUMN IF NOT EXISTS approver_email text;
ALTER TABLE msa_documents ADD COLUMN IF NOT EXISTS approver_cell text;

-- Explicit e-signature consent (checkbox on the sign page)
ALTER TABLE msa_documents ADD COLUMN IF NOT EXISTS esign_consent boolean NOT NULL DEFAULT false;
ALTER TABLE msa_documents ADD COLUMN IF NOT EXISTS esign_consent_at timestamptz;

-- DSIG-side (auto-countersign on send; recorded for the execution block)
ALTER TABLE msa_documents ADD COLUMN IF NOT EXISTS dsig_signed_at timestamptz;

-- Signer fingerprint — everything we can obtain, stored as one jsonb blob so
-- new signals can be added without a migration. Shape (all optional):
--   {
--     ip, ip_geo:{city,region,country,lat,lon,org,timezone},
--     user_agent, browser, os, device, platform, vendor,
--     languages, timezone, screen:{w,h,dpr,color_depth},
--     viewport:{w,h}, geolocation:{lat,lon,accuracy,at} (browser-permitted),
--     canvas_fp, webgl_vendor, webgl_renderer, hardware_concurrency,
--     device_memory, touch_points, do_not_track, cookies_enabled,
--     collected_at
--   }
ALTER TABLE msa_documents ADD COLUMN IF NOT EXISTS signer_fingerprint jsonb;
