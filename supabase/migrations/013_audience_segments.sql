-- Migration: 013_audience_segments
-- Description: Audience segments for reusable campaign targeting
-- Date: 2025-02-09

-- =============================================================================
-- Audience Segments Table
-- =============================================================================

CREATE TABLE audience_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  rules JSONB NOT NULL DEFAULT '{"logic": "AND", "conditions": []}',
  is_dynamic BOOLEAN DEFAULT TRUE,
  estimated_size INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE audience_segments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own segments"
  ON audience_segments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own segments"
  ON audience_segments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own segments"
  ON audience_segments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own segments"
  ON audience_segments FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_audience_segments_user_id ON audience_segments(user_id);

-- Auto-update timestamps
CREATE TRIGGER update_audience_segments_updated_at
  BEFORE UPDATE ON audience_segments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Add segment_id to campaigns
-- =============================================================================

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS segment_id UUID REFERENCES audience_segments(id);

CREATE INDEX idx_campaigns_segment_id ON campaigns(segment_id) WHERE segment_id IS NOT NULL;

-- =============================================================================
-- Estimate segment size function
-- =============================================================================

CREATE OR REPLACE FUNCTION estimate_segment_size(p_rules JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_logic TEXT;
  v_conditions JSONB;
  v_query TEXT;
  v_condition JSONB;
  v_field TEXT;
  v_operator TEXT;
  v_value TEXT;
  v_clause TEXT;
  v_clauses TEXT[] := '{}';
  v_join_op TEXT;
BEGIN
  v_logic := COALESCE(p_rules->>'logic', 'AND');
  v_conditions := COALESCE(p_rules->'conditions', '[]'::JSONB);

  IF jsonb_array_length(v_conditions) = 0 THEN
    SELECT COUNT(*) INTO v_count FROM members WHERE is_active = TRUE;
    RETURN v_count;
  END IF;

  v_join_op := CASE WHEN v_logic = 'OR' THEN ' OR ' ELSE ' AND ' END;

  FOR v_condition IN SELECT * FROM jsonb_array_elements(v_conditions) LOOP
    v_field := v_condition->>'field';
    v_operator := v_condition->>'operator';
    v_value := v_condition->>'value';

    v_clause := CASE
      -- Status fields
      WHEN v_field = 'membershipStatus' AND v_operator = 'equals' THEN
        format('membership_status = %L', v_value)
      WHEN v_field = 'membershipStatus' AND v_operator = 'not_equals' THEN
        format('membership_status != %L', v_value)

      -- Membership level
      WHEN v_field = 'membershipLevelId' AND v_operator = 'equals' THEN
        format('membership_level_id = %L::UUID', v_value)

      -- Numeric fields
      WHEN v_field = 'lifetimeValue' AND v_operator = 'greater_than' THEN
        format('lifetime_value > %s', v_value::NUMERIC)
      WHEN v_field = 'lifetimeValue' AND v_operator = 'less_than' THEN
        format('lifetime_value < %s', v_value::NUMERIC)
      WHEN v_field = 'totalVisits' AND v_operator = 'greater_than' THEN
        format('total_visits > %s', v_value::INTEGER)
      WHEN v_field = 'totalVisits' AND v_operator = 'less_than' THEN
        format('total_visits < %s', v_value::INTEGER)

      -- Date fields
      WHEN v_field = 'lastVisitAt' AND v_operator = 'after' THEN
        format('last_visit_at > %L::TIMESTAMPTZ', v_value)
      WHEN v_field = 'lastVisitAt' AND v_operator = 'before' THEN
        format('last_visit_at < %L::TIMESTAMPTZ', v_value)
      WHEN v_field = 'lastVisitAt' AND v_operator = 'in_last_days' THEN
        format('last_visit_at > NOW() - INTERVAL ''%s days''', v_value::INTEGER)

      -- Text fields
      WHEN v_field = 'acquisitionSource' AND v_operator = 'equals' THEN
        format('acquisition_source = %L', v_value)
      WHEN v_field = 'acquisitionSource' AND v_operator = 'contains' THEN
        format('acquisition_source ILIKE ''%%'' || %L || ''%%''', v_value)

      WHEN v_field = 'city' AND v_operator = 'equals' THEN
        format('city = %L', v_value)
      WHEN v_field = 'state' AND v_operator = 'equals' THEN
        format('state = %L', v_value)

      -- Tags
      WHEN v_field = 'tags' AND v_operator = 'contains' THEN
        format('tags @> ARRAY[%L]', v_value)
      WHEN v_field = 'tags' AND v_operator = 'not_contains' THEN
        format('NOT (tags @> ARRAY[%L])', v_value)

      -- Fallback
      ELSE NULL
    END;

    IF v_clause IS NOT NULL THEN
      v_clauses := array_append(v_clauses, v_clause);
    END IF;
  END LOOP;

  IF array_length(v_clauses, 1) IS NULL OR array_length(v_clauses, 1) = 0 THEN
    SELECT COUNT(*) INTO v_count FROM members WHERE is_active = TRUE;
  ELSE
    v_query := 'SELECT COUNT(*) FROM members WHERE is_active = TRUE AND ('
      || array_to_string(v_clauses, v_join_op)
      || ')';
    EXECUTE v_query INTO v_count;
  END IF;

  RETURN v_count;
END;
$$;

-- =============================================================================
-- Down migration (in comments)
-- =============================================================================

-- ALTER TABLE campaigns DROP COLUMN IF EXISTS segment_id;
-- DROP FUNCTION IF EXISTS estimate_segment_size;
-- DROP TABLE IF EXISTS audience_segments;
