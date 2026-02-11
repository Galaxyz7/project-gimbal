/**
 * memberNoteService tests
 * CRUD operations, transforms, error handling
 */

const { mockSingle, mockQueryChain, mockGetUser } = vi.hoisted(() => {
  const mockSingle = vi.fn();

  const mockQueryChain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    single: mockSingle,
  };

  // Make all non-terminal methods chainable
  for (const key of Object.keys(mockQueryChain)) {
    if (key !== 'single' && key !== 'then') {
      mockQueryChain[key].mockReturnValue(mockQueryChain);
    }
  }

  const mockGetUser = vi.fn();

  return { mockSingle, mockQueryChain, mockGetUser };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockQueryChain),
    auth: { getUser: mockGetUser },
  },
}));

import { memberNoteService } from '../memberNoteService';

// =============================================================================
// Fixtures
// =============================================================================

const mockNoteRow = {
  id: 'note-001',
  user_id: 'user-001',
  member_id: 'member-001',
  note_type: 'call',
  content: 'Discussed renewal options',
  is_pinned: false,
  due_date: null,
  created_at: '2025-03-10T10:00:00Z',
  updated_at: '2025-03-10T10:00:00Z',
};

const mockNoteRow2 = {
  id: 'note-002',
  user_id: 'user-001',
  member_id: 'member-001',
  note_type: 'follow_up',
  content: 'Need to check back',
  is_pinned: true,
  due_date: '2025-03-20',
  created_at: '2025-03-15T14:00:00Z',
  updated_at: '2025-03-15T14:00:00Z',
};

function resolvableChain(result: { data: unknown; error: unknown }) {
  Object.defineProperty(mockQueryChain, 'then', {
    value: vi.fn((resolve: (val: unknown) => void) => resolve(result)),
    writable: true,
    configurable: true,
  });
  mockSingle.mockResolvedValue(result);
}

// =============================================================================
// Tests
// =============================================================================

describe('memberNoteService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolvableChain({ data: [], error: null });
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-001' } } });
  });

  describe('getNotes', () => {
    it('should fetch notes for a member', async () => {
      resolvableChain({ data: [mockNoteRow, mockNoteRow2], error: null });

      const result = await memberNoteService.getNotes('member-001');

      expect(result).toHaveLength(2);
      expect(mockQueryChain.eq).toHaveBeenCalledWith('member_id', 'member-001');
      expect(mockQueryChain.order).toHaveBeenCalledWith('is_pinned', { ascending: false });
      expect(mockQueryChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should transform snake_case to camelCase', async () => {
      resolvableChain({ data: [mockNoteRow], error: null });

      const result = await memberNoteService.getNotes('member-001');

      expect(result[0]).toEqual({
        id: 'note-001',
        userId: 'user-001',
        memberId: 'member-001',
        noteType: 'call',
        content: 'Discussed renewal options',
        isPinned: false,
        dueDate: null,
        createdAt: '2025-03-10T10:00:00Z',
        updatedAt: '2025-03-10T10:00:00Z',
      });
    });

    it('should return empty array when data is null', async () => {
      resolvableChain({ data: null, error: null });

      const result = await memberNoteService.getNotes('member-001');
      expect(result).toEqual([]);
    });

    it('should throw on error', async () => {
      resolvableChain({ data: null, error: { message: 'DB error' } });

      await expect(memberNoteService.getNotes('member-001')).rejects.toThrow(
        'Failed to fetch notes'
      );
    });
  });

  describe('createNote', () => {
    it('should create a note with authenticated user', async () => {
      mockSingle.mockResolvedValue({ data: mockNoteRow, error: null });

      const result = await memberNoteService.createNote({
        memberId: 'member-001',
        noteType: 'call',
        content: 'Discussed renewal options',
      });

      expect(mockQueryChain.insert).toHaveBeenCalledWith({
        user_id: 'user-001',
        member_id: 'member-001',
        note_type: 'call',
        content: 'Discussed renewal options',
        is_pinned: false,
      });
      expect(result.id).toBe('note-001');
      expect(result.noteType).toBe('call');
    });

    it('should default noteType to "note"', async () => {
      mockSingle.mockResolvedValue({ data: mockNoteRow, error: null });

      await memberNoteService.createNote({
        memberId: 'member-001',
        content: 'Just a note',
      });

      expect(mockQueryChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ note_type: 'note' })
      );
    });

    it('should default isPinned to false', async () => {
      mockSingle.mockResolvedValue({ data: mockNoteRow, error: null });

      await memberNoteService.createNote({
        memberId: 'member-001',
        content: 'Not pinned',
      });

      expect(mockQueryChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ is_pinned: false })
      );
    });

    it('should throw if not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      await expect(
        memberNoteService.createNote({
          memberId: 'member-001',
          content: 'test',
        })
      ).rejects.toThrow('Not authenticated');
    });

    it('should throw on insert error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Insert failed' } });

      await expect(
        memberNoteService.createNote({
          memberId: 'member-001',
          content: 'test',
        })
      ).rejects.toThrow('Failed to create note');
    });
  });

  describe('updateNote', () => {
    it('should update note fields', async () => {
      const updatedRow = { ...mockNoteRow, content: 'Updated content', is_pinned: true };
      mockSingle.mockResolvedValue({ data: updatedRow, error: null });

      const result = await memberNoteService.updateNote('note-001', {
        content: 'Updated content',
        isPinned: true,
      });

      expect(mockQueryChain.update).toHaveBeenCalledWith({
        content: 'Updated content',
        is_pinned: true,
      });
      expect(mockQueryChain.eq).toHaveBeenCalledWith('id', 'note-001');
      expect(result.content).toBe('Updated content');
    });

    it('should only include defined fields in update', async () => {
      mockSingle.mockResolvedValue({ data: mockNoteRow, error: null });

      await memberNoteService.updateNote('note-001', { isPinned: true });

      expect(mockQueryChain.update).toHaveBeenCalledWith({ is_pinned: true });
    });

    it('should handle noteType update', async () => {
      mockSingle.mockResolvedValue({ data: { ...mockNoteRow, note_type: 'meeting' }, error: null });

      await memberNoteService.updateNote('note-001', { noteType: 'meeting' });

      expect(mockQueryChain.update).toHaveBeenCalledWith({ note_type: 'meeting' });
    });

    it('should throw on update error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Update failed' } });

      await expect(
        memberNoteService.updateNote('note-001', { content: 'new' })
      ).rejects.toThrow('Failed to update note');
    });
  });

  describe('deleteNote', () => {
    it('should delete a note', async () => {
      resolvableChain({ data: null, error: null });

      await memberNoteService.deleteNote('note-001');

      expect(mockQueryChain.delete).toHaveBeenCalled();
      expect(mockQueryChain.eq).toHaveBeenCalledWith('id', 'note-001');
    });

    it('should throw on delete error', async () => {
      resolvableChain({ data: null, error: { message: 'Delete failed' } });

      await expect(memberNoteService.deleteNote('note-001')).rejects.toThrow(
        'Failed to delete note'
      );
    });
  });
});
