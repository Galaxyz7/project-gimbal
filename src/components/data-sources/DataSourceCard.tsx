/**
 * Data Source Card
 * Displays a data source in the list view with status, type, and actions
 */

import type { DataSource } from '@/types/dataImport';
import { SOURCE_TYPE_LABELS, STATUS_VARIANT, STATUS_LABELS } from '@/constants/dataSources';
import { Badge } from '../common/Badge';

// =============================================================================
// Types
// =============================================================================

export interface DataSourceCardProps {
  dataSource: DataSource;
  onDelete?: (id: string) => void;
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// =============================================================================
// Component
// =============================================================================

export function DataSourceCard({ dataSource: ds, onDelete, className = '' }: DataSourceCardProps) {
  return (
    <div
      className={[
        'bg-white rounded-lg border border-[#e0e0e0] p-4 hover:border-[#b9d6f2] transition-colors',
        className,
      ].join(' ')}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="w-10 h-10 rounded bg-[#b9d6f2]/30 flex items-center justify-center text-[#0353a4] flex-shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-[#003559] truncate">{ds.name}</h3>
            <Badge variant={ds.is_active ? 'success' : 'default'} size="sm">
              {ds.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
            <span>{SOURCE_TYPE_LABELS[ds.type] || ds.type}</span>
            <span>Last sync: {formatDate(ds.last_sync_at)}</span>
            {ds.sync_schedule !== 'manual' && (
              <span>Schedule: {ds.sync_schedule}</span>
            )}
          </div>
        </div>

        {/* Status + Actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <Badge variant={STATUS_VARIANT[ds.sync_status]} size="sm">
            {STATUS_LABELS[ds.sync_status]}
          </Badge>
          {onDelete && (
            <button
              onClick={() => onDelete(ds.id)}
              className="text-gray-400 hover:text-[#d32f2f] transition-colors p-1"
              aria-label={`Delete ${ds.name}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
