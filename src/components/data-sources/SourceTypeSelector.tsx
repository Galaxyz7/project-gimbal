/**
 * Source Type Selector
 * Step 1: Choose data source type from categorized grid
 */

import type { DataSourceType } from '@/types/dataImport';
import { SOURCE_TYPE_OPTIONS, type SourceTypeOption } from '@/constants/dataSources';
import { Badge } from '../common/Badge';

// =============================================================================
// Types
// =============================================================================

export interface SourceTypeSelectorProps {
  selectedType: DataSourceType | null;
  onSelect: (type: DataSourceType) => void;
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

const CATEGORY_LABELS: Record<string, string> = {
  database: 'Databases',
  file: 'Files',
  api: 'APIs & Analytics',
};

const CATEGORY_ORDER = ['database', 'file', 'api'] as const;

function groupByCategory(options: SourceTypeOption[]): Record<string, SourceTypeOption[]> {
  const groups: Record<string, SourceTypeOption[]> = {};
  for (const opt of options) {
    if (!groups[opt.category]) groups[opt.category] = [];
    groups[opt.category].push(opt);
  }
  return groups;
}

// =============================================================================
// Component
// =============================================================================

export function SourceTypeSelector({ selectedType, onSelect, className = '' }: SourceTypeSelectorProps) {
  const grouped = groupByCategory(SOURCE_TYPE_OPTIONS);

  return (
    <div className={className}>
      {CATEGORY_ORDER.map((category) => {
        const options = grouped[category];
        if (!options || options.length === 0) return null;

        return (
          <div key={category} className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
              {CATEGORY_LABELS[category]}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {options.map((opt) => {
                const isSelected = selectedType === opt.type;
                const isDisabled = !opt.available;

                return (
                  <button
                    key={opt.type}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => onSelect(opt.type)}
                    className={[
                      'text-left p-4 rounded-lg border-2 transition-all',
                      isSelected
                        ? 'border-[#0353a4] bg-[#b9d6f2]/10'
                        : 'border-[#e0e0e0] hover:border-[#b9d6f2]',
                      isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                      'focus:outline-none focus:ring-2 focus:ring-[#0353a4]',
                    ].join(' ')}
                    aria-label={`Select ${opt.label}${isDisabled ? ' (coming soon)' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-[#003559]">{opt.label}</div>
                        <div className="text-sm text-gray-500 mt-1">{opt.description}</div>
                      </div>
                      {isDisabled && (
                        <Badge variant="default" size="sm">Soon</Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
