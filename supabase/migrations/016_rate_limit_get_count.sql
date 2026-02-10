-- Migration: 016_rate_limit_get_count
-- Description: Add function to get failed attempt count for rate limiting UI
-- Author: Claude
-- Date: 2026-02-10

-- This function supports the "X attempts remaining" UI message
-- by returning the count of recent failed login attempts.
-- Complements existing functions from migration 001:
--   is_account_locked, get_lockout_time_remaining,
--   record_login_attempt, reset_login_attempts

CREATE OR REPLACE FUNCTION get_failed_attempt_count(user_email TEXT)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM login_attempts
  WHERE email = lower(trim(user_email))
    AND success = FALSE
    AND attempted_at > NOW() - INTERVAL '15 minutes';
$$ LANGUAGE SQL SECURITY DEFINER;
