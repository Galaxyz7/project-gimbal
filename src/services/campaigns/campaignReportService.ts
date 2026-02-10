/**
 * Campaign Report Service
 * Data fetching for campaign reporting: timeline, funnel, top engaged, errors
 */

import { supabase } from '@/lib/supabase';
import type {
  CampaignTimelinePoint,
  CampaignFunnelStage,
  CampaignErrorSummary,
  TopEngagedRecipient,
  CampaignDeviceBreakdown,
} from '@/types/campaign';

// =============================================================================
// Timeline
// =============================================================================

/**
 * Fetch time-bucketed message status counts for a campaign
 */
export async function getCampaignTimeline(
  campaignId: string,
  interval: 'hour' | 'day' = 'hour',
): Promise<CampaignTimelinePoint[]> {
  const { data, error } = await supabase.rpc('get_campaign_timeline', {
    p_campaign_id: campaignId,
    p_interval: interval,
  });

  if (error) throw new Error('Failed to fetch campaign timeline');
  if (!data) return [];

  return (data as Array<{
    time_bucket: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
    bounced: number;
  }>).map((row) => ({
    timeBucket: row.time_bucket,
    sent: Number(row.sent),
    delivered: Number(row.delivered),
    opened: Number(row.opened),
    clicked: Number(row.clicked),
    failed: Number(row.failed),
    bounced: Number(row.bounced),
  }));
}

// =============================================================================
// Funnel
// =============================================================================

/**
 * Fetch delivery funnel: Queued → Sent → Delivered → Opened → Clicked
 */
export async function getCampaignFunnel(
  campaignId: string,
): Promise<CampaignFunnelStage[]> {
  const { data, error } = await supabase.rpc('get_campaign_funnel', {
    p_campaign_id: campaignId,
  });

  if (error) throw new Error('Failed to fetch campaign funnel');
  if (!data) return [];

  return (data as Array<{
    stage: string;
    count: number;
    rate: number;
  }>).map((row) => ({
    stage: row.stage,
    count: Number(row.count),
    rate: Number(row.rate),
  }));
}

// =============================================================================
// Top Engaged Recipients
// =============================================================================

/**
 * Fetch recipients with highest engagement (opened or clicked)
 */
export async function getTopEngagedRecipients(
  campaignId: string,
  limit = 10,
): Promise<TopEngagedRecipient[]> {
  const { data, error } = await supabase
    .from('campaign_messages')
    .select(`
      member_id,
      status,
      opened_at,
      clicked_at,
      members:member_id (
        id,
        first_name,
        last_name,
        email,
        phone
      )
    `)
    .eq('campaign_id', campaignId)
    .in('status', ['opened', 'clicked'])
    .order('clicked_at', { ascending: false, nullsFirst: false })
    .order('opened_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw new Error('Failed to fetch top engaged recipients');
  if (!data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((row: any) => {
    const member = Array.isArray(row.members) ? row.members[0] : row.members;
    return {
      memberId: row.member_id,
      firstName: member?.first_name ?? null,
      lastName: member?.last_name ?? null,
      email: member?.email ?? null,
      phone: member?.phone ?? null,
      status: row.status,
      openedAt: row.opened_at,
      clickedAt: row.clicked_at,
    };
  });
}

// =============================================================================
// Error Summary
// =============================================================================

/**
 * Fetch failed/bounced messages grouped by error message
 */
export async function getCampaignErrorSummary(
  campaignId: string,
): Promise<CampaignErrorSummary[]> {
  const { data, error } = await supabase
    .from('campaign_messages')
    .select('error_message, failed_at, status')
    .eq('campaign_id', campaignId)
    .in('status', ['failed', 'bounced']);

  if (error) throw new Error('Failed to fetch campaign error summary');
  if (!data || data.length === 0) return [];

  // Group by error message on the client since Supabase doesn't support
  // GROUP BY in the PostgREST query builder
  const grouped = new Map<string, { count: number; lastOccurred: string }>();

  for (const row of data) {
    const msg = row.error_message || 'Unknown error';
    const existing = grouped.get(msg);
    const failedAt = row.failed_at || '';

    if (existing) {
      existing.count += 1;
      if (failedAt > existing.lastOccurred) {
        existing.lastOccurred = failedAt;
      }
    } else {
      grouped.set(msg, { count: 1, lastOccurred: failedAt });
    }
  }

  return Array.from(grouped.entries())
    .map(([errorMessage, { count, lastOccurred }]) => ({
      errorMessage,
      count,
      lastOccurred,
    }))
    .sort((a, b) => b.count - a.count);
}

// =============================================================================
// CSV Export
// =============================================================================

/**
 * Fetch all messages for CSV export
 */
export async function getCampaignMessagesForExport(
  campaignId: string,
): Promise<Array<Record<string, unknown>>> {
  const { data, error } = await supabase
    .from('campaign_messages')
    .select(`
      status,
      recipient_address,
      queued_at,
      sent_at,
      delivered_at,
      opened_at,
      clicked_at,
      failed_at,
      error_message,
      members:member_id (
        first_name,
        last_name
      )
    `)
    .eq('campaign_id', campaignId)
    .order('queued_at', { ascending: true });

  if (error) throw new Error('Failed to fetch messages for export');
  if (!data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((row: any) => {
    const member = Array.isArray(row.members) ? row.members[0] : row.members;
    return {
      first_name: member?.first_name ?? '',
      last_name: member?.last_name ?? '',
      recipient: row.recipient_address,
      status: row.status,
      queued_at: row.queued_at ?? '',
      sent_at: row.sent_at ?? '',
      delivered_at: row.delivered_at ?? '',
      opened_at: row.opened_at ?? '',
      clicked_at: row.clicked_at ?? '',
      failed_at: row.failed_at ?? '',
      error_message: row.error_message ?? '',
    };
  });
}

// =============================================================================
// Device Breakdown
// =============================================================================

/**
 * Fetch device type breakdown for email opens/clicks
 */
export async function getCampaignDeviceBreakdown(
  campaignId: string,
): Promise<CampaignDeviceBreakdown[]> {
  const { data, error } = await supabase.rpc('get_campaign_device_breakdown', {
    p_campaign_id: campaignId,
  });

  if (error) throw new Error('Failed to fetch campaign device breakdown');
  if (!data) return [];

  return (data as Array<{
    device_type: string;
    count: number;
    rate: number;
  }>).map((row) => ({
    deviceType: row.device_type,
    count: Number(row.count),
    rate: Number(row.rate),
  }));
}

// =============================================================================
// Export
// =============================================================================

export const campaignReportService = {
  getCampaignTimeline,
  getCampaignFunnel,
  getTopEngagedRecipients,
  getCampaignErrorSummary,
  getCampaignMessagesForExport,
  getCampaignDeviceBreakdown,
};
