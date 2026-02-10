
import {
  getSegments,
  getSegmentById,
  createSegment,
  updateSegment,
  deleteSegment,
  estimateSegmentSize,
} from '../segmentService';
import type { SegmentRuleGroup } from '@/types/segment';

// =============================================================================
// Mock Supabase
// =============================================================================

const { mockRpc, mockSingle, mockQueryChain, mockGetUser } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockRpc = vi.fn();
  const mockGetUser = vi.fn();
  const mockQueryChain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    single: mockSingle,
    then: vi.fn(),
  };
  for (const key of Object.keys(mockQueryChain)) {
    if (key !== 'single' && key !== 'then') {
      mockQueryChain[key].mockReturnValue(mockQueryChain);
    }
  }
  return { mockRpc, mockSingle, mockQueryChain, mockGetUser };
});

const resolvableChain = (result: { data: unknown; error: unknown }) => {
  Object.defineProperty(mockQueryChain, 'then', {
    value: vi.fn((resolve: (val: unknown) => void) => resolve(result)),
    writable: true,
    configurable: true,
  });
  mockSingle.mockResolvedValue(result);
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockQueryChain),
    rpc: mockRpc,
    auth: { getUser: mockGetUser },
  },
}));

// =============================================================================
// Fixtures
// =============================================================================

const mockRules: SegmentRuleGroup = {
  logic: 'AND',
  conditions: [
    { field: 'membershipStatus', operator: 'equals', value: 'active' },
  ],
};

const mockSegmentRow = {
  id: 'seg-1',
  user_id: 'user-1',
  name: 'Active Members',
  description: 'All active members',
  rules: mockRules,
  is_dynamic: true,
  estimated_size: 150,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-15T00:00:00Z',
};

const mockSegmentRow2 = {
  id: 'seg-2',
  user_id: 'user-1',
  name: 'High Value',
  description: null,
  rules: { logic: 'AND' as const, conditions: [{ field: 'lifetimeValue', operator: 'greater_than' as const, value: '1000' }] },
  is_dynamic: true,
  estimated_size: 42,
  created_at: '2025-01-02T00:00:00Z',
  updated_at: '2025-01-16T00:00:00Z',
};

// =============================================================================
// Tests
// =============================================================================

