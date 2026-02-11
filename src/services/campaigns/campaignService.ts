/**
 * Campaign Service
 * CRUD operations for campaigns with consent and compliance checks
 */

import { supabase } from '@/lib/supabase';
import type {
  Campaign,
  CampaignWithDetails,
  CampaignTemplate,
  CreateCampaignInput,
  UpdateCampaignInput,
  CampaignSearchParams,
  CampaignRecipient,
  CampaignMetrics,
  CampaignStatus,
} from '@/types/campaign';

// =============================================================================
// Error Handling
// =============================================================================

interface ServiceError extends Error {
  cause?: Error;
}

function CampaignServiceError(message: string, cause?: Error): ServiceError {
  const error = new Error(message) as ServiceError;
  error.name = 'CampaignServiceError';
  if (cause) {
    error.cause = cause;
  }
  return error;
}

// =============================================================================
// Transform Functions
// =============================================================================

function transformCampaign(row: Record<string, unknown>): Campaign {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    siteId: row.site_id as string | null,
    name: row.name as string,
    description: row.description as string | null,
    campaignType: row.campaign_type as Campaign['campaignType'],
    status: row.status as Campaign['status'],
    templateId: row.template_id as string | null,
    segmentId: row.segment_id as string | null,
    subject: row.subject as string | null,
    content: row.content as string,
    scheduledAt: row.scheduled_at as string | null,
    startedAt: row.started_at as string | null,
    completedAt: row.completed_at as string | null,
    targetAllMembers: row.target_all_members as boolean,
    membershipLevelIds: row.membership_level_ids as string[] | null,
    membershipStatuses: row.membership_statuses as string[],
    requiredTags: row.required_tags as string[] | null,
    excludedTags: row.excluded_tags as string[] | null,
    totalRecipients: row.total_recipients as number,
    totalSent: row.total_sent as number,
    totalDelivered: row.total_delivered as number,
    totalFailed: row.total_failed as number,
    totalOpened: row.total_opened as number,
    totalClicked: row.total_clicked as number,
    totalBounced: row.total_bounced as number,
    totalUnsubscribed: row.total_unsubscribed as number,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    abTestEnabled: (row.ab_test_enabled as boolean) ?? false,
    abVariantBSubject: (row.ab_variant_b_subject as string | null) ?? null,
    abVariantBContent: (row.ab_variant_b_content as string | null) ?? null,
    abTestMetric: (row.ab_test_metric as Campaign['abTestMetric']) ?? null,
    abTestSamplePct: (row.ab_test_sample_pct as number) ?? 50,
    abTestDurationHours: (row.ab_test_duration_hours as number) ?? 24,
    abTestWinner: (row.ab_test_winner as Campaign['abTestWinner']) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function transformCampaignWithDetails(row: Record<string, unknown>): CampaignWithDetails {
  const campaign = transformCampaign(row);

  const result: CampaignWithDetails = { ...campaign };

  if (row.campaign_templates) {
    const template = row.campaign_templates as Record<string, unknown>;
    result.template = {
      id: template.id as string,
      userId: template.user_id as string,
      name: template.name as string,
      description: template.description as string | null,
      templateType: template.template_type as Campaign['campaignType'],
      category: (template.category as CampaignTemplate['category']) ?? null,
      subject: template.subject as string | null,
      content: template.content as string,
      preheader: template.preheader as string | null,
      isActive: template.is_active as boolean,
      isSystem: (template.is_system as boolean) ?? false,
      tags: (template.tags as string[]) ?? [],
      createdAt: template.created_at as string,
      updatedAt: template.updated_at as string,
    };
  }

  if (row.sites) {
    const site = row.sites as Record<string, unknown>;
    result.site = {
      id: site.id as string,
      name: site.name as string,
      code: site.code as string,
    };
  }

  return result;
}

// =============================================================================
// CRUD Operations
// =============================================================================

/**
 * Get all campaigns with optional filters
 */
export async function getCampaigns(params?: CampaignSearchParams): Promise<{ campaigns: Campaign[]; totalCount: number }> {
  // Build count query in parallel
  let countQuery = supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true });

  let dataQuery = supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  if (params?.siteId) {
    countQuery = countQuery.eq('site_id', params.siteId);
    dataQuery = dataQuery.eq('site_id', params.siteId);
  }

  if (params?.status) {
    countQuery = countQuery.eq('status', params.status);
    dataQuery = dataQuery.eq('status', params.status);
  }

  if (params?.campaignType) {
    countQuery = countQuery.eq('campaign_type', params.campaignType);
    dataQuery = dataQuery.eq('campaign_type', params.campaignType);
  }

  if (params?.searchTerm) {
    countQuery = countQuery.ilike('name', `%${params.searchTerm}%`);
    dataQuery = dataQuery.ilike('name', `%${params.searchTerm}%`);
  }

  if (params?.dateFrom) {
    countQuery = countQuery.gte('scheduled_at', params.dateFrom);
    dataQuery = dataQuery.gte('scheduled_at', params.dateFrom);
  }

  if (params?.dateTo) {
    countQuery = countQuery.lte('scheduled_at', params.dateTo);
    dataQuery = dataQuery.lte('scheduled_at', params.dateTo);
  }

  if (params?.limit) {
    dataQuery = dataQuery.limit(params.limit);
  }

  if (params?.offset) {
    dataQuery = dataQuery.range(params.offset, params.offset + (params.limit || 50) - 1);
  }

  const [{ count, error: countError }, { data, error }] = await Promise.all([countQuery, dataQuery]);

  if (error) {
    throw CampaignServiceError('Failed to fetch campaigns', error);
  }
  if (countError) {
    throw CampaignServiceError('Failed to count campaigns', countError);
  }

  return {
    campaigns: (data || []).map(transformCampaign),
    totalCount: count ?? 0,
  };
}

