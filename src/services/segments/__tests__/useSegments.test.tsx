/**
 * useSegments hooks tests
 *
 * Tests React Query hooks that wrap segmentService.
 * Mocks the service module (not Supabase directly).
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test/helpers';
import type { SegmentRuleGroup } from '@/types/segment';

const mockSegmentService = vi.hoisted(() => ({
  getSegments: vi.fn(),
  getSegmentById: vi.fn(),
  createSegment: vi.fn(),
  updateSegment: vi.fn(),
  deleteSegment: vi.fn(),
  estimateSegmentSize: vi.fn(),
  previewSegmentMembers: vi.fn(),
  duplicateSegment: vi.fn(),
}));

vi.mock('../segmentService', () => ({
  segmentService: mockSegmentService,
}));

import {
  useSegments,
  useSegment,
  useCreateSegment,
  useUpdateSegment,
  useDeleteSegment,
  useEstimateSegmentSize,
  usePreviewSegmentMembers,
  useDuplicateSegment,
} from '../useSegments';

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('useSegments hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useSegments should call segmentService.getSegments', async () => {
    mockSegmentService.getSegments.mockResolvedValue([
      { id: 's-1', name: 'VIP Members' },
      { id: 's-2', name: 'Inactive' },
    ]);

    const { result } = renderHook(() => useSegments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSegmentService.getSegments).toHaveBeenCalled();
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].name).toBe('VIP Members');
  });

  it('useSegment should call segmentService.getSegmentById with the provided id', async () => {
    const segment = {
      id: 's-1',
      name: 'VIP Members',
      rules: { logic: 'AND', conditions: [] },
    };
    mockSegmentService.getSegmentById.mockResolvedValue(segment);

    const { result } = renderHook(() => useSegment('s-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSegmentService.getSegmentById).toHaveBeenCalledWith('s-1');
    expect(result.current.data).toEqual(segment);
  });

  it('useCreateSegment should call segmentService.createSegment with input', async () => {
    const newSegment = {
      id: 's-new',
      name: 'High Value',
      rules: { logic: 'AND' as const, conditions: [] },
    };
    mockSegmentService.createSegment.mockResolvedValue(newSegment);

    const { result } = renderHook(() => useCreateSegment(), {
      wrapper: createWrapper(),
    });

    const input = {
      name: 'High Value',
      rules: { logic: 'AND' as const, conditions: [] },
    };

    await act(async () => {
      await result.current.mutateAsync(input);
    });

    expect(mockSegmentService.createSegment).toHaveBeenCalledWith(input);
  });

  it('useUpdateSegment should call segmentService.updateSegment with id and input', async () => {
    const updatedSegment = {
      id: 's-1',
      name: 'Renamed Segment',
      rules: { logic: 'AND' as const, conditions: [] },
    };
    mockSegmentService.updateSegment.mockResolvedValue(updatedSegment);

    const { result } = renderHook(() => useUpdateSegment(), {
      wrapper: createWrapper(),
    });

    const input = { name: 'Renamed Segment' };

    await act(async () => {
      await result.current.mutateAsync({ id: 's-1', input });
    });

    expect(mockSegmentService.updateSegment).toHaveBeenCalledWith('s-1', input);
  });

  it('useDeleteSegment should call segmentService.deleteSegment with id', async () => {
    mockSegmentService.deleteSegment.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteSegment(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync('s-1');
    });

    expect(mockSegmentService.deleteSegment).toHaveBeenCalledWith('s-1');
  });

  it('useEstimateSegmentSize should call segmentService.estimateSegmentSize when rules have conditions', async () => {
    mockSegmentService.estimateSegmentSize.mockResolvedValue(42);

    const rules: SegmentRuleGroup = {
      logic: 'AND',
      conditions: [
        { id: 'c-1', field: 'email', operator: 'is_not_empty', value: '' },
      ],
    };

    const { result } = renderHook(() => useEstimateSegmentSize(rules), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSegmentService.estimateSegmentSize).toHaveBeenCalledWith(rules);
    expect(result.current.data).toBe(42);
  });

  it('usePreviewSegmentMembers should call segmentService.previewSegmentMembers when rules have conditions', async () => {
    const members = [
      { id: 'm-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
      { id: 'm-2', firstName: 'John', lastName: 'Smith', email: 'john@example.com' },
    ];
    mockSegmentService.previewSegmentMembers.mockResolvedValue(members);

    const rules: SegmentRuleGroup = {
      logic: 'OR',
      conditions: [
        { id: 'c-1', field: 'lifetimeValue', operator: 'greater_than', value: '100' },
      ],
    };

    const { result } = renderHook(() => usePreviewSegmentMembers(rules), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSegmentService.previewSegmentMembers).toHaveBeenCalledWith(rules);
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].firstName).toBe('Jane');
  });

  it('useDuplicateSegment should call segmentService.duplicateSegment with segmentId', async () => {
    const duplicated = {
      id: 's-copy',
      name: 'VIP Members (Copy)',
      rules: { logic: 'AND' as const, conditions: [] },
    };
    mockSegmentService.duplicateSegment.mockResolvedValue(duplicated);

    const { result } = renderHook(() => useDuplicateSegment(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      const returned = await result.current.mutateAsync('s-1');
      expect(returned).toEqual(duplicated);
    });

    expect(mockSegmentService.duplicateSegment).toHaveBeenCalledWith('s-1');
  });
});
