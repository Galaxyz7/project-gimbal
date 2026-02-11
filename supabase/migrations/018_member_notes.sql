-- Migration: 018_member_notes
-- Description: Activity notes for member profiles (CRM feature)
-- Date: 2026-02-10

-- Note type enum
CREATE TYPE note_type AS ENUM ('note', 'call', 'meeting', 'email_log', 'follow_up');

-- Member notes table
CREATE TABLE member_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  note_type note_type NOT NULL DEFAULT 'note',
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE member_notes ENABLE ROW LEVEL SECURITY;

-- RLS: Users can CRUD their own notes
CREATE POLICY "Users can read own notes"
  ON member_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes"
  ON member_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON member_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
  ON member_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_member_notes_member_id ON member_notes(member_id);
CREATE INDEX idx_member_notes_user_id ON member_notes(user_id);
CREATE INDEX idx_member_notes_created_at ON member_notes(created_at DESC);
CREATE INDEX idx_member_notes_note_type ON member_notes(note_type);

-- Reuse existing updated_at trigger
CREATE TRIGGER update_member_notes_updated_at
  BEFORE UPDATE ON member_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Down migration (in comments)
-- DROP TRIGGER IF EXISTS update_member_notes_updated_at ON member_notes;
-- DROP TABLE IF EXISTS member_notes;
-- DROP TYPE IF EXISTS note_type;
