-- Migration: 017_data_source_destinations
-- Description: Add destination type, field mappings, and site_id to data_sources for unified import flow
-- Author: Claude
-- Date: 2026-02-10

-- =============================================================================
-- Add destination columns to data_sources
-- =============================================================================

ALTER TABLE data_sources
  ADD COLUMN IF NOT EXISTS destination_type VARCHAR(50) DEFAULT 'custom'
    CHECK (destination_type IN ('members', 'transactions', 'visits', 'custom')),
  ADD COLUMN IF NOT EXISTS field_mappings JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id) ON DELETE SET NULL;

-- Index for site lookups
CREATE INDEX IF NOT EXISTS idx_data_sources_site ON data_sources(site_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_destination ON data_sources(destination_type);

-- Down migration (in comments)
-- ALTER TABLE data_sources
--   DROP COLUMN IF EXISTS destination_type,
--   DROP COLUMN IF EXISTS field_mappings,
--   DROP COLUMN IF EXISTS site_id;
