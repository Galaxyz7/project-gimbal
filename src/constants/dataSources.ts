/**
 * Data Source Constants
 * Shared labels, options, and configuration for data source components
 */

import type { DataSourceType, SyncStatus, DestinationSchema } from '../types/dataImport';

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

// =============================================================================
// Destination Schemas
// =============================================================================

export const DESTINATION_SCHEMAS: DestinationSchema[] = [
  {
    type: 'members',
    label: 'Member / Contact List',
    description: 'Names, emails, phone numbers, and membership info',
    requiredFields: [
      { field: 'first_name', label: 'First Name', type: 'text' },
      { field: 'last_name', label: 'Last Name', type: 'text' },
    ],
    optionalFields: [
      { field: 'email', label: 'Email Address', type: 'text' },
      { field: 'phone', label: 'Phone Number', type: 'text' },
      { field: 'membership_status', label: 'Membership Status', type: 'text' },
      { field: 'membership_level', label: 'Membership Level', type: 'text' },
      { field: 'date_of_birth', label: 'Date of Birth', type: 'date' },
      { field: 'address_line1', label: 'Address Line 1', type: 'text' },
      { field: 'address_line2', label: 'Address Line 2', type: 'text' },
      { field: 'city', label: 'City', type: 'text' },
      { field: 'state', label: 'State', type: 'text' },
      { field: 'postal_code', label: 'Postal Code', type: 'text' },
      { field: 'tags', label: 'Tags', type: 'text' },
    ],
  },
  {
    type: 'transactions',
    label: 'Purchase History',
    description: 'Transaction amounts, dates, and types (requires existing members)',
    requiredFields: [
      { field: 'member_email', label: 'Member Email (for matching)', type: 'text' },
      { field: 'amount', label: 'Amount', type: 'number' },
      { field: 'transaction_date', label: 'Transaction Date', type: 'date' },
    ],
    optionalFields: [
      { field: 'transaction_type', label: 'Transaction Type', type: 'text' },
      { field: 'description', label: 'Description', type: 'text' },
      { field: 'payment_method', label: 'Payment Method', type: 'text' },
      { field: 'reference_number', label: 'Reference Number', type: 'text' },
    ],
  },
  {
    type: 'visits',
    label: 'Attendance Records',
    description: 'Check-ins, visits, and attendance (requires existing members)',
    requiredFields: [
      { field: 'member_email', label: 'Member Email (for matching)', type: 'text' },
      { field: 'visit_date', label: 'Visit Date', type: 'date' },
    ],
    optionalFields: [
      { field: 'check_in_time', label: 'Check-in Time', type: 'timestamp' },
      { field: 'check_out_time', label: 'Check-out Time', type: 'timestamp' },
      { field: 'visit_type', label: 'Visit Type', type: 'text' },
      { field: 'service_name', label: 'Service Name', type: 'text' },
      { field: 'notes', label: 'Notes', type: 'text' },
    ],
  },
  {
    type: 'custom',
    label: 'Other Data',
    description: 'Custom dataset for reporting — stored in its own table',
    requiredFields: [],
    optionalFields: [],
  },
];

// =============================================================================
// Destination Helpers
// =============================================================================

/**
 * Auto-detect destination type from column headers
 */
export function detectDestinationType(columnNames: string[]): DestinationSchema['type'] {
  const lower = columnNames.map((c) => c.toLowerCase().replace(/[^a-z0-9]/g, ''));

  const memberKeywords = ['firstname', 'lastname', 'email', 'phone', 'membershipstatus'];
  const transactionKeywords = ['amount', 'transactiondate', 'transactiontype', 'paymentmethod'];
  const visitKeywords = ['visitdate', 'checkin', 'checkout', 'visittype'];

  const memberScore = memberKeywords.filter((k) => lower.some((c) => c.includes(k))).length;
  const txnScore = transactionKeywords.filter((k) => lower.some((c) => c.includes(k))).length;
  const visitScore = visitKeywords.filter((k) => lower.some((c) => c.includes(k))).length;

  if (memberScore >= 2) return 'members';
  if (txnScore >= 2) return 'transactions';
  if (visitScore >= 2) return 'visits';

  return 'custom';
}

/**
 * Auto-map source columns to destination fields
 */
export function autoMapFields(
  sourceColumns: string[],
  schema: DestinationSchema
): Array<{ sourceColumn: string; targetField: string }> {
  const allFields = [...schema.requiredFields, ...schema.optionalFields];
  const mappings: Array<{ sourceColumn: string; targetField: string }> = [];

  for (const field of allFields) {
    const fieldNormalized = field.field.replace(/_/g, '').toLowerCase();
    const labelNormalized = field.label.replace(/[^a-z0-9]/gi, '').toLowerCase();

    const match = sourceColumns.find((col) => {
      const colNormalized = col.replace(/[^a-z0-9]/gi, '').toLowerCase();
      return colNormalized === fieldNormalized || colNormalized === labelNormalized;
    });

    if (match) {
      mappings.push({ sourceColumn: match, targetField: field.field });
    }
  }

  return mappings;
}