/**
 * Get a single campaign by ID
 */
export async function getCampaignById(id: string): Promise<Campaign | null> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw CampaignServiceError('Failed to fetch campaign', error);
  }

  return data ? transformCampaign(data) : null;
}

/**
 * Get a campaign with template and site details
 */
export async function getCampaignWithDetails(id: string): Promise<CampaignWithDetails | null> {
  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      *,
      campaign_templates (id, name, description, template_type, subject, content, preheader, is_active, created_at, updated_at),
      sites (id, name, code)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw CampaignServiceError('Failed to fetch campaign details', error);
  }

  return data ? transformCampaignWithDetails(data) : null;
}

/**
 * Create a new campaign
 */
export async function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      name: input.name,
      site_id: input.siteId || null,
      description: input.description || null,
      campaign_type: input.campaignType,
      template_id: input.templateId || null,
      segment_id: input.segmentId || null,
      subject: input.subject || null,
      content: input.content,
      scheduled_at: input.scheduledAt || null,
      target_all_members: input.targetAllMembers || false,
      membership_level_ids: input.membershipLevelIds || null,
      membership_statuses: input.membershipStatuses || ['active'],
      required_tags: input.requiredTags || null,
      excluded_tags: input.excludedTags || null,
      metadata: input.metadata || {},
      ab_test_enabled: input.abTestEnabled || false,
      ab_variant_b_subject: input.abVariantBSubject || null,
      ab_variant_b_content: input.abVariantBContent || null,
      ab_test_metric: input.abTestMetric || null,
      ab_test_sample_pct: input.abTestSamplePct ?? 50,
      ab_test_duration_hours: input.abTestDurationHours ?? 24,
    })
    .select()
    .single();

  if (error) {
    throw CampaignServiceError('Failed to create campaign', error);
  }

  return transformCampaign(data);
}

/**
 * Update a campaign
 */
export async function updateCampaign(id: string, input: UpdateCampaignInput): Promise<Campaign> {
  const updateData: Record<string, unknown> = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.siteId !== undefined) updateData.site_id = input.siteId;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.templateId !== undefined) updateData.template_id = input.templateId;
  if (input.segmentId !== undefined) updateData.segment_id = input.segmentId;
  if (input.subject !== undefined) updateData.subject = input.subject;
  if (input.content !== undefined) updateData.content = input.content;
  if (input.scheduledAt !== undefined) updateData.scheduled_at = input.scheduledAt;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.targetAllMembers !== undefined) updateData.target_all_members = input.targetAllMembers;
  if (input.membershipLevelIds !== undefined) updateData.membership_level_ids = input.membershipLevelIds;
  if (input.membershipStatuses !== undefined) updateData.membership_statuses = input.membershipStatuses;
  if (input.requiredTags !== undefined) updateData.required_tags = input.requiredTags;
  if (input.excludedTags !== undefined) updateData.excluded_tags = input.excludedTags;
  if (input.metadata !== undefined) updateData.metadata = input.metadata;
  if (input.abTestEnabled !== undefined) updateData.ab_test_enabled = input.abTestEnabled;
  if (input.abVariantBSubject !== undefined) updateData.ab_variant_b_subject = input.abVariantBSubject;
  if (input.abVariantBContent !== undefined) updateData.ab_variant_b_content = input.abVariantBContent;
  if (input.abTestMetric !== undefined) updateData.ab_test_metric = input.abTestMetric;
  if (input.abTestSamplePct !== undefined) updateData.ab_test_sample_pct = input.abTestSamplePct;
  if (input.abTestDurationHours !== undefined) updateData.ab_test_duration_hours = input.abTestDurationHours;

  const { data, error } = await supabase
    .from('campaigns')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw CampaignServiceError('Failed to update campaign', error);
  }

  return transformCampaign(data);
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', id);

  if (error) {
    throw CampaignServiceError('Failed to delete campaign', error);
  }
}

// =============================================================================
// Campaign Operations
// =============================================================================

/**
 * Get eligible recipients for a campaign
 */
export async function getCampaignRecipients(campaignId: string): Promise<CampaignRecipient[]> {
  const { data, error } = await supabase.rpc('get_campaign_recipients', {
    p_campaign_id: campaignId,
  });

  if (error) {
    throw CampaignServiceError('Failed to get campaign recipients', error);
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    memberId: row.member_id as string,
    firstName: row.first_name as string | null,
    lastName: row.last_name as string | null,
    email: row.email as string | null,
    phone: row.phone as string | null,
    siteId: row.site_id as string,
    siteTimezone: row.site_timezone as string,
  }));
}

