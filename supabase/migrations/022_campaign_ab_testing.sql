-- Migration: 022_campaign_ab_testing
-- Description: Add A/B testing columns to campaigns table
-- Date: 2026-02-11

ALTER TABLE campaigns
  ADD COLUMN ab_test_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN ab_variant_b_subject TEXT,
  ADD COLUMN ab_variant_b_content TEXT,
  ADD COLUMN ab_test_metric TEXT CHECK (ab_test_metric IN ('open_rate', 'click_rate')),
  ADD COLUMN ab_test_sample_pct INTEGER DEFAULT 50 CHECK (ab_test_sample_pct BETWEEN 10 AND 50),
  ADD COLUMN ab_test_duration_hours INTEGER DEFAULT 24,
  ADD COLUMN ab_test_winner TEXT CHECK (ab_test_winner IN ('a', 'b'));

-- Down migration (in comments)
-- ALTER TABLE campaigns
--   DROP COLUMN ab_test_enabled,
--   DROP COLUMN ab_variant_b_subject,
--   DROP COLUMN ab_variant_b_content,
--   DROP COLUMN ab_test_metric,
--   DROP COLUMN ab_test_sample_pct,
--   DROP COLUMN ab_test_duration_hours,
--   DROP COLUMN ab_test_winner;
