/**
 * Campaign Summary Card
 * Shows last 5 campaigns with type, status, sent count, and open rate
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Skeleton } from '../Skeleton';
import { useCampaigns } from '@/services/campaigns';
import { CampaignStatusBadge } from '../campaigns/CampaignStatusBadge';
import { CampaignTypeIcon } from '../campaigns/CampaignTypeIcon';

// =============================================================================
// Component
// =============================================================================

export interface CampaignSummaryCardProps {
  className?: string;
}

export function CampaignSummaryCard({ className = '' }: CampaignSummaryCardProps) {
  const navigate = useNavigate();
  const { data, isLoading } = useCampaigns({ limit: 5 });

  const recentCampaigns = data?.campaigns ?? [];

  if (isLoading) {
    return (
      <Card padding="lg" className={className}>
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded" />
          ))}
        </div>
      </Card>
    );
  }

  if (recentCampaigns.length === 0) {
    return (
      <Card padding="lg" className={className}>
        <h3 className="text-lg font-medium text-[#003559] mb-3">Recent Campaigns</h3>
        <div className="text-center py-6">
          <p className="text-sm text-gray-500 mb-3">No campaigns yet</p>
          <Button size="sm" onClick={() => navigate('/campaigns/new')}>
            Create Campaign
          </Button>
        </div>
      </Card>
    );
  }

  // Aggregate stats from campaigns that have been sent
  const stats = useMemo(() => {
    const sent = recentCampaigns.filter(c => c.totalSent > 0);
    if (sent.length === 0) return null;
    const totalSent = sent.reduce((s, c) => s + c.totalSent, 0);
    const totalDelivered = sent.reduce((s, c) => s + c.totalDelivered, 0);
    const totalOpened = sent.reduce((s, c) => s + (c.totalOpened ?? 0), 0);
    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
    return { deliveryRate, openRate, count: sent.length };
  }, [recentCampaigns]);

  return (
    <Card padding="lg" className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-[#003559]">Recent Campaigns</h3>
        <Button variant="ghost" size="sm" onClick={() => navigate('/campaigns')}>
          View All
        </Button>
      </div>

      <div className="space-y-3">
        {recentCampaigns.map((campaign) => (
          <button
            key={campaign.id}
            type="button"
            onClick={() => navigate(`/campaigns/${campaign.id}`)}
            className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-[#f5f5f5] transition-colors"
          >
            <CampaignTypeIcon type={campaign.campaignType} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#003559] truncate">{campaign.name}</p>
              <p className="text-xs text-gray-500">
                {campaign.totalSent.toLocaleString()} sent
                {campaign.campaignType === 'email' && campaign.totalSent > 0 && (
                  <span>
                    {' \u00B7 '}
                    {Math.round(((campaign.totalOpened ?? 0) / campaign.totalSent) * 100)}% opened
                  </span>
                )}
              </p>
            </div>
            <CampaignStatusBadge status={campaign.status} />
          </button>
        ))}
      </div>

      {/* Aggregate summary */}
      {stats && (
        <div className="mt-4 pt-4 border-t border-[#e0e0e0] flex items-center gap-3 text-xs text-gray-500">
          <span>{stats.count} sent</span>
          <Badge
            variant={stats.deliveryRate >= 95 ? 'success' : stats.deliveryRate >= 85 ? 'warning' : 'danger'}
            size="sm"
          >
            {stats.deliveryRate.toFixed(1)}% delivery
          </Badge>
          <Badge
            variant={stats.openRate >= 25 ? 'success' : stats.openRate >= 15 ? 'warning' : 'danger'}
            size="sm"
          >
            {stats.openRate.toFixed(1)}% opens
          </Badge>
        </div>
      )}
    </Card>
  );
}

export default CampaignSummaryCard;
