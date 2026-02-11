/**
 * DataTypeSelector — Step 2 of the unified import wizard
 * Lets the user choose what kind of data they're importing.
 * Supports auto-detection from column headers.
 */

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { DestinationType, DestinationSchema } from '@/types/dataImport';
import { DESTINATION_SCHEMAS, detectDestinationType } from '@/constants/dataSources';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';

// =============================================================================
// Types
// =============================================================================

export interface DataTypeSelectorProps {
  /** Currently selected destination type */
  value: DestinationType | null;
  /** Called when a type is selected */
  onChange: (type: DestinationType) => void;
  /** Column names from the uploaded data (for auto-detection) */
  columnNames?: string[];
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Icons
// =============================================================================

function UsersIcon() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-1.997M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function CurrencyIcon() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M12 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M21 12c0 .621-.504 1.125-1.125 1.125m-5.25 0c.621 0 1.125.504 1.125 1.125m-12.75-1.125c-.621 0-1.125.504-1.125 1.125" />
    </svg>
  );
}

const ICONS: Record<DestinationType, () => ReactNode> = {
  members: UsersIcon,
  transactions: CurrencyIcon,
  visits: CalendarIcon,
  custom: TableIcon,
};

// =============================================================================
// Component
// =============================================================================

export function DataTypeSelector({
  value,
  onChange,
  columnNames,
  className = '',
}: DataTypeSelectorProps) {
  const suggestedType = useMemo(() => {
    if (!columnNames || columnNames.length === 0) return null;
    return detectDestinationType(columnNames);
  }, [columnNames]);

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-[#003559] mb-1">What kind of data is this?</h3>
      <p className="text-sm text-gray-500 mb-4">
        Choose the data type so we can route it to the right place.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {DESTINATION_SCHEMAS.map((schema: DestinationSchema) => {
          const isSelected = value === schema.type;
          const isSuggested = suggestedType === schema.type && !value;
          const Icon = ICONS[schema.type];

          return (
            <Card
              key={schema.type}
              className={[
                'cursor-pointer transition-all',
                isSelected
                  ? 'ring-2 ring-[#0353a4] border-[#0353a4]'
                  : 'hover:border-[#006daa] hover:shadow-md',
              ].join(' ')}
              padding="none"
            >
              <button
                type="button"
                className="w-full p-4 text-left"
                onClick={() => onChange(schema.type)}
                aria-pressed={isSelected}
              >
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 ${isSelected ? 'text-[#0353a4]' : 'text-gray-400'}`}>
                    <Icon />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#003559]">{schema.label}</span>
                      {isSuggested && (
                        <Badge variant="secondary" size="sm">Suggested</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{schema.description}</p>
                    {schema.requiredFields.length > 0 && (
                      <p className="text-xs text-gray-400 mt-2">
                        Required: {schema.requiredFields.map((f) => f.label).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default DataTypeSelector;
