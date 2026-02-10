-- Migration: 014_marketing_enhancements
-- Description: Marketing enhancements from specialist review
--   - Item 1: Unsubscribe tracking in campaign metrics
--   - Item 2: Template tags for search/filtering
--   - Item 4: Segment member preview function
--   - Item 5: Nested segment groups (recursive WHERE builder)
--   - Item 7: Template performance stats
--   - Item 8: Engagement-based segment fields
--   - Item 9: System segment templates
--   - Item 10: Device/client tracking on campaign messages
-- Date: 2026-02-10

-- =============================================================================
-- Section 1: Schema Changes
-- =============================================================================

-- Item 2: Add tags to templates
ALTER TABLE campaign_templates ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_campaign_templates_tags ON campaign_templates USING GIN (tags);

-- Item 10: Add device tracking to messages
ALTER TABLE campaign_messages ADD COLUMN IF NOT EXISTS device_type VARCHAR(20);
ALTER TABLE campaign_messages ADD COLUMN IF NOT EXISTS user_agent TEXT;
CREATE INDEX IF NOT EXISTS idx_campaign_messages_device
  ON campaign_messages (campaign_id, device_type) WHERE device_type IS NOT NULL;

-- Item 9: Add is_system flag to segments
ALTER TABLE audience_segments ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;

-- =============================================================================
-- Section 2: RLS Updates
-- =============================================================================

-- Item 9: Allow reading system segments
DROP POLICY IF EXISTS "Users can read own segments" ON audience_segments;
CREATE POLICY "Users can read segments"
  ON audience_segments FOR SELECT
  USING (auth.uid() = user_id OR is_system = TRUE);

-- =============================================================================
-- Section 3: Functions
-- =============================================================================

-- Item 1: Update get_campaign_metrics to include unsubscribe data
-- Must DROP first because return type is changing (adding unsubscribe columns)
DROP FUNCTION IF EXISTS get_campaign_metrics(UUID);
CREATE OR REPLACE FUNCTION get_campaign_metrics(p_campaign_id UUID)
RETURNS TABLE (
  total_recipients INTEGER,
  total_sent INTEGER,
  total_delivered INTEGER,
  total_failed INTEGER,
  total_opened INTEGER,
  total_clicked INTEGER,
  total_bounced INTEGER,
  total_unsubscribed INTEGER,
  delivery_rate NUMERIC,
  open_rate NUMERIC,
  click_rate NUMERIC,
  bounce_rate NUMERIC,
  unsubscribe_rate NUMERIC
) AS $$
DECLARE
  v_campaign RECORD;
BEGIN
  SELECT * INTO v_campaign FROM campaigns WHERE id = p_campaign_id;

  IF v_campaign IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    v_campaign.total_recipients,
    v_campaign.total_sent,
    v_campaign.total_delivered,
    v_campaign.total_failed,
    v_campaign.total_opened,
    v_campaign.total_clicked,
    v_campaign.total_bounced,
    v_campaign.total_unsubscribed,
    CASE WHEN v_campaign.total_sent > 0
      THEN ROUND((v_campaign.total_delivered::NUMERIC / v_campaign.total_sent) * 100, 2)
      ELSE 0
    END AS delivery_rate,
    CASE WHEN v_campaign.total_delivered > 0
      THEN ROUND((v_campaign.total_opened::NUMERIC / v_campaign.total_delivered) * 100, 2)
      ELSE 0
    END AS open_rate,
    CASE WHEN v_campaign.total_opened > 0
      THEN ROUND((v_campaign.total_clicked::NUMERIC / v_campaign.total_opened) * 100, 2)
      ELSE 0
    END AS click_rate,
    CASE WHEN v_campaign.total_sent > 0
      THEN ROUND((v_campaign.total_bounced::NUMERIC / v_campaign.total_sent) * 100, 2)
      ELSE 0
    END AS bounce_rate,
    CASE WHEN v_campaign.total_delivered > 0
      THEN ROUND((v_campaign.total_unsubscribed::NUMERIC / v_campaign.total_delivered) * 100, 2)
      ELSE 0
    END AS unsubscribe_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Item 5: Recursive WHERE clause builder for nested segment groups
CREATE OR REPLACE FUNCTION build_segment_where_clause(p_rules JSONB, p_depth INTEGER DEFAULT 0)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_logic TEXT;
  v_conditions JSONB;
  v_groups JSONB;
  v_condition JSONB;
  v_group JSONB;
  v_field TEXT;
  v_operator TEXT;
  v_value TEXT;
  v_clause TEXT;
  v_clauses TEXT[] := '{}';
  v_join_op TEXT;
