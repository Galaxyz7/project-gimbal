/**
 * Data Source Constants
 * Shared labels, options, and configuration for data source components
 */

import type { DataSourceType, SyncStatus } from '../types/dataImport';

// =============================================================================
// Labels
// =============================================================================

export const SOURCE_TYPE_LABELS: Record<DataSourceType, string> = {
  csv_upload: 'CSV Upload',
  csv_url: 'CSV (URL)',
  postgres: 'PostgreSQL',
  mysql: 'MySQL',
  mssql: 'SQL Server',
  redshift: 'Redshift',
  bigquery: 'BigQuery',
  snowflake: 'Snowflake',
  google_analytics: 'Google Analytics 4',
  meta_pixel: 'Meta Pixel',
  google_sheets: 'Google Sheets',
  excel: 'Excel',
  rest_api: 'REST API',
  custom_database: 'Custom Database',
};

export const STATUS_VARIANT: Record<SyncStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  idle: 'default',
  syncing: 'warning',
  success: 'success',
  failed: 'danger',
};

export const STATUS_LABELS: Record<SyncStatus, string> = {
  idle: 'Idle',
  syncing: 'Syncing...',
  success: 'Last sync OK',
  failed: 'Sync failed',
};

// =============================================================================
// Source Type Options
// =============================================================================

export interface SourceTypeOption {
  type: DataSourceType;
  label: string;
  description: string;
  category: 'database' | 'file' | 'api';
  available: boolean;
}

export const SOURCE_TYPE_OPTIONS: SourceTypeOption[] = [
  // Database sources
  { type: 'postgres', label: 'PostgreSQL', description: 'Connect to a PostgreSQL database', category: 'database', available: true },
  { type: 'mysql', label: 'MySQL', description: 'Connect to a MySQL database', category: 'database', available: true },
  { type: 'mssql', label: 'SQL Server', description: 'Connect to Microsoft SQL Server', category: 'database', available: true },
  { type: 'redshift', label: 'Amazon Redshift', description: 'Connect to an Amazon Redshift cluster', category: 'database', available: true },
  { type: 'bigquery', label: 'Google BigQuery', description: 'Connect with a service account', category: 'database', available: true },
  { type: 'snowflake', label: 'Snowflake', description: 'Connect to a Snowflake warehouse', category: 'database', available: true },
  { type: 'custom_database', label: 'Custom Database', description: 'Custom connection string', category: 'database', available: true },

  // File sources
  { type: 'csv_upload', label: 'CSV Upload', description: 'Upload a CSV file directly', category: 'file', available: true },
  { type: 'csv_url', label: 'CSV from URL', description: 'Fetch a CSV from a URL', category: 'file', available: true },
  { type: 'excel', label: 'Excel (XLSX)', description: 'Upload an Excel spreadsheet', category: 'file', available: true },
  { type: 'google_sheets', label: 'Google Sheets', description: 'Connect via OAuth', category: 'file', available: false },

  // API / Analytics sources
  { type: 'google_analytics', label: 'Google Analytics 4', description: 'Connect via OAuth', category: 'api', available: false },
  { type: 'meta_pixel', label: 'Meta Pixel', description: 'Connect via OAuth', category: 'api', available: false },
  { type: 'rest_api', label: 'REST API', description: 'Connect to any REST endpoint', category: 'api', available: true },
];

// =============================================================================
// Default Ports
// =============================================================================

export const DEFAULT_PORTS: Partial<Record<DataSourceType, number>> = {
  postgres: 5432,
  mysql: 3306,
  mssql: 1433,
  redshift: 5439,
};
