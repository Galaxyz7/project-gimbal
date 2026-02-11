/**
 * Review Step
 * Step 7: Read-only summary before creating the data source
 */

import type { DataSourceType, DataSourceConfig, ColumnConfig, ScheduleConfiguration, DatabaseCredentials, DestinationType, FieldMapping } from '@/types/dataImport';
import { SOURCE_TYPE_LABELS, DESTINATION_SCHEMAS } from '@/constants/dataSources';
import { getScheduleDescription } from '@/services/data-sources/scheduleService';
import { Badge } from '../common/Badge';

// =============================================================================
// Types
// =============================================================================

export interface ReviewStepProps {
  name: string;
  sourceType: DataSourceType;
  config: DataSourceConfig;
  credentials: DatabaseCredentials;
  columns: ColumnConfig[];
  scheduleConfig: ScheduleConfiguration;
  destinationType?: DestinationType | null;
  fieldMappings?: FieldMapping[];
  className?: string;
}

// =============================================================================
// Sub-components
// =============================================================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#e0e0e0] rounded-lg overflow-hidden">
      <div className="bg-[#f5f5f5] px-4 py-2 border-b border-[#e0e0e0]">
        <h3 className="text-sm font-medium text-[#003559]">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1.5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-[#003559] font-medium">{value}</span>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function ReviewStep({
  name,
  sourceType,
  config,
  credentials,
  columns,
  scheduleConfig,
  destinationType,
  fieldMappings = [],
  className = '',
}: ReviewStepProps) {
  const includedColumns = columns.filter((c) => c.included);
  const totalRules = includedColumns.reduce((sum, col) => sum + col.cleaning_rules.length, 0);
  const scheduleDescription = getScheduleDescription(scheduleConfig);
  const destSchema = destinationType
    ? DESTINATION_SCHEMAS.find((s) => s.type === destinationType)
    : null;

  return (
    <div className={`space-y-4 ${className}`}>
      <p className="text-sm text-gray-500">
        Review the configuration before importing.
      </p>

      {/* General info */}
      <Section title="General">
        <DetailRow label="Name" value={name} />
        <DetailRow label="Source Type" value={SOURCE_TYPE_LABELS[sourceType] ?? sourceType} />
        {destSchema && (
          <DetailRow label="Destination" value={destSchema.label} />
        )}
      </Section>

      {/* Connection details */}
      <Section title="Connection">
        {credentials.host && <DetailRow label="Host" value={credentials.host} />}
        {credentials.port && <DetailRow label="Port" value={credentials.port} />}
        {credentials.database && <DetailRow label="Database" value={credentials.database} />}
        {credentials.username && <DetailRow label="Username" value={credentials.username} />}
        {credentials.account_identifier && (
          <DetailRow label="Account" value={credentials.account_identifier} />
        )}
        {credentials.service_account_json && (
          <DetailRow label="Service Account" value="Configured" />
        )}
        {credentials.ssl !== undefined && (
          <DetailRow label="SSL" value={credentials.ssl ? 'Enabled' : 'Disabled'} />
        )}
        {config.query_type && (
          <DetailRow
            label="Data Selection"
            value={config.query_type === 'custom_query' ? 'Custom SQL Query' : `Table: ${config.table_name ?? '—'}`}
          />
        )}
      </Section>

      {/* Columns */}
      <Section title="Columns">
        <DetailRow label="Included Columns" value={`${includedColumns.length} of ${columns.length}`} />
        <DetailRow label="Cleaning Rules" value={totalRules} />
        {includedColumns.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {includedColumns.map((col) => (
              <Badge key={col.source_name} variant="default" size="sm">
                {col.target_name}
              </Badge>
            ))}
          </div>
        )}
      </Section>

      {/* Field Mappings */}
      {fieldMappings.length > 0 && destSchema && (
        <Section title="Field Mappings">
          <DetailRow label="Mapped Fields" value={`${fieldMappings.length} of ${destSchema.requiredFields.length + destSchema.optionalFields.length}`} />
          {fieldMappings.map((m) => (
            <DetailRow
              key={m.targetField}
              label={m.targetField}
              value={
                <span className="flex items-center gap-2">
                  <span className="text-gray-400">&larr;</span> {m.sourceColumn}
                  {m.required && (
                    <Badge variant="danger" size="sm">Required</Badge>
                  )}
                </span>
              }
            />
          ))}
        </Section>
      )}

      {/* Schedule */}
      <Section title="Schedule">
        <DetailRow label="Frequency" value={scheduleConfig.frequency} />
        <DetailRow label="Schedule" value={scheduleDescription} />
        <DetailRow
          label="Retry on Failure"
          value={
            scheduleConfig.retry_on_failure
              ? `Yes (${scheduleConfig.max_retries} retries, ${scheduleConfig.retry_delay_minutes}min delay)`
              : 'No'
          }
        />
      </Section>
    </div>
  );
}