BEGIN
  -- Enforce max depth of 3
  IF p_depth > 3 THEN
    RETURN 'TRUE';
  END IF;

  v_logic := COALESCE(p_rules->>'logic', 'AND');
  v_conditions := COALESCE(p_rules->'conditions', '[]'::JSONB);
  v_groups := COALESCE(p_rules->'groups', '[]'::JSONB);
  v_join_op := CASE WHEN v_logic = 'OR' THEN ' OR ' ELSE ' AND ' END;

  -- Process flat conditions
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

      -- Item 8: Engagement-based fields (subqueries on campaign_messages)
      WHEN v_field = 'emailOpensLast30Days' AND v_operator = 'greater_than' THEN
        format('(SELECT COUNT(*) FROM campaign_messages cm WHERE cm.member_id = members.id AND cm.opened_at IS NOT NULL AND cm.opened_at > NOW() - INTERVAL ''30 days'') > %s', v_value::INTEGER)
      WHEN v_field = 'emailOpensLast30Days' AND v_operator = 'less_than' THEN
        format('(SELECT COUNT(*) FROM campaign_messages cm WHERE cm.member_id = members.id AND cm.opened_at IS NOT NULL AND cm.opened_at > NOW() - INTERVAL ''30 days'') < %s', v_value::INTEGER)
      WHEN v_field = 'emailClicksLast30Days' AND v_operator = 'greater_than' THEN
        format('(SELECT COUNT(*) FROM campaign_messages cm WHERE cm.member_id = members.id AND cm.clicked_at IS NOT NULL AND cm.clicked_at > NOW() - INTERVAL ''30 days'') > %s', v_value::INTEGER)
      WHEN v_field = 'emailClicksLast30Days' AND v_operator = 'less_than' THEN
        format('(SELECT COUNT(*) FROM campaign_messages cm WHERE cm.member_id = members.id AND cm.clicked_at IS NOT NULL AND cm.clicked_at > NOW() - INTERVAL ''30 days'') < %s', v_value::INTEGER)
      WHEN v_field = 'lastEmailOpenedAt' AND v_operator = 'after' THEN
        format('(SELECT MAX(cm.opened_at) FROM campaign_messages cm WHERE cm.member_id = members.id AND cm.opened_at IS NOT NULL) > %L::TIMESTAMPTZ', v_value)
      WHEN v_field = 'lastEmailOpenedAt' AND v_operator = 'before' THEN
        format('(SELECT MAX(cm.opened_at) FROM campaign_messages cm WHERE cm.member_id = members.id AND cm.opened_at IS NOT NULL) < %L::TIMESTAMPTZ', v_value)
      WHEN v_field = 'lastEmailOpenedAt' AND v_operator = 'in_last_days' THEN
        format('(SELECT MAX(cm.opened_at) FROM campaign_messages cm WHERE cm.member_id = members.id AND cm.opened_at IS NOT NULL) > NOW() - INTERVAL ''%s days''', v_value::INTEGER)
      WHEN v_field = 'lastSmsDeliveredAt' AND v_operator = 'after' THEN
        format('(SELECT MAX(cm.delivered_at) FROM campaign_messages cm JOIN campaigns c ON c.id = cm.campaign_id WHERE cm.member_id = members.id AND c.campaign_type = ''sms'' AND cm.delivered_at IS NOT NULL) > %L::TIMESTAMPTZ', v_value)
      WHEN v_field = 'lastSmsDeliveredAt' AND v_operator = 'before' THEN
        format('(SELECT MAX(cm.delivered_at) FROM campaign_messages cm JOIN campaigns c ON c.id = cm.campaign_id WHERE cm.member_id = members.id AND c.campaign_type = ''sms'' AND cm.delivered_at IS NOT NULL) < %L::TIMESTAMPTZ', v_value)
      WHEN v_field = 'lastSmsDeliveredAt' AND v_operator = 'in_last_days' THEN
        format('(SELECT MAX(cm.delivered_at) FROM campaign_messages cm JOIN campaigns c ON c.id = cm.campaign_id WHERE cm.member_id = members.id AND c.campaign_type = ''sms'' AND cm.delivered_at IS NOT NULL) > NOW() - INTERVAL ''%s days''', v_value::INTEGER)

      ELSE NULL
    END;

    IF v_clause IS NOT NULL THEN
      v_clauses := array_append(v_clauses, v_clause);
    END IF;
  END LOOP;

  -- Process nested groups (Item 5: recursive nesting)
  FOR v_group IN SELECT * FROM jsonb_array_elements(v_groups) LOOP
    v_clause := build_segment_where_clause(v_group, p_depth + 1);
    IF v_clause IS NOT NULL AND v_clause != 'TRUE' THEN
      v_clauses := array_append(v_clauses, '(' || v_clause || ')');
    END IF;
  END LOOP;

  -- Return combined clauses
  IF array_length(v_clauses, 1) IS NULL OR array_length(v_clauses, 1) = 0 THEN
    RETURN 'TRUE';
  ELSE
    RETURN array_to_string(v_clauses, v_join_op);
  END IF;
