/**
 * Column Configurator
 * Step 4: Configure column names, types, and include/exclude toggles
 */

import { useCallback } from 'react';
import type { ColumnConfig, ColumnType } from '@/types/dataImport';
import { Input } from '../common/Input';
import { Select } from '../common/Select';

// =============================================================================
// Types
// =============================================================================

export interface ColumnConfiguratorProps {
  columns: ColumnConfig[];
  onChange: (columns: ColumnConfig[]) => void;
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const COLUMN_TYPE_OPTIONS: Array<{ value: ColumnType; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'integer', label: 'Integer' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'timestamp', label: 'Timestamp' },
];

// =============================================================================
// Sub-components
// =============================================================================

interface ColumnRowProps {
  column: ColumnConfig;
  onUpdate: (updated: ColumnConfig) => void;
}

function ColumnRow({ column, onUpdate }: ColumnRowProps) {
  return (
    <tr className={column.included ? '' : 'opacity-50'}>
      {/* Include toggle */}
      <td className="px-3 py-2 border-b border-[#e0e0e0]">
        <label className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={column.included}
            onChange={(e) => onUpdate({ ...column, included: e.target.checked })}
            className="rounded border-[#e0e0e0]"
            aria-label={`Include ${column.source_name}`}
          />
        </label>
      </td>

      {/* Source name (read-only) */}
      <td className="px-3 py-2 border-b border-[#e0e0e0]">
        <span className="text-sm text-gray-500 font-mono">{column.source_name}</span>
      </td>

      {/* Target name (editable) */}
      <td className="px-3 py-2 border-b border-[#e0e0e0]">
        <Input
          value={column.target_name}
          onChange={(e) => onUpdate({ ...column, target_name: e.target.value })}
          className="!py-1 !text-sm font-mono"
          aria-label={`Target name for ${column.source_name}`}
        />
      </td>

      {/* Type */}
      <td className="px-3 py-2 border-b border-[#e0e0e0]">
        <Select
          value={column.type}
          onChange={(e) => onUpdate({ ...column, type: e.target.value as ColumnType })}
          options={COLUMN_TYPE_OPTIONS}
          className="!py-1 !text-sm"
          aria-label={`Type for ${column.source_name}`}
        />
      </td>

      {/* Cleaning rules count */}
      <td className="px-3 py-2 border-b border-[#e0e0e0] text-center">
        <span className="text-sm text-gray-500">
          {column.cleaning_rules.length}
        </span>
      </td>
    </tr>
  );
}

// =============================================================================
// Component
// =============================================================================

export function ColumnConfigurator({ columns, onChange, className = '' }: ColumnConfiguratorProps) {
  const updateColumn = useCallback(
    (index: number, updated: ColumnConfig) => {
      const newColumns = [...columns];
      newColumns[index] = updated;
      onChange(newColumns);
    },
    [columns, onChange]
  );

  const toggleAll = useCallback(
    (included: boolean) => {
      onChange(columns.map((col) => ({ ...col, included })));
    },
    [columns, onChange]
  );

  if (columns.length === 0) {
    return (
      <div className={className}>
        <div className="text-center py-8 text-gray-500">
          No columns to configure. Complete the preview step first.
        </div>
      </div>
    );
  }

  const includedCount = columns.filter((c) => c.included).length;
  const allIncluded = includedCount === columns.length;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {includedCount} of {columns.length} columns included
        </p>
        <button
          type="button"
          onClick={() => toggleAll(!allIncluded)}
          className="text-sm text-[#0353a4] hover:underline"
        >
          {allIncluded ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#e0e0e0]">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-[#f5f5f5]">
              <th className="px-3 py-2 text-center font-medium text-[#003559] border-b border-[#e0e0e0] w-16">
                Include
              </th>
              <th className="px-3 py-2 text-left font-medium text-[#003559] border-b border-[#e0e0e0]">
                Source Column
              </th>
              <th className="px-3 py-2 text-left font-medium text-[#003559] border-b border-[#e0e0e0]">
                Target Name
              </th>
              <th className="px-3 py-2 text-left font-medium text-[#003559] border-b border-[#e0e0e0] w-36">
                Type
              </th>
              <th className="px-3 py-2 text-center font-medium text-[#003559] border-b border-[#e0e0e0] w-20">
                Rules
              </th>
            </tr>
          </thead>
          <tbody>
            {columns.map((col, index) => (
              <ColumnRow
                key={col.source_name}
                column={col}
                onUpdate={(updated) => updateColumn(index, updated)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
