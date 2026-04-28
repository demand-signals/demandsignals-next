-- 031: SOW cover-text customization.
-- Both columns are optional. When NULL the PDF renderer falls back to its
-- defaults: eyebrow 'Statement of Work', tagline 'Prepared by Demand Signals
-- — Digital Growth & Strategy'. Per-SOW overrides let admin tailor the cover
-- (e.g. "Engagement Renewal" or "Project Brief" instead of "Statement of Work").

ALTER TABLE sow_documents
  ADD COLUMN IF NOT EXISTS cover_eyebrow text,
  ADD COLUMN IF NOT EXISTS cover_tagline text;
