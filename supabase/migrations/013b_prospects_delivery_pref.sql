-- 013b: Per-prospect delivery preference.
-- Determines routing when Send button dispatches: email_only / sms_only / both.

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS delivery_preference text NOT NULL DEFAULT 'both'
    CHECK (delivery_preference IN ('email_only','sms_only','both'));
