/**
 * Segment React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { segmentKeys } from '@/lib/queryKeys';
import { segmentService } from './segmentService';
import type { CreateSegmentInput, UpdateSegmentInput, SegmentRuleGroup } from '@/types/segment';

/**
 * Fetch all segments
 */
export function useSegments() {
  return useQuery({
    queryKey: segmentKeys.lists(),
    queryFn: () => segmentService.getSegments(),
  });
}

/**
 * Fetch a single segment
 */
export function useSegment(id: string) {
  return useQuery({
    queryKey: segmentKeys.detail(id),
    queryFn: () => segmentService.getSegmentById(id),
    enabled: !!id,
  });
}

/**
 * Create a new segment
 */
export function useCreateSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSegmentInput) => segmentService.createSegment(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: segmentKeys.all });
    },
  });
}

/**
 * Update a segment
 */
export function useUpdateSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSegmentInput }) =>
      segmentService.updateSegment(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: segmentKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: segmentKeys.lists() });
    },
  });
}

/**
 * Delete a segment
 */
export function useDeleteSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => segmentService.deleteSegment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: segmentKeys.all });
    },
  });
}

/**
 * Estimate segment size (debounced by caller)
 */
export function useEstimateSegmentSize(rules: SegmentRuleGroup | null) {
  return useQuery({
    queryKey: segmentKeys.estimate(rules),
    queryFn: () => segmentService.estimateSegmentSize(rules!),
    enabled: !!rules && (rules.conditions?.length ?? 0) > 0,
    staleTime: 30 * 1000,
  });
}

/**
 * Preview members matching segment rules
 */
export function usePreviewSegmentMembers(rules: SegmentRuleGroup | null) {
  return useQuery({
    queryKey: [...segmentKeys.all, 'preview', rules],
    queryFn: () => segmentService.previewSegmentMembers(rules!),
    enabled: !!rules && (rules.conditions?.length ?? 0) > 0,
  });
}

/**
 * Duplicate a segment (e.g. use a system segment as template)
 */
export function useDuplicateSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (segmentId: string) => segmentService.duplicateSegment(segmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: segmentKeys.all });
    },
  });
}