/**
 * Get campaign metrics
 */
export async function getCampaignMetrics(campaignId: string): Promise<CampaignMetrics | null> {
  const { data, error } = await supabase.rpc('get_campaign_metrics', {
    p_campaign_id: campaignId,
  });

  if (error) {
    throw CampaignServiceError('Failed to get campaign metrics', error);
  }

  if (!data || data.length === 0) return null;

  const row = data[0];
  return {
    totalRecipients: row.total_recipients as number,
    totalSent: row.total_sent as number,
    totalDelivered: row.total_delivered as number,
    totalFailed: row.total_failed as number,
    totalOpened: row.total_opened as number,
    totalClicked: row.total_clicked as number,
    totalBounced: row.total_bounced as number,
    totalUnsubscribed: (row.total_unsubscribed as number) ?? 0,
    deliveryRate: row.delivery_rate as number,
    openRate: row.open_rate as number,
    clickRate: row.click_rate as number,
    bounceRate: row.bounce_rate as number,
    unsubscribeRate: (row.unsubscribe_rate as number) ?? 0,
  };
}

/**
 * Schedule a campaign
 */
export async function scheduleCampaign(id: string, scheduledAt: string): Promise<Campaign> {
  return updateCampaign(id, {
    scheduledAt,
    status: 'scheduled' as CampaignStatus,
  });
}

/**
 * Cancel a campaign
 */
export async function cancelCampaign(id: string): Promise<Campaign> {
  return updateCampaign(id, {
    status: 'cancelled' as CampaignStatus,
  });
}

/**
 * Queue messages for a campaign (prepares for sending)
 */
export async function queueCampaignMessages(campaignId: string): Promise<number> {
  const { data, error } = await supabase.rpc('queue_campaign_messages', {
    p_campaign_id: campaignId,
  });

  if (error) {
    throw CampaignServiceError('Failed to queue campaign messages', error);
  }

  return data as number;
}

/**
 * Update campaign statistics
 */
export async function updateCampaignStats(campaignId: string): Promise<void> {
  const { error } = await supabase.rpc('update_campaign_stats', {
    p_campaign_id: campaignId,
  });

  if (error) {
    throw CampaignServiceError('Failed to update campaign stats', error);
  }
}

// =============================================================================
// Audience Estimation
// =============================================================================

export interface RecipientEstimateParams {
  siteId?: string | null;
  segmentId?: string | null;
  targetAllMembers?: boolean;
  membershipStatuses?: string[];
  campaignType?: 'sms' | 'email';
}

/**
 * Estimate recipient count based on targeting criteria.
 * This is a rough estimate — actual send-time filtering adds consent/eligibility checks.
 */
export async function estimateRecipientCount(params: RecipientEstimateParams): Promise<number> {
  let query = supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  if (params.siteId) {
    query = query.eq('site_id', params.siteId);
  }

  if (!params.targetAllMembers && params.membershipStatuses && params.membershipStatuses.length > 0) {
    query = query.in('membership_status', params.membershipStatuses);
  }

  // Filter by channel eligibility
  if (params.campaignType === 'sms') {
    query = query.not('phone', 'is', null);
  } else if (params.campaignType === 'email') {
    query = query.not('email', 'is', null);
  }

  const { count, error } = await query;

  if (error) {
    throw CampaignServiceError('Failed to estimate recipients', error);
  }

  return count ?? 0;
}

// =============================================================================
// Campaign Duplication
// =============================================================================

/**
 * Duplicate a campaign. Creates a copy as DRAFT with " (Copy)" appended to the name.
 */
export async function duplicateCampaign(campaignId: string): Promise<Campaign> {
  const source = await getCampaignById(campaignId);
  if (!source) throw CampaignServiceError('Campaign not found');

  return createCampaign({
    name: `${source.name} (Copy)`,
    description: source.description,
    campaignType: source.campaignType,
    siteId: source.siteId,
    templateId: source.templateId,
    segmentId: source.segmentId,
    subject: source.subject,
    content: source.content,
    targetAllMembers: source.targetAllMembers,
    membershipLevelIds: source.membershipLevelIds,
    membershipStatuses: source.membershipStatuses,
    requiredTags: source.requiredTags,
    excludedTags: source.excludedTags,
    abTestEnabled: source.abTestEnabled,
    abVariantBSubject: source.abVariantBSubject,
    abVariantBContent: source.abVariantBContent,
    abTestMetric: source.abTestMetric,
    abTestSamplePct: source.abTestSamplePct,
    abTestDurationHours: source.abTestDurationHours,
  });
}

// =============================================================================
// Export Service Object
// =============================================================================

export const campaignService = {
  getCampaigns,
  getCampaignById,
  getCampaignWithDetails,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignRecipients,
  getCampaignMetrics,
  scheduleCampaign,
  cancelCampaign,
  queueCampaignMessages,
  updateCampaignStats,
  estimateRecipientCount,
  duplicateCampaign,
};

export default campaignService;
