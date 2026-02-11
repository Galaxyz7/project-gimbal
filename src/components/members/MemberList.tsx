import { useState, useCallback, useMemo } from 'react';
import type { MemberSearchResult, MembershipStatus } from '@/types/member';
import { useSearchMembers, useUpdateMemberField } from '@/hooks/useSearchMembers';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import type { ColumnDef } from '@/hooks/useColumnVisibility';
import { Card, CardHeader } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Badge } from '../common/Badge';
import { InlineEdit } from '../common/InlineEdit';
import { ColumnToggle } from '../common/ColumnToggle';
import { Skeleton } from '../Skeleton';
import { EmptyState } from '../common/EmptyState';
import { Dropdown } from '../common/Dropdown';
import { SiteSelector } from './SiteSelector';
import { downloadCsv } from '@/utils/csvExport';
import type { CsvColumn } from '@/utils/csvExport';
import type { DropdownEntry } from '../common/Dropdown';

// =============================================================================
// Types
// =============================================================================

export interface MemberListProps {
  /** Filter by site ID */
  siteId?: string;
  /** Called when a member is selected */
  onSelect?: (memberId: string) => void;
  /** Called when import button is clicked (empty state CTA only) */
  onImport?: () => void;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Icons
// =============================================================================

function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

// =============================================================================
// Constants
// =============================================================================

const STATUS_OPTIONS: Array<{ value: MembershipStatus | ''; label: string }> = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'pending', label: 'Pending' },
];

const ITEMS_PER_PAGE = 25;

const COLUMN_DEFS: ColumnDef[] = [
  { id: 'member', label: 'Member', defaultVisible: true },
  { id: 'engagement', label: 'Engagement', defaultVisible: false },
  { id: 'phone', label: 'Phone', defaultVisible: true },
  { id: 'status', label: 'Status', defaultVisible: true },
  { id: 'level', label: 'Level', defaultVisible: false },
  { id: 'ltv', label: 'LTV', defaultVisible: true },
  { id: 'visits', label: 'Visits', defaultVisible: false },
  { id: 'lastVisit', label: 'Last Visit', defaultVisible: true },
  { id: 'site', label: 'Site', defaultVisible: false },
];

// =============================================================================
// Sub-components
// =============================================================================

interface MemberRowProps {
  member: MemberSearchResult;
  onSelect?: (memberId: string) => void;
  selected?: boolean;
  onToggle?: (memberId: string) => void;
  isVisible: (col: string) => boolean;
  onInlineEdit?: (memberId: string, field: string, value: string) => Promise<void>;
}