describe('segmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolvableChain({ data: [], error: null });
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
  });

  // ---------------------------------------------------------------------------
  // getSegments
  // ---------------------------------------------------------------------------

  describe('getSegments', () => {
    it('should fetch all segments and transform them', async () => {
      resolvableChain({ data: [mockSegmentRow, mockSegmentRow2], error: null });

      const result = await getSegments();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'seg-1',
        userId: 'user-1',
        name: 'Active Members',
        description: 'All active members',
        rules: mockRules,
        isDynamic: true,
        isSystem: false,
        estimatedSize: 150,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-15T00:00:00Z',
      });
    });

    it('should return empty array when no segments exist', async () => {
      resolvableChain({ data: [], error: null });

      const result = await getSegments();
      expect(result).toEqual([]);
    });

    it('should return empty array when data is null', async () => {
      resolvableChain({ data: null, error: null });

      const result = await getSegments();
      expect(result).toEqual([]);
    });

    it('should throw on error', async () => {
      resolvableChain({ data: null, error: { message: 'DB error' } });

      await expect(getSegments()).rejects.toThrow('Failed to fetch segments');
    });

    it('should order by updated_at descending', async () => {
      resolvableChain({ data: [], error: null });

      await getSegments();

      expect(mockQueryChain.order).toHaveBeenCalledWith('updated_at', { ascending: false });
    });
  });

  // ---------------------------------------------------------------------------
  // getSegmentById
  // ---------------------------------------------------------------------------

  describe('getSegmentById', () => {
    it('should fetch a segment by ID and transform it', async () => {
      mockSingle.mockResolvedValue({ data: mockSegmentRow, error: null });

      const result = await getSegmentById('seg-1');

      expect(result).toEqual({
        id: 'seg-1',
        userId: 'user-1',
        name: 'Active Members',
        description: 'All active members',
        rules: mockRules,
        isDynamic: true,
        isSystem: false,
        estimatedSize: 150,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-15T00:00:00Z',
      });
      expect(mockQueryChain.eq).toHaveBeenCalledWith('id', 'seg-1');
    });

    it('should return null when segment is not found (PGRST116)', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      const result = await getSegmentById('non-existent');
      expect(result).toBeNull();
    });

    it('should return null when data is null and no error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });

      const result = await getSegmentById('seg-1');
      expect(result).toBeNull();
    });

    it('should throw on non-404 errors', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST500', message: 'Internal' } });

      await expect(getSegmentById('seg-1')).rejects.toThrow('Failed to fetch segment');
    });
  });

  // ---------------------------------------------------------------------------
  // createSegment
  // ---------------------------------------------------------------------------

  describe('createSegment', () => {
    it('should create a segment and return transformed result', async () => {
      mockSingle.mockResolvedValue({ data: mockSegmentRow, error: null });

      const result = await createSegment({
        name: 'Active Members',
        description: 'All active members',
        rules: mockRules,
      });

      expect(result.id).toBe('seg-1');
      expect(result.name).toBe('Active Members');
      expect(mockQueryChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          name: 'Active Members',
          description: 'All active members',
          rules: mockRules,
          is_dynamic: true,
        }),
      );
    });

    it('should throw if not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(
        createSegment({ name: 'Test', rules: mockRules }),
      ).rejects.toThrow('Not authenticated');
    });

    it('should throw on insert error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Insert failed' } });

      await expect(
        createSegment({ name: 'Test', rules: mockRules }),
      ).rejects.toThrow('Failed to create segment');
    });

    it('should default isDynamic to true', async () => {
      mockSingle.mockResolvedValue({ data: mockSegmentRow, error: null });

      await createSegment({ name: 'Test', rules: mockRules });

      expect(mockQueryChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ is_dynamic: true }),
      );
    });

    it('should pass isDynamic false when specified', async () => {
      mockSingle.mockResolvedValue({ data: mockSegmentRow, error: null });

      await createSegment({ name: 'Test', rules: mockRules, isDynamic: false });

      expect(mockQueryChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ is_dynamic: false }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // updateSegment
  // ---------------------------------------------------------------------------

  describe('updateSegment', () => {
    it('should update a segment and return transformed result', async () => {
      const updatedRow = { ...mockSegmentRow, name: 'Updated Name' };
      mockSingle.mockResolvedValue({ data: updatedRow, error: null });

      const result = await updateSegment('seg-1', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      expect(mockQueryChain.update).toHaveBeenCalledWith({ name: 'Updated Name' });
      expect(mockQueryChain.eq).toHaveBeenCalledWith('id', 'seg-1');
    });

    it('should only include defined fields in update payload', async () => {
      mockSingle.mockResolvedValue({ data: mockSegmentRow, error: null });

      await updateSegment('seg-1', { name: 'New Name' });

      expect(mockQueryChain.update).toHaveBeenCalledWith({ name: 'New Name' });
    });

    it('should handle updating rules', async () => {
      const newRules: SegmentRuleGroup = {
        logic: 'OR',
        conditions: [
          { field: 'city', operator: 'equals', value: 'New York' },
        ],
      };
      mockSingle.mockResolvedValue({ data: { ...mockSegmentRow, rules: newRules }, error: null });

      const result = await updateSegment('seg-1', { rules: newRules });

      expect(result.rules.logic).toBe('OR');
      expect(mockQueryChain.update).toHaveBeenCalledWith({ rules: newRules });
    });

    it('should handle updating description and isDynamic', async () => {
      mockSingle.mockResolvedValue({ data: mockSegmentRow, error: null });

      await updateSegment('seg-1', { description: 'New desc', isDynamic: false });

      expect(mockQueryChain.update).toHaveBeenCalledWith({
        description: 'New desc',
        is_dynamic: false,
      });
    });

    it('should throw on update error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Update failed' } });

      await expect(updateSegment('seg-1', { name: 'Test' })).rejects.toThrow(
        'Failed to update segment',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // deleteSegment
  // ---------------------------------------------------------------------------

  describe('deleteSegment', () => {
    it('should delete a segment by ID', async () => {
      resolvableChain({ data: null, error: null });

      await deleteSegment('seg-1');

      expect(mockQueryChain.delete).toHaveBeenCalled();
      expect(mockQueryChain.eq).toHaveBeenCalledWith('id', 'seg-1');
    });

    it('should throw on delete error', async () => {
      resolvableChain({ data: null, error: { message: 'Delete failed' } });

      await expect(deleteSegment('seg-1')).rejects.toThrow('Failed to delete segment');
    });
  });

  // ---------------------------------------------------------------------------
  // estimateSegmentSize
  // ---------------------------------------------------------------------------

  describe('estimateSegmentSize', () => {
    it('should call RPC with rules and return count', async () => {
      mockRpc.mockResolvedValue({ data: 150, error: null });

      const result = await estimateSegmentSize(mockRules);

      expect(result).toBe(150);
      expect(mockRpc).toHaveBeenCalledWith('estimate_segment_size', {
        p_rules: mockRules,
      });
    });

    it('should return 0 when data is not a number', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      const result = await estimateSegmentSize(mockRules);
      expect(result).toBe(0);
    });

    it('should return 0 for zero count', async () => {
      mockRpc.mockResolvedValue({ data: 0, error: null });

      const result = await estimateSegmentSize(mockRules);
      expect(result).toBe(0);
    });

    it('should throw on RPC error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } });

      await expect(estimateSegmentSize(mockRules)).rejects.toThrow(
        'Failed to estimate segment size',
      );
    });
  });
});
