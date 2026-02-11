/**
 * Member Note Service
 *
 * CRUD operations for member activity notes.
 */

import { supabase } from '@/lib/supabase';
import type { MemberNote, CreateNoteInput, UpdateNoteInput } from '@/types/member';

// =============================================================================
// Transforms
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformNote(row: any): MemberNote {
  return {
    id: row.id,
    userId: row.user_id,
    memberId: row.member_id,
    noteType: row.note_type,
    content: row.content,
    isPinned: row.is_pinned,
    dueDate: row.due_date ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// =============================================================================
// Service
// =============================================================================

export const memberNoteService = {
  /**
   * Get all notes for a member, pinned first then by created_at DESC
   */
  async getNotes(memberId: string): Promise<MemberNote[]> {
    const { data, error } = await supabase
      .from('member_notes')
      .select('*')
      .eq('member_id', memberId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch notes: ${error.message}`);
    return (data ?? []).map(transformNote);
  },

  /**
   * Create a note
   */
  async createNote(input: CreateNoteInput): Promise<MemberNote> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('member_notes')
      .insert({
        user_id: user.id,
        member_id: input.memberId,
        note_type: input.noteType ?? 'note',
        content: input.content,
        is_pinned: input.isPinned ?? false,
        ...(input.dueDate ? { due_date: input.dueDate } : {}),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create note: ${error.message}`);
    return transformNote(data);
  },

  /**
   * Update a note
   */
  async updateNote(noteId: string, input: UpdateNoteInput): Promise<MemberNote> {
    const updates: Record<string, unknown> = {};
    if (input.noteType !== undefined) updates.note_type = input.noteType;
    if (input.content !== undefined) updates.content = input.content;
    if (input.isPinned !== undefined) updates.is_pinned = input.isPinned;
    if (input.dueDate !== undefined) updates.due_date = input.dueDate;

    const { data, error } = await supabase
      .from('member_notes')
      .update(updates)
      .eq('id', noteId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update note: ${error.message}`);
    return transformNote(data);
  },

  /**
   * Delete a note
   */
  async deleteNote(noteId: string): Promise<void> {
    const { error } = await supabase
      .from('member_notes')
      .delete()
      .eq('id', noteId);

    if (error) throw new Error(`Failed to delete note: ${error.message}`);
  },
};
