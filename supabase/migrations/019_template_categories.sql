-- Migration: 019_template_categories
-- Description: Add category column to campaign_templates
-- Date: 2026-02-10

-- Add category column
ALTER TABLE campaign_templates
  ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT NULL;

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_campaign_templates_category
  ON campaign_templates(category);

-- Update starter templates with categories
UPDATE campaign_templates SET category = 'onboarding'
  WHERE is_system = TRUE AND name ILIKE '%welcome%';

UPDATE campaign_templates SET category = 'promotional'
  WHERE is_system = TRUE AND name ILIKE '%promotional%';

UPDATE campaign_templates SET category = 'promotional'
  WHERE is_system = TRUE AND name ILIKE '%win-back%';

UPDATE campaign_templates SET category = 'transactional'
  WHERE is_system = TRUE AND name ILIKE '%appointment%';

UPDATE campaign_templates SET category = 'event'
  WHERE is_system = TRUE AND name ILIKE '%event%';

UPDATE campaign_templates SET category = 'newsletter'
  WHERE is_system = TRUE AND name ILIKE '%newsletter%';

UPDATE campaign_templates SET category = 'retention'
  WHERE is_system = TRUE AND name ILIKE '%renewal%';

UPDATE campaign_templates SET category = 'retention'
  WHERE is_system = TRUE AND name ILIKE '%feedback%';

-- Any remaining system templates get 'general'
UPDATE campaign_templates SET category = 'general'
  WHERE is_system = TRUE AND category IS NULL;
