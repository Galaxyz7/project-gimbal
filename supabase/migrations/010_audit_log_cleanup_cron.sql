-- Migration: 010_audit_log_cleanup_cron
-- Description: Schedule automatic audit log cleanup (30-day retention for MVP)
-- Date: 2026-02-09

-- Enable pg_cron extension (available on Supabase Pro plans)
-- If pg_cron is not available, this migration can be safely skipped
-- and cleanup can be triggered via an Edge Function + external scheduler
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron extension not available. Audit log cleanup must be scheduled externally.';
END;
$$;

-- Schedule daily cleanup at 2:00 AM UTC
-- Deletes audit logs older than 30 days (MVP retention policy)
DO $outer$
BEGIN
  PERFORM cron.schedule(
    'cleanup-audit-logs',
    '0 2 * * *',
    $$SELECT cleanup_old_audit_logs(30);$$
  );
  RAISE NOTICE 'Audit log cleanup scheduled: daily at 2:00 AM UTC, 30-day retention';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule cron job. Run cleanup_old_audit_logs(30) manually or via external scheduler.';
END;
$outer$;

-- Down migration (in comments)
-- SELECT cron.unschedule('cleanup-audit-logs');
