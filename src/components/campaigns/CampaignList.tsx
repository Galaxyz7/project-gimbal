/**
 * Campaign List
 * Table view of campaigns with search, filters, and pagination
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Card } from '../common/Card';
import { Skeleton } from '../Skeleton';
import { Dropdown } from '../common/Dropdown';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { CampaignStatusBadge } from './CampaignStatusBadge';
import { CampaignTypeIcon } from './CampaignTypeIcon';
import { Tooltip } from '../common/Tooltip';
import { InlineEdit } from '../common/InlineEdit';
import { useCampaigns, useDuplicateCampaign, useDeleteCampaign, useUpdateCampaign } from '@/services/campaigns';
import { useSegments } from '@/services/segments';
import type { Campaign, CampaignStatus, CampaignType } from '@/types/campaign';
import type { DropdownEntry } from '../common/Dropdown';

// =============================================================================
// Types
// =============================================================================

export interface CampaignListProps {
  siteId?: string;
  onSelect?: (campaignId: string) => void;
  onCreate?: () => void;
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'sending', label: 'Sending' },
  { value: 'sent', label: 'Sent' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
];

const PAGE_SIZE = 25;

// =============================================================================
// Sub-components
// =============================================================================

interface CampaignRowProps {
  campaign: Campaign;
  audienceLabel: string;
  onSelect?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onRename?: (id: string, name: string) => Promise<void>;
}

function CampaignRow({ campaign, audienceLabel, onSelect, onDuplicate, onDelete, onRename }: CampaignRowProps) {
  const formattedDate = useMemo(() => {
    const date = campaign.scheduledAt || campaign.createdAt;
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [campaign]);

  const handleClick = useCallback(() => {
    onSelect?.(campaign.id);
  }, [campaign.id, onSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect?.(campaign.id);
      }
    },
    [campaign.id, onSelect]
  );

  return (
    <tr
      className="hover:bg-[#f5f5f5] transition-colors cursor-pointer"
      onClick={handleClick}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#b9d6f2]/30 rounded-lg text-[#0353a4]">
            <CampaignTypeIcon type={campaign.campaignType} size="sm" />
          </div>
          <div>
            {campaign.status === 'draft' ? (
              <InlineEdit
                value={campaign.name}
                onSave={(val) => onRename?.(campaign.id, val) ?? Promise.resolve()}
                className="font-medium text-[#003559]"
              />
            ) : (
              <div className="font-medium text-[#003559]">{campaign.name}</div>
            )}
            {campaign.description && (
              <div className="text-xs text-gray-500 truncate max-w-xs">
                {campaign.description}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <CampaignStatusBadge status={campaign.status} />
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-[160px]">
        {audienceLabel}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        <Tooltip content={`Updated ${new Date(campaign.updatedAt).toLocaleString()}`}>
          <span>{formattedDate}</span>
        </Tooltip>
      </td>
      <td className="px-4 py-3 text-sm text-right">
        {campaign.totalSent > 0 ? (
          <span className="text-gray-700">
            {campaign.totalSent.toLocaleString()}
            <span className="text-gray-400"> / </span>
            {campaign.totalRecipients.toLocaleString()}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-right">
        {campaign.totalDelivered > 0 && campaign.totalSent > 0 ? (
          <span className="text-[#2e7d32]">
            {((campaign.totalDelivered / campaign.totalSent) * 100).toFixed(1)}%
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
        <Dropdown
          trigger={
            <button type="button" className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          }
          items={[
            { label: 'Duplicate', onClick: () => onDuplicate?.(campaign.id) },
            { type: 'divider' as const },
            { label: 'Delete', onClick: () => onDelete?.(campaign.id), danger: true },
          ] as DropdownEntry[]}
          align="right"
        />
      </td>
    </tr>
  );
}

function TableSkeleton() {
  return (
    <tbody>
      {[...Array(5)].map((_, i) => (
        <tr key={i}>
          <td className="px-4 py-3">
            <div className="flex items-center gap-3">
              <Skeleton width={36} height={36} />
              <div>
                <Skeleton width={160} height={16} className="mb-1" />
                <Skeleton width={100} height={12} />
              </div>
            </div>
          </td>
          <td className="px-4 py-3">
            <Skeleton width={80} height={24} />
          </td>
          <td className="px-4 py-3">
            <Skeleton width={100} height={16} />
          </td>
          <td className="px-4 py-3">
            <Skeleton width={100} height={16} />
          </td>
          <td className="px-4 py-3">
            <Skeleton width={60} height={16} className="ml-auto" />
          </td>
          <td className="px-4 py-3">
            <Skeleton width={50} height={16} className="ml-auto" />
          </td>
        </tr>
      ))}
    </tbody>
  );
}

// =============================================================================
// Component
// =============================================================================

export function CampaignList({ siteId, onSelect, onCreate, className = '' }: CampaignListProps) {
  const navigate = useNavigate();

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<CampaignType | ''>('');
  const [page, setPage] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Mutations
  const duplicateMutation = useDuplicateCampaign();
  const deleteMutation = useDeleteCampaign();
  const updateMutation = useUpdateCampaign();

  const handleRename = useCallback(async (id: string, name: string) => {
    await updateMutation.mutateAsync({ id, input: { name } });
  }, [updateMutation]);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimeout = useMemo(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 300);
    return timeout;
  }, [searchTerm]);

  // Cleanup timeout
  useMemo(() => {
    return () => clearTimeout(searchTimeout);
  }, [searchTimeout]);

  // Fetch segments for audience labels
  const { data: segments } = useSegments();
  const segmentMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const seg of segments ?? []) {
      map.set(seg.id, seg.name);
    }
    return map;
  }, [segments]);

  // Fetch campaigns
  const { data, isLoading, error, refetch } = useCampaigns({
    siteId,
    status: statusFilter || undefined,
    campaignType: typeFilter || undefined,
    searchTerm: debouncedSearch || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  // Pagination
  const displayedCampaigns = data?.campaigns ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasMore = page < totalPages - 1;

  // Handlers
  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as CampaignStatus | '');
    setPage(0);
  }, []);

  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value as CampaignType | '');
    setPage(0);
  }, []);

  // Error state
  if (error) {
    return (
      <Card className={className} padding="lg">
        <div className="text-center py-8">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-[#d32f2f]"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-gray-600 mb-4">Failed to load campaigns</p>
          <Button variant="outline" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className} padding="none">
      {/* Header with filters */}
      <div className="p-4 border-b border-[#e0e0e0]">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <Input
              type="search"
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Select
              value={statusFilter}
              onChange={handleStatusChange}
              options={STATUS_OPTIONS}
              className="w-36"
            />
            <Select
              value={typeFilter}
              onChange={handleTypeChange}
              options={TYPE_OPTIONS}
              className="w-32"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#f5f5f5]">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Campaign</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Audience</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Sent</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Delivery</th>
              <th className="px-4 py-3 w-12" />
            </tr>
          </thead>

          {isLoading ? (
            <TableSkeleton />
          ) : displayedCampaigns.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <svg
                    className="w-12 h-12 mx-auto mb-4 text-gray-300"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <p className="text-gray-500 mb-4">
                    {searchTerm || statusFilter || typeFilter
                      ? 'No campaigns match your filters'
                      : 'No campaigns yet'}
                  </p>
                  {onCreate && !searchTerm && !statusFilter && !typeFilter && (
                    <Button onClick={onCreate}>Create Your First Campaign</Button>
                  )}
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody>
              {displayedCampaigns.map((campaign) => {
                let audienceLabel = 'All Members';
                if (campaign.segmentId) {
                  audienceLabel = segmentMap.get(campaign.segmentId) ?? 'Segment';
                } else if (!campaign.targetAllMembers && campaign.membershipStatuses?.length > 0) {
                  audienceLabel = campaign.membershipStatuses.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ');
                }
                return (
                  <CampaignRow
                    key={campaign.id}
                    campaign={campaign}
                    audienceLabel={audienceLabel}
                    onSelect={onSelect}
                    onDuplicate={async (id) => {
                      const newCampaign = await duplicateMutation.mutateAsync(id);
                      navigate(`/campaigns/${newCampaign.id}`);
                    }}
                    onDelete={setDeleteId}
                    onRename={handleRename}
                  />
                );
              })}
            </tbody>
          )}
        </table>
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="p-4 border-t border-[#e0e0e0] flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-500">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount.toLocaleString()}
            {totalPages > 1 && ` · Page ${page + 1} of ${totalPages}`}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
          >
            Next
          </Button>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) {
            await deleteMutation.mutateAsync(deleteId);
            setDeleteId(null);
          }
        }}
        title="Delete Campaign"
        message="Are you sure you want to delete this campaign? This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleteMutation.isPending}
      />
    </Card>
  );
}

export default CampaignList;
