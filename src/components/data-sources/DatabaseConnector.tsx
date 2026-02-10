/**
 * Database Connector
 * Step 2a: Connection form for database sources
 */

import { useCallback } from 'react';
import type { DataSourceType, DatabaseCredentials, DataSourceConfig } from '@/types/dataImport';
import { DEFAULT_PORTS } from '@/constants/dataSources';
import { Input } from '../common/Input';
import { Select } from '../common/Select';

// =============================================================================
// Types
// =============================================================================

export interface DatabaseConnectorProps {
  sourceType: DataSourceType;
  name: string;
  credentials: DatabaseCredentials;
  config: DataSourceConfig;
  onNameChange: (name: string) => void;
  onCredentialsChange: (creds: DatabaseCredentials) => void;
  onConfigChange: (config: DataSourceConfig) => void;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function DatabaseConnector({
  sourceType,
  name,
  credentials,
  config,
  onNameChange,
  onCredentialsChange,
  onConfigChange,
  className = '',
}: DatabaseConnectorProps) {
  const isBigQuery = sourceType === 'bigquery';
  const isSnowflake = sourceType === 'snowflake';

  const updateCred = useCallback(
    (field: keyof DatabaseCredentials, value: string | number | boolean) => {
      onCredentialsChange({ ...credentials, [field]: value });
    },
    [credentials, onCredentialsChange]
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Data source name */}
      <Input
        label="Data Source Name"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="e.g., Production Database"
        required
      />

      {isBigQuery ? (
        /* BigQuery uses service account JSON */
        <div>
          <label className="block text-sm font-medium text-[#003559] mb-1">
            Service Account JSON
          </label>
          <textarea
            value={credentials.service_account_json || ''}
            onChange={(e) => updateCred('service_account_json', e.target.value)}
            placeholder='Paste your service account JSON key here...'
            rows={6}
            className="w-full rounded-lg border border-[#e0e0e0] px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0353a4]"
          />
        </div>
      ) : isSnowflake ? (
        /* Snowflake uses account identifier */
        <>
          <Input
            label="Account Identifier"
            value={credentials.account_identifier || ''}
            onChange={(e) => updateCred('account_identifier', e.target.value)}
            placeholder="e.g., xy12345.us-east-1"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Database"
              value={credentials.database || ''}
              onChange={(e) => updateCred('database', e.target.value)}
              placeholder="Database name"
            />
            <Input
              label="Username"
              value={credentials.username || ''}
              onChange={(e) => updateCred('username', e.target.value)}
            />
          </div>
          <Input
            label="Password"
            type="password"
            value={credentials.password || ''}
            onChange={(e) => updateCred('password', e.target.value)}
          />
        </>
      ) : (
        /* Standard database (host/port/db/user/pass) */
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Input
                label="Host"
                value={credentials.host || ''}
                onChange={(e) => updateCred('host', e.target.value)}
                placeholder="e.g., db.example.com"
              />
            </div>
            <Input
              label="Port"
              type="number"
              value={credentials.port ?? DEFAULT_PORTS[sourceType] ?? ''}
              onChange={(e) => updateCred('port', parseInt(e.target.value) || 0)}
            />
          </div>
          <Input
            label="Database"
            value={credentials.database || ''}
            onChange={(e) => updateCred('database', e.target.value)}
            placeholder="Database name"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Username"
              value={credentials.username || ''}
              onChange={(e) => updateCred('username', e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              value={credentials.password || ''}
              onChange={(e) => updateCred('password', e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-[#003559]">
            <input
              type="checkbox"
              checked={credentials.ssl ?? true}
              onChange={(e) => updateCred('ssl', e.target.checked)}
              className="rounded border-[#e0e0e0]"
            />
            Use SSL connection
          </label>
        </>
      )}

      {/* Query type */}
      <div className="border-t border-[#e0e0e0] pt-4 mt-4">
        <Select
          label="Data Selection"
          value={config.query_type || 'table'}
          onChange={(e) => onConfigChange({ ...config, query_type: e.target.value as 'table' | 'custom_query' })}
          options={[
            { value: 'table', label: 'Select a table' },
            { value: 'custom_query', label: 'Custom SQL query' },
          ]}
        />
        {config.query_type === 'custom_query' ? (
          <div className="mt-3">
            <label className="block text-sm font-medium text-[#003559] mb-1">
              SQL Query
            </label>
            <textarea
              value={config.custom_query || ''}
              onChange={(e) => onConfigChange({ ...config, custom_query: e.target.value })}
              placeholder="SELECT * FROM your_table WHERE ..."
              rows={4}
              className="w-full rounded-lg border border-[#e0e0e0] px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0353a4]"
            />
          </div>
        ) : (
          <Input
            label="Table Name"
            value={config.table_name || ''}
            onChange={(e) => onConfigChange({ ...config, table_name: e.target.value })}
            placeholder="e.g., users"
            className="mt-3"
          />
        )}
      </div>
    </div>
  );
}
