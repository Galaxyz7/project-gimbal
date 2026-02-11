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
  onSync?: (id: string) => void;
  syncing?: boolean;
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

export function DataSourceCard({ dataSource: ds, onDelete, onSync, syncing, className = '' }: DataSourceCardProps) {
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
          {onSync && (
            <button
              onClick={() => onSync(ds.id)}
              disabled={syncing || ds.sync_status === 'syncing'}
              className="flex items-center gap-1 text-sm text-[#0353a4] hover:text-[#003559] disabled:text-gray-300 transition-colors p-1.5"
              aria-label={`Sync ${ds.name} now`}
            >
              {syncing || ds.sync_status === 'syncing' ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              <span>Sync</span>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(ds.id)}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-[#d32f2f] transition-colors p-1.5"
              aria-label={`Delete ${ds.name}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
