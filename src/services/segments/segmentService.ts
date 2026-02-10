/**
 * Segment Service
 * CRUD operations and size estimation for audience segments
 */

import { supabase } from '@/lib/supabase';
import type {
  AudienceSegment,
  CreateSegmentInput,
  UpdateSegmentInput,
  SegmentRuleGroup,
  SegmentPreviewMember,
} from '@/types/segment';

// =============================================================================
// Transform
// =============================================================================

interface SegmentRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  rules: SegmentRuleGroup;
  is_dynamic: boolean;
  is_system: boolean;
  estimated_size: number;
  created_at: string;
  updated_at: string;
}

function transformSegment(row: SegmentRow): AudienceSegment {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    rules: row.rules,
    isDynamic: row.is_dynamic ?? true,
    isSystem: row.is_system ?? false,
    estimatedSize: row.estimated_size ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// =============================================================================
// CRUD
// =============================================================================

/**
 * Fetch all segments for the current user
 */
export async function getSegments(): Promise<AudienceSegment[]> {
  const { data, error } = await supabase
    .from('audience_segments')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw new Error('Failed to fetch segments');
  return (data || []).map(transformSegment);
}

/**
 * Fetch a single segment by ID
 */
export async function getSegmentById(id: string): Promise<AudienceSegment | null> {
  const { data, error } = await supabase
    .from('audience_segments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error('Failed to fetch segment');
  }
  return data ? transformSegment(data) : null;
}

/**
 * Create a new segment
 */
export async function createSegment(input: CreateSegmentInput): Promise<AudienceSegment> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('audience_segments')
    .insert({
      user_id: userData.user.id,
      name: input.name,
      description: input.description ?? null,
      rules: input.rules,
      is_dynamic: input.isDynamic ?? true,
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create segment');
  return transformSegment(data);
}

/**
 * Update an existing segment
 */
export async function updateSegment(
  id: string,
  input: UpdateSegmentInput,
): Promise<AudienceSegment> {
  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.rules !== undefined) updateData.rules = input.rules;
  if (input.isDynamic !== undefined) updateData.is_dynamic = input.isDynamic;

  const { data, error } = await supabase
    .from('audience_segments')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error('Failed to update segment');
  return transformSegment(data);
}

/**
 * Delete a segment
 */
export async function deleteSegment(id: string): Promise<void> {
  const { error } = await supabase
    .from('audience_segments')
    .delete()
    .eq('id', id);

  if (error) throw new Error('Failed to delete segment');
}

// =============================================================================
// Estimation
// =============================================================================

/**
 * Estimate the number of members matching the given rules
 */
export async function estimateSegmentSize(rules: SegmentRuleGroup): Promise<number> {
  const { data, error } = await supabase.rpc('estimate_segment_size', {
    p_rules: rules,
  });

  if (error) throw new Error('Failed to estimate segment size');
  return typeof data === 'number' ? data : 0;
}

// =============================================================================
// Preview (Item 4)
// =============================================================================

/**
 * Preview members matching segment rules
 */
export async function previewSegmentMembers(
  rules: SegmentRuleGroup,
  limit = 20,
): Promise<SegmentPreviewMember[]> {
  const { data, error } = await supabase.rpc('preview_segment_members', {
    p_rules: rules,
    p_limit: limit,
  });

  if (error) throw new Error('Failed to preview segment members');
  if (!data) return [];

  return (data as Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    membership_status: string;
    lifetime_value: number;
    total_visits: number;
    last_visit_at: string | null;
    city: string | null;
    state: string | null;
  }>).map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    membershipStatus: row.membership_status,
    lifetimeValue: Number(row.lifetime_value),
    totalVisits: Number(row.total_visits),
    lastVisitAt: row.last_visit_at,
    city: row.city,
    state: row.state,
  }));
}

// =============================================================================
// Duplicate (Item 9)
// =============================================================================

/**
 * Duplicate a segment (e.g., use a system segment as a template)
 */
export async function duplicateSegment(segmentId: string): Promise<AudienceSegment> {
  const source = await getSegmentById(segmentId);
  if (!source) throw new Error('Segment not found');

  return createSegment({
    name: `${source.name} (Copy)`,
    description: source.description,
    rules: source.rules,
    isDynamic: source.isDynamic,
  });
}

// =============================================================================
// Export
// =============================================================================

export const segmentService = {
  getSegments,
  getSegmentById,
  createSegment,
  updateSegment,
  deleteSegment,
  estimateSegmentSize,
  previewSegmentMembers,
  duplicateSegment,
};
