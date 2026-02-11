/**
 * Member Notes React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memberKeys } from '@/lib/queryKeys';
import { memberNoteService } from './memberNoteService';
import type { CreateNoteInput, UpdateNoteInput } from '@/types/member';

/**
 * Fetch all notes for a member
 */
export function useMemberNotes(memberId: string) {
  return useQuery({
    queryKey: memberKeys.notes(memberId),
    queryFn: () => memberNoteService.getNotes(memberId),
    enabled: !!memberId,
    staleTime: 30_000,
  });
}

/**
 * Create a note
 */
export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateNoteInput) => memberNoteService.createNote(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.notes(variables.memberId) });
    },
  });
}

/**
 * Update a note
 */
export function useUpdateNote(memberId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, input }: { noteId: string; input: UpdateNoteInput }) =>
      memberNoteService.updateNote(noteId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.notes(memberId) });
    },
  });
}

/**
 * Delete a note
 */
export function useDeleteNote(memberId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) => memberNoteService.deleteNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.notes(memberId) });
    },
  });
}
