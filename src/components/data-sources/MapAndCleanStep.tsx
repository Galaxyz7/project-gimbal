/**
 * MapAndCleanStep — Step 3 of the unified import wizard
 * Combined data preview, field mapping, and cleaning configuration.
 */

import { useState, useMemo } from 'react';
import type { DestinationType, FieldMapping, ColumnPreview } from '@/types/dataImport';
import { DESTINATION_SCHEMAS, autoMapFields } from '@/constants/dataSources';
import { Card, CardHeader } from '../common/Card';
import { Select } from '../common/Select';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

// =============================================================================
// Types
// =============================================================================

export interface MapAndCleanStepProps {
  /** Destination type selected in Step 2 */
  destinationType: DestinationType;
  /** Column analysis from the uploaded data */
  columns: ColumnPreview[];
  /** Sample rows from the uploaded data */
  sampleRows: Record<string, unknown>[];
  /** Current field mappings */
  fieldMappings: FieldMapping[];
  /** Called when field mappings change */
  onFieldMappingsChange: (mappings: FieldMapping[]) => void;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function MapAndCleanStep({
  destinationType,
  columns,
  sampleRows,
  fieldMappings,
  onFieldMappingsChange,
  className = '',
}: MapAndCleanStepProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const schema = useMemo(
    () => DESTINATION_SCHEMAS.find((s) => s.type === destinationType),
    [destinationType]
  );

  const sourceColumnNames = useMemo(() => columns.map((c) => c.name), [columns]);

  // Auto-map on first render if no mappings exist
  const allFields = useMemo(() => {
    if (!schema) return [];
    return [
      ...schema.requiredFields.map((f) => ({ ...f, required: true })),
      ...schema.optionalFields.map((f) => ({ ...f, required: false })),
    ];
  }, [schema]);

  // Handle auto-map button
  const handleAutoMap = () => {
    if (!schema) return;
    const auto = autoMapFields(sourceColumnNames, schema);
    const newMappings: FieldMapping[] = auto.map((m) => ({
      sourceColumn: m.sourceColumn,
      targetField: m.targetField,
      required: allFields.find((f) => f.field === m.targetField)?.required ?? false,
    }));
    onFieldMappingsChange(newMappings);
  };

  const handleMappingChange = (targetField: string, sourceColumn: string) => {
    const isRequired = allFields.find((f) => f.field === targetField)?.required ?? false;

    if (!sourceColumn) {
      // Remove mapping
      onFieldMappingsChange(fieldMappings.filter((m) => m.targetField !== targetField));
    } else {
      const existing = fieldMappings.find((m) => m.targetField === targetField);
      if (existing) {
        onFieldMappingsChange(
          fieldMappings.map((m) =>
            m.targetField === targetField ? { ...m, sourceColumn } : m
          )
        );
      } else {
        onFieldMappingsChange([
          ...fieldMappings,
          { sourceColumn, targetField, required: isRequired },
        ]);
      }
    }
  };

  const getMappedSource = (targetField: string): string => {
    return fieldMappings.find((m) => m.targetField === targetField)?.sourceColumn || '';
  };

  // Validation: check required fields are mapped
  const unmappedRequired = allFields
    .filter((f) => f.required)
    .filter((f) => !fieldMappings.some((m) => m.targetField === f.field));

  // For custom type, there's no schema — show raw preview only
  if (destinationType === 'custom' || !schema) {
    return (
      <div className={className}>
        <Card>
          <CardHeader>Data Preview</CardHeader>
          <p className="px-4 pb-2 text-sm text-gray-500">
            Custom data will be stored in its own table with the original column structure.
          </p>
          {renderPreviewTable(columns, sampleRows)}
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Data preview */}
      <Card padding="none">
        <CardHeader>Source Data Preview</CardHeader>
        {renderPreviewTable(columns, sampleRows)}
      </Card>

      {/* Field mapping */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-[#003559]">Map Fields</h3>
            <p className="text-sm text-gray-500">
              Match your source columns to {schema.label.toLowerCase()} fields.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleAutoMap}>
            Auto-Map
          </Button>
        </div>

        {unmappedRequired.length > 0 && (
          <div className="mb-4 p-3 bg-[#b45309]/10 border border-[#b45309]/30 rounded-lg text-sm text-[#b45309]">
            Missing required mappings: {unmappedRequired.map((f) => f.label).join(', ')}
          </div>
        )}

        <div className="space-y-3">
          {allFields.map((field) => (
            <div key={field.field} className="flex items-center gap-4">
              <div className="w-1/3 flex items-center gap-2">
                <span className="text-sm font-medium text-[#003559]">{field.label}</span>
                {field.required && (
                  <Badge variant="danger" size="sm">Required</Badge>
                )}
              </div>
              <div className="w-8 text-center text-gray-400">&larr;</div>
              <div className="flex-1">
                <Select
                  value={getMappedSource(field.field)}
                  onChange={(e) => handleMappingChange(field.field, e.target.value)}
                  options={[
                    { value: '', label: '— Not mapped —' },
                    ...sourceColumnNames.map((col) => ({ value: col, label: col })),
                  ]}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Advanced section (collapsible) */}
      <Card>
        <button
          type="button"
          className="w-full flex items-center justify-between text-left"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <span className="font-semibold text-[#003559]">Advanced Settings</span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvanced && (
          <div className="mt-4 pt-4 border-t border-[#e0e0e0] text-sm text-gray-500">
            <p>
              Column types and cleaning rules are auto-configured based on your data.
              For fine-grained control, edit the column configuration after import.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

// =============================================================================
// Shared Preview Table
// =============================================================================

function renderPreviewTable(
  columns: ColumnPreview[],
  sampleRows: Record<string, unknown>[]
) {
  if (sampleRows.length === 0) {
    return <div className="p-8 text-center text-gray-500">No data to preview</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[#f5f5f5] border-b border-[#e0e0e0]">
          <tr>
            {columns.map((col) => (
              <th
                key={col.name}
                className="px-3 py-2 text-left text-xs font-semibold text-[#003559] uppercase whitespace-nowrap"
              >
                <div>{col.name}</div>
                <div className="font-normal text-gray-400 normal-case">{col.detected_type}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e0e0e0]">
          {sampleRows.slice(0, 5).map((row, i) => (
            <tr key={i} className="hover:bg-[#f5f5f5]">
              {columns.map((col) => (
                <td key={col.name} className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[200px] truncate">
                  {row[col.name] != null ? String(row[col.name]) : <span className="text-gray-300">null</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {sampleRows.length > 5 && (
        <div className="px-3 py-2 text-xs text-gray-400 border-t border-[#e0e0e0]">
          Showing 5 of {sampleRows.length} sample rows
        </div>
      )}
    </div>
  );
}

export default MapAndCleanStep;
