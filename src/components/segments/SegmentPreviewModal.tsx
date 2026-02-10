/**
 * Segment Preview Modal
 * Shows a sample of members matching segment rules
 */

import { useMemo } from 'react';
import { Modal } from '../common/Modal';
import { DataTable } from '../dashboard/DataTable';
import type { DataTableColumn } from '../dashboard/DataTable';
import { Badge } from '../common/Badge';
import { usePreviewSegmentMembers, useEstimateSegmentSize } from '@/services/segments';
import type { SegmentRuleGroup, SegmentPreviewMember } from '@/types/segment';

// =============================================================================
// Types
// =============================================================================

export interface SegmentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: SegmentRuleGroup | null;
}

// =============================================================================
// Component
// =============================================================================

export function SegmentPreviewModal({ isOpen, onClose, rules }: SegmentPreviewModalProps) {
  const { data: members, isLoading } = usePreviewSegmentMembers(isOpen ? rules : null);
  const { data: estimatedSize } = useEstimateSegmentSize(isOpen ? rules : null);

  const columns: DataTableColumn<SegmentPreviewMember>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        accessor: (row) =>
          [row.firstName, row.lastName].filter(Boolean).join(' ') || 'Unknown',
        sortable: true,
        sortAccessor: (row) => row.lastName ?? '',
      },
      {
        key: 'email',
        header: 'Email',
        accessor: (row) => row.email ?? '-',
      },
      {
        key: 'phone',
        header: 'Phone',
        accessor: (row) => row.phone ?? '-',
      },
      {
        key: 'status',
        header: 'Status',
        accessor: (row) => (
          <Badge variant={row.membershipStatus === 'active' ? 'success' : 'default'}>
            {row.membershipStatus}
          </Badge>
        ),
      },
      {
        key: 'ltv',
        header: 'LTV',
        accessor: (row) => `$${row.lifetimeValue.toLocaleString()}`,
        sortable: true,
        sortAccessor: (row) => row.lifetimeValue,
        align: 'right' as const,
      },
      {
        key: 'visits',
        header: 'Visits',
        accessor: (row) => row.totalVisits.toLocaleString(),
        sortable: true,
        sortAccessor: (row) => row.totalVisits,
        align: 'right' as const,
      },
      {
        key: 'lastVisit',
        header: 'Last Visit',
        accessor: (row) =>
          row.lastVisitAt ? new Date(row.lastVisitAt).toLocaleDateString() : '-',
        sortable: true,
        sortAccessor: (row) => row.lastVisitAt ?? '',
      },
      {
        key: 'location',
        header: 'Location',
        accessor: (row) =>
          [row.city, row.state].filter(Boolean).join(', ') || '-',
      },
    ],
    [],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Segment Preview"
      size="full"
    >
      {estimatedSize !== undefined && (
        <p className="text-sm text-gray-600 mb-4">
          Estimated total: <strong>{estimatedSize.toLocaleString()}</strong> members
          {members?.length ? ` (showing ${members.length})` : ''}
        </p>
      )}

      <DataTable<SegmentPreviewMember>
        data={members ?? []}
        columns={columns}
        rowKey={(row) => row.id}
        pageSize={20}
        loading={isLoading}
        emptyMessage="No members match the current rules"
      />
    </Modal>
  );
}
