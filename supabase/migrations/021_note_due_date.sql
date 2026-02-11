-- Migration: 021_note_due_date
-- Description: Add due_date column to member_notes for follow-up tracking
-- Date: 2026-02-11

ALTER TABLE member_notes ADD COLUMN due_date DATE;

CREATE INDEX idx_member_notes_due_date ON member_notes(due_date) WHERE due_date IS NOT NULL;
