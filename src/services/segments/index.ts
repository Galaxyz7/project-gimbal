/**
 * Segment Services
 * Exports for audience segmentation functionality
 */

export { segmentService } from './segmentService';

export {
  useSegments,
  useSegment,
  useCreateSegment,
  useUpdateSegment,
  useDeleteSegment,
  useEstimateSegmentSize,
  usePreviewSegmentMembers,
  useDuplicateSegment,
} from './useSegments';

export type {
  AudienceSegment,
  CreateSegmentInput,
  UpdateSegmentInput,
  SegmentCondition,
  SegmentRuleGroup,
  SegmentLogic,
  SegmentOperator,
  SegmentFieldDef,
  SegmentPreviewMember,
} from '@/types/segment';
