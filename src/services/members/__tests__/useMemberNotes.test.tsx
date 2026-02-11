/**
 * useMemberNotes hook tests
 * React Query integration for member notes
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useMemberNotes, useCreateNote, useUpdateNote, useDeleteNote } from '../useMemberNotes';

// =============================================================================
// Mocks
// =============================================================================

const { mockGetNotes, mockCreateNote, mockUpdateNote, mockDeleteNote } = vi.hoisted(() => ({
  mockGetNotes: vi.fn(),
  mockCreateNote: vi.fn(),
  mockUpdateNote: vi.fn(),
  mockDeleteNote: vi.fn(),
}));

vi.mock('../memberNoteService', () => ({
  memberNoteService: {
    getNotes: mockGetNotes,
    createNote: mockCreateNote,
    updateNote: mockUpdateNote,
    deleteNote: mockDeleteNote,
  },
}));

// =============================================================================
// Setup
// =============================================================================

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const mockNote = {
  id: 'note-001',
  userId: 'user-001',
  memberId: 'member-001',
  noteType: 'note' as const,
  content: 'Test note',
  isPinned: false,
  dueDate: null,
  createdAt: '2025-03-10T10:00:00Z',
  updatedAt: '2025-03-10T10:00:00Z',
};

// =============================================================================
// Tests
// =============================================================================

describe('useMemberNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNotes.mockResolvedValue([mockNote]);
  });

  it('should fetch notes for a member', async () => {
    const { result } = renderHook(() => useMemberNotes('member-001'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetNotes).toHaveBeenCalledWith('member-001');
    expect(result.current.data).toEqual([mockNote]);
  });

  it('should not fetch when memberId is empty', () => {
    const { result } = renderHook(() => useMemberNotes(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockGetNotes).not.toHaveBeenCalled();
  });

  it('should handle fetch error', async () => {
    mockGetNotes.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useMemberNotes('member-001'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});

describe('useCreateNote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateNote.mockResolvedValue(mockNote);
  });

  it('should create a note', async () => {
    const { result } = renderHook(() => useCreateNote(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ memberId: 'member-001', content: 'Test note' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCreateNote).toHaveBeenCalledWith({
      memberId: 'member-001',
      content: 'Test note',
    });
  });

  it('should handle create error', async () => {
    mockCreateNote.mockRejectedValue(new Error('Create failed'));

    const { result } = renderHook(() => useCreateNote(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ memberId: 'member-001', content: 'Test' });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useUpdateNote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateNote.mockResolvedValue({ ...mockNote, isPinned: true });
  });

  it('should update a note', async () => {
    const { result } = renderHook(() => useUpdateNote('member-001'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ noteId: 'note-001', input: { isPinned: true } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdateNote).toHaveBeenCalledWith('note-001', { isPinned: true });
  });
});

describe('useDeleteNote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteNote.mockResolvedValue(undefined);
  });

  it('should delete a note', async () => {
    const { result } = renderHook(() => useDeleteNote('member-001'), {
      wrapper: createWrapper(),
    });

    result.current.mutate('note-001');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDeleteNote).toHaveBeenCalledWith('note-001');
  });

  it('should handle delete error', async () => {
    mockDeleteNote.mockRejectedValue(new Error('Delete failed'));

    const { result } = renderHook(() => useDeleteNote('member-001'), {
      wrapper: createWrapper(),
    });

    result.current.mutate('note-001');

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