function MemberRow({ member, onSelect, selected, onToggle, isVisible, onInlineEdit }: MemberRowProps) {
  const statusBadge = useMemo(() => {
    const variants: Record<MembershipStatus, 'success' | 'warning' | 'danger' | 'default' | 'secondary'> = {
      active: 'success',
      expired: 'warning',
      cancelled: 'danger',
      suspended: 'danger',
      pending: 'default',
    };
    return (
      <Badge variant={variants[member.membershipStatus]} size="sm">
        {member.membershipStatus}
      </Badge>
    );
  }, [member.membershipStatus]);

  const fullName = [member.firstName, member.lastName].filter(Boolean).join(' ') || 'Unnamed';

  const engagementBadge = useMemo(() => {
    if (!member.lastVisitAt) {
      return <Badge variant="default" size="sm">New</Badge>;
    }
    const daysSince = Math.floor((Date.now() - new Date(member.lastVisitAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince <= 30) {
      return <Badge variant="success" size="sm">Engaged</Badge>;
    }
    if (daysSince <= 90) {
      return <Badge variant="warning" size="sm">At Risk</Badge>;
    }
    return <Badge variant="danger" size="sm">Inactive</Badge>;
  }, [member.lastVisitAt]);

  return (
    <tr
      className="hover:bg-[#f5f5f5] transition-colors cursor-pointer"
      onClick={() => onSelect?.(member.id)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(member.id);
        }
      }}
    >
      <td className="px-4 py-3 w-10" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle?.(member.id)}
          className="rounded border-[#e0e0e0] text-[#0353a4] focus:ring-[#0353a4]"
          aria-label={`Select ${[member.firstName, member.lastName].filter(Boolean).join(' ') || 'member'}`}
        />
      </td>
      {isVisible('member') && (
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-10 h-10 bg-[#f5f5f5] rounded-full flex items-center justify-center">
              <UserIcon />
            </div>
            <div>
              <InlineEdit
                value={fullName}
                onSave={async (val) => {
                  const parts = val.split(' ');
                  const firstName = parts[0] || '';
                  const lastName = parts.slice(1).join(' ') || '';
                  await onInlineEdit?.(member.id, 'name', JSON.stringify({ firstName, lastName }));
                }}
                className="font-medium text-[#003559]"
              />
              <div className="text-sm text-gray-500">{member.email || 'No email'}</div>
            </div>
          </div>
        </td>
      )}
      {isVisible('engagement') && (
        <td className="px-4 py-3 whitespace-nowrap">
          {engagementBadge}
        </td>
      )}
      {isVisible('phone') && (
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
          <InlineEdit
            value={member.phone || ''}
            onSave={(val) => onInlineEdit?.(member.id, 'phone', val) ?? Promise.resolve()}
            className="text-gray-600"
          />
        </td>
      )}
      {isVisible('status') && (
        <td className="px-4 py-3 whitespace-nowrap">
          {statusBadge}
        </td>
      )}
      {isVisible('level') && (
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
          {member.membershipLevelName || '—'}
        </td>
      )}
      {isVisible('ltv') && (
        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[#2e7d32]">
          ${member.lifetimeValue.toLocaleString()}
        </td>
      )}
      {isVisible('visits') && (
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
          {member.totalVisits}
        </td>
      )}
      {isVisible('lastVisit') && (
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
          {member.lastVisitAt
            ? new Date(member.lastVisitAt).toLocaleDateString()
            : 'Never'}
        </td>
      )}
      {isVisible('site') && (
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
          {member.siteName}
        </td>
      )}
    </tr>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Member list with search, filtering, and pagination.
 *
 * @example
 * <MemberList
 *   onSelect={(id) => navigate(`/audience/${id}`)}
 *   onImport={() => navigate('/audience/import')}
 * />
 */
export function MemberList({
  siteId: initialSiteId,
  onSelect,
  onImport,
  className = '',
}: MemberListProps) {
  // Column visibility
  const { visibleColumns, toggleColumn, resetToDefaults, isVisible } = useColumnVisibility(COLUMN_DEFS);

  // Inline edit mutation
  const updateField = useUpdateMemberField();

  const handleInlineEdit = useCallback(async (memberId: string, field: string, value: string) => {
    if (field === 'name') {
      const { firstName, lastName } = JSON.parse(value);
      await updateField.mutateAsync({ memberId, input: { firstName, lastName } });
    } else if (field === 'phone') {
      await updateField.mutateAsync({ memberId, input: { phone: value || null } });
    }
  }, [updateField]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [siteId, setSiteId] = useState<string | null>(initialSiteId || null);
  const [status, setStatus] = useState<MembershipStatus | ''>('');

  // Pagination
  const [page, setPage] = useState(0);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Fetch members via React Query
  const { data, isLoading, error, refetch } = useSearchMembers({
    siteId: siteId || undefined,
    searchTerm: debouncedSearch || undefined,
    membershipStatus: status || undefined,
    limit: ITEMS_PER_PAGE,
    offset: page * ITEMS_PER_PAGE,
  });

  const members = data?.members ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const hasMore = page < totalPages - 1;

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === members.length && members.length > 0) return new Set();
      return new Set(members.map((m) => m.id));
    });
  }, [members]);

  // CSV export columns
  const csvColumns: CsvColumn<MemberSearchResult>[] = useMemo(() => [
    { key: 'firstName', header: 'First Name' },
    { key: 'lastName', header: 'Last Name' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'membershipStatus', header: 'Status' },
    { key: 'membershipLevelName', header: 'Level' },
    { key: 'lifetimeValue', header: 'LTV', format: (v) => String(v ?? 0) },
    { key: 'totalVisits', header: 'Visits', format: (v) => String(v ?? 0) },
    { key: 'lastVisitAt', header: 'Last Visit', format: (v) => (v ? new Date(v as string).toLocaleDateString() : '') },
    { key: 'siteName', header: 'Site' },
  ], []);

  const handleExportSelected = useCallback(() => {
    const selected = members.filter((m) => selectedIds.has(m.id));
    if (selected.length === 0) return;
    downloadCsv(selected as unknown as Record<string, unknown>[], csvColumns as unknown as CsvColumn<Record<string, unknown>>[], `members-export-${new Date().toISOString().slice(0, 10)}`);
  }, [members, selectedIds, csvColumns]);

  const handleExportAll = useCallback(() => {
    if (members.length === 0) return;
    downloadCsv(members as unknown as Record<string, unknown>[], csvColumns as unknown as CsvColumn<Record<string, unknown>>[], `members-export-${new Date().toISOString().slice(0, 10)}`);
  }, [members, csvColumns]);

  const bulkActions: DropdownEntry[] = useMemo(() => [
    { key: 'export-selected', label: `Export Selected (${selectedIds.size})`, onClick: handleExportSelected, disabled: selectedIds.size === 0 },
    { key: 'export-all', label: 'Export All as CSV', onClick: handleExportAll },
  ], [selectedIds.size, handleExportSelected, handleExportAll]);

  // Render table
  const renderTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-[#f5f5f5] border-b border-[#e0e0e0]">
          <tr>
            <th className="px-4 py-3 w-10">
              <input
                type="checkbox"
                checked={selectedIds.size === members.length && members.length > 0}
                onChange={toggleAll}
                className="rounded border-[#e0e0e0] text-[#0353a4] focus:ring-[#0353a4]"
                aria-label="Select all members"
              />
            </th>
            {COLUMN_DEFS.filter((c) => isVisible(c.id)).map((col) => (
              <th key={col.id} className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase tracking-wider">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e0e0e0]">
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              onSelect={onSelect}
              selected={selectedIds.has(member.id)}
              onToggle={toggleSelection}
              isVisible={isVisible}
              onInlineEdit={handleInlineEdit}
            />
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <Card className={className} padding="none">
      <CardHeader>
        Members
      </CardHeader>

      {/* Filters */}
      <div className="p-4 border-b border-[#e0e0e0] bg-[#f5f5f5]/50">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <SearchIcon />
              </div>
              <Input
                type="search"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <SiteSelector
            value={siteId}
            onChange={(id) => { setSiteId(id); setPage(0); }}
            showAllOption
            allOptionLabel="All Sites"
            className="min-w-[180px]"
            size="md"
          />

          <Select
            value={status}
            onChange={(e) => { setStatus(e.target.value as MembershipStatus | ''); setPage(0); }}
            className="min-w-[150px]"
            options={STATUS_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
          />

          <ColumnToggle
            columns={COLUMN_DEFS}
            visibleColumns={visibleColumns}
            onToggle={toggleColumn}
            onReset={resetToDefaults}
          />
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="px-4 py-2 border-b border-[#e0e0e0] bg-[#b9d6f2]/20 flex items-center gap-3">
          <span className="text-sm font-medium text-[#003559]">
            {selectedIds.size} selected
          </span>
          <Dropdown
            trigger={
              <Button variant="secondary" size="sm">
                Actions
              </Button>
            }
            items={bulkActions}
            align="left"
          />
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-gray-500 hover:text-[#003559] transition-colors"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="p-4">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton variant="circular" width={40} height={40} />
                <div className="flex-1">
                  <Skeleton width={160} height={16} className="mb-2" />
                  <Skeleton width={200} height={12} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="p-8">
          <EmptyState
            title="Error Loading Members"
            description="Failed to load members. Please try again."
            action={{ label: 'Retry', onClick: () => refetch() }}
          />
        </div>
      ) : members.length === 0 ? (
        <div className="p-8">
          <EmptyState
            title={debouncedSearch || status ? 'No Members Found' : 'No Members Yet'}
            description={
              debouncedSearch || status
                ? 'Try adjusting your search or filters.'
                : 'Import members or add them manually to get started.'
            }
            action={
              !debouncedSearch && !status && onImport
                ? { label: 'Import Members', onClick: onImport }
                : undefined
            }
          />
        </div>
      ) : (
        <>
          {renderTable()}

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-[#e0e0e0] flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-500">
              Showing {page * ITEMS_PER_PAGE + 1}–{Math.min((page + 1) * ITEMS_PER_PAGE, totalCount)} of {totalCount.toLocaleString()}
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
        </>
      )}
    </Card>
  );
}

export default MemberList;
