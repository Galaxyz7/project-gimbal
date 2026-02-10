/**
 * Data Preview Panel
 * Step 3: Column statistics and sample data table
 */

import type { ColumnPreview, PreviewResponse } from '@/types/dataImport';
import { Badge } from '../common/Badge';

// =============================================================================
// Types
// =============================================================================

export interface DataPreviewPanelProps {
  preview: PreviewResponse | null;
  loading?: boolean;
  error?: string;
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

const TYPE_COLORS: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'default'> = {
  text: 'default',
  number: 'primary',
  integer: 'primary',
  boolean: 'warning',
  date: 'success',
  timestamp: 'success',
  email: 'primary',
  phone: 'primary',
  url: 'primary',
};

function ColumnStat({ column }: { column: ColumnPreview }) {
  const totalSamples = column.sample_values.length + column.null_count;
  const fillRate = totalSamples > 0
    ? Math.round(((totalSamples - column.null_count) / totalSamples) * 100)
    : 0;

  return (
    <div className="p-3 rounded-lg border border-[#e0e0e0] bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[#003559] truncate">{column.name}</span>
        <Badge variant={TYPE_COLORS[column.detected_type] ?? 'default'} size="sm">
          {column.detected_type}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
        <div>
          <span className="block font-medium text-[#003559]">{column.unique_count}</span>
          Unique
        </div>
        <div>
          <span className="block font-medium text-[#003559]">{column.null_count}</span>
          Nulls
        </div>
        <div>
          <span className="block font-medium text-[#003559]">{fillRate}%</span>
          Fill rate
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function DataPreviewPanel({ preview, loading, error, className = '' }: DataPreviewPanelProps) {
  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-2 text-sm text-[#006daa]">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading preview...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <div role="alert" className="text-sm text-[#d32f2f] p-4 rounded-lg bg-red-50 border border-red-200">
          {error}
        </div>
      </div>
    );
  }

  if (!preview || preview.columns.length === 0) {
    return (
      <div className={className}>
        <div className="text-center py-8 text-gray-500">
          <p>No preview data available. Complete the connection step first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Column statistics */}
      <div>
        <h3 className="text-sm font-medium text-[#003559] mb-3">
          Column Analysis ({preview.columns.length} columns, {preview.total_rows} total rows)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {preview.columns.map((col) => (
            <ColumnStat key={col.name} column={col} />
          ))}
        </div>
      </div>

      {/* Sample data table */}
      <div>
        <h3 className="text-sm font-medium text-[#003559] mb-3">
          Sample Data (first {preview.rows.length} rows)
        </h3>
        <div className="overflow-x-auto rounded-lg border border-[#e0e0e0]">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-[#f5f5f5]">
                {preview.columns.map((col) => (
                  <th
                    key={col.name}
                    className="px-3 py-2 text-left font-medium text-[#003559] whitespace-nowrap border-b border-[#e0e0e0]"
                  >
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row, rowIdx) => (
                <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-[#f5f5f5]/50'}>
                  {preview.columns.map((col) => (
                    <td
                      key={col.name}
                      className="px-3 py-2 text-gray-700 whitespace-nowrap border-b border-[#e0e0e0] max-w-[200px] truncate"
                    >
                      {row[col.name] == null ? (
                        <span className="text-gray-400 italic">null</span>
                      ) : (
                        String(row[col.name])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
