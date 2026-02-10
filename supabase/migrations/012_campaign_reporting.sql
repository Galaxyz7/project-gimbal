-- Migration: 012_campaign_reporting
-- Description: Add DB functions for campaign reporting (timeline, funnel, top engaged, error summary)
-- Date: 2025-02-09

-- =============================================================================
-- get_campaign_timeline: Time-bucketed message status counts
-- =============================================================================

CREATE OR REPLACE FUNCTION get_campaign_timeline(
  p_campaign_id UUID,
  p_interval TEXT DEFAULT 'hour'
)
RETURNS TABLE (
  time_bucket TIMESTAMPTZ,
  sent BIGINT,
  delivered BIGINT,
  opened BIGINT,
  clicked BIGINT,
  failed BIGINT,
  bounced BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    date_trunc(p_interval, cm.sent_at) AS time_bucket,
    COUNT(*) FILTER (WHERE cm.status IN ('sent', 'delivered', 'opened', 'clicked')) AS sent,
    COUNT(*) FILTER (WHERE cm.status IN ('delivered', 'opened', 'clicked')) AS delivered,
    COUNT(*) FILTER (WHERE cm.status IN ('opened', 'clicked')) AS opened,
    COUNT(*) FILTER (WHERE cm.status = 'clicked') AS clicked,
    COUNT(*) FILTER (WHERE cm.status = 'failed') AS failed,
    COUNT(*) FILTER (WHERE cm.status = 'bounced') AS bounced
  FROM campaign_messages cm
  WHERE cm.campaign_id = p_campaign_id
    AND cm.sent_at IS NOT NULL
  GROUP BY date_trunc(p_interval, cm.sent_at)
  ORDER BY time_bucket ASC;
END;
$$;

-- =============================================================================
-- get_campaign_funnel: Sent -> Delivered -> Opened -> Clicked with drop-off %
-- =============================================================================

CREATE OR REPLACE FUNCTION get_campaign_funnel(p_campaign_id UUID)
RETURNS TABLE (
  stage TEXT,
  count BIGINT,
  rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total BIGINT;
  v_sent BIGINT;
  v_delivered BIGINT;
  v_opened BIGINT;
  v_clicked BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM campaign_messages WHERE campaign_id = p_campaign_id;

  SELECT COUNT(*) INTO v_sent
  FROM campaign_messages
  WHERE campaign_id = p_campaign_id
    AND status IN ('sent', 'delivered', 'opened', 'clicked');

  SELECT COUNT(*) INTO v_delivered
  FROM campaign_messages
  WHERE campaign_id = p_campaign_id
    AND status IN ('delivered', 'opened', 'clicked');

  SELECT COUNT(*) INTO v_opened
  FROM campaign_messages
  WHERE campaign_id = p_campaign_id
    AND status IN ('opened', 'clicked');

  SELECT COUNT(*) INTO v_clicked
  FROM campaign_messages
  WHERE campaign_id = p_campaign_id
    AND status = 'clicked';

  RETURN QUERY VALUES
    ('queued'::TEXT, v_total, 100.0::NUMERIC),
    ('sent'::TEXT, v_sent, CASE WHEN v_total > 0 THEN ROUND((v_sent::NUMERIC / v_total) * 100, 1) ELSE 0 END),
    ('delivered'::TEXT, v_delivered, CASE WHEN v_total > 0 THEN ROUND((v_delivered::NUMERIC / v_total) * 100, 1) ELSE 0 END),
    ('opened'::TEXT, v_opened, CASE WHEN v_total > 0 THEN ROUND((v_opened::NUMERIC / v_total) * 100, 1) ELSE 0 END),
    ('clicked'::TEXT, v_clicked, CASE WHEN v_total > 0 THEN ROUND((v_clicked::NUMERIC / v_total) * 100, 1) ELSE 0 END);
END;
$$;

-- =============================================================================
-- Indexes for efficient reporting queries
-- =============================================================================

-- Support timeline queries: group by sent_at
CREATE INDEX IF NOT EXISTS idx_campaign_messages_timeline
  ON campaign_messages (campaign_id, sent_at)
  WHERE sent_at IS NOT NULL;

-- Support error summary: group by error_message
CREATE INDEX IF NOT EXISTS idx_campaign_messages_errors
  ON campaign_messages (campaign_id, status)
  WHERE status IN ('failed', 'bounced');