END;
$$;

-- Replace estimate_segment_size to use the recursive helper
CREATE OR REPLACE FUNCTION estimate_segment_size(p_rules JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_where TEXT;
  v_query TEXT;
BEGIN
  v_where := build_segment_where_clause(p_rules);

  IF v_where = 'TRUE' THEN
    SELECT COUNT(*) INTO v_count FROM members WHERE is_active = TRUE;
  ELSE
    v_query := 'SELECT COUNT(*) FROM members WHERE is_active = TRUE AND (' || v_where || ')';
    EXECUTE v_query INTO v_count;
  END IF;

  RETURN v_count;
END;
$$;

-- Item 4: Preview segment members
CREATE OR REPLACE FUNCTION preview_segment_members(p_rules JSONB, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  membership_status TEXT,
  lifetime_value NUMERIC,
  total_visits INTEGER,
  last_visit_at TIMESTAMPTZ,
  city TEXT,
  state TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_where TEXT;
  v_query TEXT;
BEGIN
  v_where := build_segment_where_clause(p_rules);

  v_query := 'SELECT id, first_name, last_name, email, phone, membership_status, '
    || 'lifetime_value, total_visits, last_visit_at, city, state '
    || 'FROM members WHERE is_active = TRUE';

  IF v_where != 'TRUE' THEN
    v_query := v_query || ' AND (' || v_where || ')';
  END IF;

  v_query := v_query || ' ORDER BY last_name, first_name LIMIT ' || p_limit;

  RETURN QUERY EXECUTE v_query;
END;
$$;

-- Item 7: Template performance stats
CREATE OR REPLACE FUNCTION get_all_template_stats()
RETURNS TABLE (
  template_id UUID,
  times_used BIGINT,
  avg_open_rate NUMERIC,
  avg_click_rate NUMERIC,
  last_used_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.template_id,
    COUNT(*)::BIGINT AS times_used,
    ROUND(AVG(
      CASE WHEN c.total_delivered > 0
        THEN (c.total_opened::NUMERIC / c.total_delivered) * 100
        ELSE 0
      END
    ), 1) AS avg_open_rate,
    ROUND(AVG(
      CASE WHEN c.total_opened > 0
        THEN (c.total_clicked::NUMERIC / c.total_opened) * 100
        ELSE 0
      END
    ), 1) AS avg_click_rate,
    MAX(c.started_at) AS last_used_at
  FROM campaigns c
  WHERE c.template_id IS NOT NULL
    AND c.status IN ('sent', 'sending')
  GROUP BY c.template_id;
END;
$$;

-- Item 10: Device breakdown
CREATE OR REPLACE FUNCTION get_campaign_device_breakdown(p_campaign_id UUID)
RETURNS TABLE (
  device_type TEXT,
  count BIGINT,
  rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total BIGINT;
BEGIN
  -- Count messages that have device info
  SELECT COUNT(*) INTO v_total
  FROM campaign_messages
  WHERE campaign_id = p_campaign_id AND campaign_messages.device_type IS NOT NULL;

  IF v_total = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(cm.device_type, 'unknown')::TEXT,
    COUNT(*)::BIGINT,
    ROUND((COUNT(*)::NUMERIC / v_total) * 100, 1) AS rate
  FROM campaign_messages cm
  WHERE cm.campaign_id = p_campaign_id AND cm.device_type IS NOT NULL
  GROUP BY cm.device_type
  ORDER BY COUNT(*) DESC;
END;
$$;

-- =============================================================================
-- Section 4: Seed Data
-- =============================================================================

-- Item 2: Update starter templates with tags (system templates have NULL user_id)
DO $$
BEGIN
  -- SMS templates
  UPDATE campaign_templates SET tags = ARRAY['welcome', 'onboarding']
    WHERE name = 'Welcome Message' AND is_system = TRUE;
  UPDATE campaign_templates SET tags = ARRAY['reminder', 'appointment']
    WHERE name = 'Appointment Reminder' AND is_system = TRUE;
  UPDATE campaign_templates SET tags = ARRAY['promotion', 'sale']
    WHERE name = 'Promotional Offer' AND is_system = TRUE;
  UPDATE campaign_templates SET tags = ARRAY['win-back', 're-engagement']
    WHERE name = 'Win-Back Message' AND is_system = TRUE;

  -- Email templates
  UPDATE campaign_templates SET tags = ARRAY['welcome', 'onboarding']
    WHERE name = 'Welcome Email' AND is_system = TRUE;
  UPDATE campaign_templates SET tags = ARRAY['promotion', 'sale']
    WHERE name = 'Promotional Sale' AND is_system = TRUE;
  UPDATE campaign_templates SET tags = ARRAY['newsletter', 'update']
    WHERE name = 'Monthly Newsletter' AND is_system = TRUE;
  UPDATE campaign_templates SET tags = ARRAY['event', 'invitation']
    WHERE name = 'Event Invitation' AND is_system = TRUE;
  UPDATE campaign_templates SET tags = ARRAY['renewal', 'membership']
    WHERE name = 'Membership Renewal' AND is_system = TRUE;
  UPDATE campaign_templates SET tags = ARRAY['feedback', 'survey']
    WHERE name = 'Feedback Request' AND is_system = TRUE;
END $$;

-- Item 9: Allow NULL user_id on audience_segments for system segments
ALTER TABLE audience_segments ALTER COLUMN user_id DROP NOT NULL;

-- Item 9: Seed system segment templates (NULL user_id for system segments)
DO $$
BEGIN

INSERT INTO audience_segments (user_id, name, description, rules, is_system, estimated_size)
SELECT NULL, 'High Value Members', 'Active members with lifetime value over $500',
  '{"logic": "AND", "conditions": [{"id": "sys-1", "field": "lifetimeValue", "operator": "greater_than", "value": "500"}, {"id": "sys-2", "field": "membershipStatus", "operator": "equals", "value": "active"}]}'::JSONB,
  TRUE, 0
WHERE NOT EXISTS (
  SELECT 1 FROM audience_segments WHERE name = 'High Value Members' AND is_system = TRUE
);

INSERT INTO audience_segments (user_id, name, description, rules, is_system, estimated_size)
SELECT NULL, 'At-Risk Members', 'Active members who have not visited in the last 60 days',
  '{"logic": "AND", "conditions": [{"id": "sys-3", "field": "lastVisitAt", "operator": "before", "value": "60"}, {"id": "sys-4", "field": "membershipStatus", "operator": "equals", "value": "active"}]}'::JSONB,
  TRUE, 0
WHERE NOT EXISTS (
  SELECT 1 FROM audience_segments WHERE name = 'At-Risk Members' AND is_system = TRUE
);

INSERT INTO audience_segments (user_id, name, description, rules, is_system, estimated_size)
SELECT NULL, 'New Members', 'Members who visited in the last 30 days',
  '{"logic": "AND", "conditions": [{"id": "sys-5", "field": "lastVisitAt", "operator": "in_last_days", "value": "30"}]}'::JSONB,
  TRUE, 0
WHERE NOT EXISTS (
  SELECT 1 FROM audience_segments WHERE name = 'New Members' AND is_system = TRUE
);

INSERT INTO audience_segments (user_id, name, description, rules, is_system, estimated_size)
SELECT NULL, 'Inactive Members', 'Members who have not visited in 90 days',
  '{"logic": "AND", "conditions": [{"id": "sys-6", "field": "lastVisitAt", "operator": "before", "value": "90"}]}'::JSONB,
  TRUE, 0
WHERE NOT EXISTS (
  SELECT 1 FROM audience_segments WHERE name = 'Inactive Members' AND is_system = TRUE
);

INSERT INTO audience_segments (user_id, name, description, rules, is_system, estimated_size)
SELECT NULL, 'VIP', 'High-value members with over $1000 LTV and 20+ visits',
  '{"logic": "AND", "conditions": [{"id": "sys-7", "field": "lifetimeValue", "operator": "greater_than", "value": "1000"}, {"id": "sys-8", "field": "totalVisits", "operator": "greater_than", "value": "20"}]}'::JSONB,
  TRUE, 0
WHERE NOT EXISTS (
  SELECT 1 FROM audience_segments WHERE name = 'VIP' AND is_system = TRUE
);

END $$;

-- =============================================================================
-- Down migration (in comments)
-- =============================================================================

-- DROP FUNCTION IF EXISTS get_campaign_device_breakdown;
-- DROP FUNCTION IF EXISTS get_all_template_stats;
-- DROP FUNCTION IF EXISTS preview_segment_members;
-- DROP FUNCTION IF EXISTS build_segment_where_clause;
-- ALTER TABLE campaign_templates DROP COLUMN IF EXISTS tags;
-- ALTER TABLE campaign_messages DROP COLUMN IF EXISTS device_type;
-- ALTER TABLE campaign_messages DROP COLUMN IF EXISTS user_agent;
-- ALTER TABLE audience_segments DROP COLUMN IF EXISTS is_system;
-- DELETE FROM audience_segments WHERE is_system = TRUE;
