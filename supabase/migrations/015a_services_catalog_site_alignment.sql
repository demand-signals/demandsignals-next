-- 015a: Seed services_catalog with the 5 site-services that had no catalog
-- equivalent. Pricing derived from the FAQ copy on each service page
-- (src/lib/services.ts).
--
-- Safe to re-run — UPSERT on id.

INSERT INTO services_catalog (
  id, category, name, description, benefit, ai_badge,
  pricing_type, base_range_low_cents, base_range_high_cents,
  monthly_range_low_cents, monthly_range_high_cents, display_price_cents,
  quantifiable, timeline_weeks_low, timeline_weeks_high,
  parallel_group, financeable, financing_term_months,
  phase, available_for_bid, active, included_with_paid_project, sort_order
) VALUES
  -- ─── WordPress Development (standalone; react-nextjs-site is the Next.js equivalent) ───
  (
    'wordpress-development',
    'your-website',
    'WordPress Website',
    'Custom WordPress sites engineered for speed, SEO, and lead conversion. Includes custom theme, local schema, Core Web Vitals tuning, AI content pipeline integration.',
    'Custom WordPress sites built to rank and convert',
    'WordPress + AI content pipeline',
    'one-time',
    500000,   -- $5,000
    1500000,  -- $15,000
    NULL, NULL,
    900000,   -- $9,000 midpoint
    false,
    4, 8,
    'build',
    true, 12,
    1, true, true, false, 110
  ),

  -- ─── Vibe Coded Web Apps (AI-assisted custom apps, 50-70% cheaper than traditional) ───
  (
    'vibe-coded',
    'your-website',
    'Vibe Coded Web App',
    'AI-assisted custom web applications at 50-70% below traditional development cost. Senior architects direct structure + business logic while AI handles code generation. Ideal for custom functionality on limited budgets.',
    'Custom web apps at template prices',
    'AI-generated, architect-directed',
    'one-time',
    300000,   -- $3,000
    1500000,  -- $15,000
    NULL, NULL,
    800000,   -- $8,000 midpoint
    false,
    3, 8,
    'build',
    true, 12,
    1, true, true, false, 115
  ),

  -- ─── Demand Generation Systems (integrated monthly bundle) ───
  (
    'demand-gen-systems',
    'monthly-services',
    'Demand Generation System',
    'Comprehensive integrated system replacing multiple point services — SEO agency, content writer, social media manager, review tool, outreach software — with one AI-managed platform. Typically 40-60% less than assembling equivalent capabilities from separate vendors.',
    'Replace 5 vendors with one AI-run system',
    'One system. All your demand gen.',
    'monthly',
    0, 0,
    250000,   -- $2,500/mo
    800000,   -- $8,000/mo
    500000,   -- $5,000/mo midpoint
    false,
    2, 4,
    'ongoing',
    false, NULL,
    1, true, true, false, 305
  ),

  -- ─── AI Content Generation (standalone monthly — distinct from auto-blogging which is blog-only) ───
  (
    'ai-content-generation',
    'content-social',
    'AI Content Generation',
    'Monthly content production across formats — blog, landing pages, service pages, FAQ content, seasonal guides. Topic research, keyword targeting, human editorial review, publishing, performance tracking. 8-12+ pieces per month.',
    'More content, better targeting, less cost',
    'AI-written, human-reviewed',
    'monthly',
    0, 0,
    80000,    -- $800/mo
    250000,   -- $2,500/mo
    150000,   -- $1,500/mo midpoint
    false,
    0, 2,
    'content',
    false, NULL,
    1, true, true, false, 405
  ),

  -- ─── GBP Management (distinct from one-time gbp-setup; this is the ongoing monthly service) ───
  (
    'gbp-management',
    'monthly-services',
    'Google Business Profile Management',
    'Ongoing monthly GBP management — twice-weekly posting, Q&A monitoring, review response management, category/attribute optimization, photo updates, monthly performance reporting. The #1 ROI marketing investment for local businesses.',
    'Map Pack visibility on autopilot',
    'Daily monitoring + AI response drafts',
    'monthly',
    0, 0,
    50000,    -- $500/mo
    80000,    -- $800/mo
    65000,    -- $650/mo midpoint
    false,
    0, 1,
    'ongoing',
    false, NULL,
    1, true, true, false, 310
  )

ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  benefit = EXCLUDED.benefit,
  ai_badge = EXCLUDED.ai_badge,
  pricing_type = EXCLUDED.pricing_type,
  base_range_low_cents = EXCLUDED.base_range_low_cents,
  base_range_high_cents = EXCLUDED.base_range_high_cents,
  monthly_range_low_cents = EXCLUDED.monthly_range_low_cents,
  monthly_range_high_cents = EXCLUDED.monthly_range_high_cents,
  display_price_cents = EXCLUDED.display_price_cents,
  timeline_weeks_low = EXCLUDED.timeline_weeks_low,
  timeline_weeks_high = EXCLUDED.timeline_weeks_high,
  parallel_group = EXCLUDED.parallel_group,
  financeable = EXCLUDED.financeable,
  financing_term_months = EXCLUDED.financing_term_months,
  phase = EXCLUDED.phase,
  available_for_bid = EXCLUDED.available_for_bid,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
