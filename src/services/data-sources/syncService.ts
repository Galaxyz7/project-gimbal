/**
 * Sync Service
 * Orchestrates the data import pipeline: clean → map → route → log
 */

import { supabase } from '@/lib/supabase';
import type {
  FieldMapping,
  SyncResult,
  DestinationType,
  ColumnConfiguration,
} from '@/types/dataImport';
import { processRows } from './cleaningService';
import { insertRowsBatched } from './importTableService';

// =============================================================================
// Error Handling
// =============================================================================

interface ServiceError extends Error {
  cause?: Error;
}

function SyncServiceError(message: string, cause?: Error): ServiceError {
  const error = new Error(message) as ServiceError;
  error.name = 'SyncServiceError';
  if (cause) error.cause = cause;
  return error;
}

// =============================================================================
// Sync Log Management
// =============================================================================

async function createSyncLog(dataSourceId: string): Promise<string> {
  const { data, error } = await supabase
    .from('sync_logs')
    .insert({
      data_source_id: dataSourceId,
      status: 'started',
    })
    .select('id')
    .single();

  if (error) throw SyncServiceError('Failed to create sync log', error);
  return data.id as string;
}

async function updateSyncLog(
  syncLogId: string,
  update: {
    status: 'success' | 'failed' | 'partial';
    records_imported?: number;
    records_skipped?: number;
    records_failed?: number;
    error_message?: string;
  }
): Promise<void> {
  const { error } = await supabase
    .from('sync_logs')
    .update({
      ...update,
      completed_at: new Date().toISOString(),
    })
    .eq('id', syncLogId);

  if (error) {
    console.error('Failed to update sync log:', error);
  }
}

async function updateDataSourceStatus(
  dataSourceId: string,
  syncStatus: 'idle' | 'syncing' | 'success' | 'failed'
): Promise<void> {
  const updateData: Record<string, unknown> = {
    sync_status: syncStatus,
    updated_at: new Date().toISOString(),
  };

  if (syncStatus === 'success' || syncStatus === 'failed') {
    updateData.last_sync_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('data_sources')
    .update(updateData)
    .eq('id', dataSourceId);

  if (error) {
    console.error('Failed to update data source status:', error);
  }
}

// =============================================================================
// Row Mapping
// =============================================================================

function mapRowToDestination(
  row: Record<string, unknown>,
  fieldMappings: FieldMapping[]
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};

  for (const mapping of fieldMappings) {
    const value = row[mapping.sourceColumn];
    if (value !== undefined) {
      mapped[mapping.targetField] = value;
    }
  }

  return mapped;
}

// =============================================================================
// Destination Routers
// =============================================================================

async function routeToMembers(
  rows: Record<string, unknown>[],
  siteId: string | null
): Promise<{ imported: number; skipped: number; errors: Array<{ row: number; message: string }> }> {
  let imported = 0;
  let skipped = 0;
  const errors: Array<{ row: number; message: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Require at least first_name or email
    if (!row.first_name && !row.email) {
      skipped++;
      errors.push({ row: i + 1, message: 'Missing first_name and email' });
      continue;
    }

    const insertData: Record<string, unknown> = {
      first_name: row.first_name || null,
      last_name: row.last_name || null,
      email: row.email ? String(row.email).toLowerCase().trim() : null,
      phone: row.phone || null,
      membership_status: row.membership_status || 'active',
      date_of_birth: row.date_of_birth || null,
      address_line1: row.address_line1 || null,
      address_line2: row.address_line2 || null,
      city: row.city || null,
      state: row.state || null,
      postal_code: row.postal_code || null,
      tags: row.tags ? (typeof row.tags === 'string' ? row.tags.split(',').map((t: string) => t.trim()) : row.tags) : [],
    };

    if (siteId) {
      insertData.site_id = siteId;
    }

    const { error } = await supabase.from('members').insert(insertData);

    if (error) {
      // Duplicate email? Skip
      if (error.code === '23505') {
        skipped++;
        errors.push({ row: i + 1, message: `Duplicate: ${row.email || row.first_name}` });
      } else {
        errors.push({ row: i + 1, message: error.message });
      }
    } else {
      imported++;
    }
  }

  return { imported, skipped, errors };
}

async function routeToTransactions(
  rows: Record<string, unknown>[],
  siteId: string | null
): Promise<{ imported: number; skipped: number; errors: Array<{ row: number; message: string }> }> {
  let imported = 0;
  let skipped = 0;
  const errors: Array<{ row: number; message: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    if (!row.member_email || !row.amount || !row.transaction_date) {
      skipped++;
      errors.push({ row: i + 1, message: 'Missing required fields (member_email, amount, transaction_date)' });
      continue;
    }

    // Look up member by email
    let memberQuery = supabase
      .from('members')
      .select('id')
      .eq('email', String(row.member_email).toLowerCase().trim());

    if (siteId) {
      memberQuery = memberQuery.eq('site_id', siteId);
    }

    const { data: member } = await memberQuery.limit(1).single();

    if (!member) {
      skipped++;
      errors.push({ row: i + 1, message: `Member not found: ${row.member_email}` });
      continue;
    }

    const { error } = await supabase.from('member_transactions').insert({
      member_id: member.id,
      amount: Number(row.amount),
      transaction_date: row.transaction_date,
      transaction_type: row.transaction_type || 'purchase',
      description: row.description || null,
      payment_method: row.payment_method || null,
      reference_number: row.reference_number || null,
    });

    if (error) {
      errors.push({ row: i + 1, message: error.message });
    } else {
      imported++;
    }
  }

  return { imported, skipped, errors };
}

async function routeToVisits(
  rows: Record<string, unknown>[],
  siteId: string | null
): Promise<{ imported: number; skipped: number; errors: Array<{ row: number; message: string }> }> {
  let imported = 0;
  let skipped = 0;
  const errors: Array<{ row: number; message: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    if (!row.member_email || !row.visit_date) {
      skipped++;
      errors.push({ row: i + 1, message: 'Missing required fields (member_email, visit_date)' });
      continue;
    }

    // Look up member by email
    let memberQuery = supabase
      .from('members')
      .select('id')
      .eq('email', String(row.member_email).toLowerCase().trim());

    if (siteId) {
      memberQuery = memberQuery.eq('site_id', siteId);
    }

    const { data: member } = await memberQuery.limit(1).single();

    if (!member) {
      skipped++;
      errors.push({ row: i + 1, message: `Member not found: ${row.member_email}` });
      continue;
    }

    const { error } = await supabase.from('member_visits').insert({
      member_id: member.id,
      site_id: siteId,
      visit_date: row.visit_date,
      check_in_time: row.check_in_time || null,
      check_out_time: row.check_out_time || null,
      visit_type: row.visit_type || 'general',
      service_name: row.service_name || null,
      notes: row.notes || null,
    });

    if (error) {
      errors.push({ row: i + 1, message: error.message });
    } else {
      imported++;
    }
  }

  return { imported, skipped, errors };
}

async function routeToCustomTable(
  rows: Record<string, unknown>[],
  tableName: string
): Promise<{ imported: number; skipped: number; errors: Array<{ row: number; message: string }> }> {
  const count = await insertRowsBatched(tableName, rows);
  return { imported: count, skipped: 0, errors: [] };
}

// =============================================================================
// Main Sync Pipeline
// =============================================================================

export interface SyncOptions {
  dataSourceId: string;
  rawRows: Record<string, unknown>[];
  columnConfig: ColumnConfiguration;
  fieldMappings: FieldMapping[];
  destinationType: DestinationType;
  siteId?: string | null;
  /** Required for 'custom' destination type */
  tableName?: string;
}

/**
 * Execute the full sync pipeline for a data source.
 *
 * Pipeline: raw rows → clean → map → route → log
 */
export async function executeSyncPipeline(options: SyncOptions): Promise<SyncResult> {
  const { dataSourceId, rawRows, columnConfig, fieldMappings, destinationType, siteId, tableName } = options;

  // 1. Create sync log
  const syncLogId = await createSyncLog(dataSourceId);
  await updateDataSourceStatus(dataSourceId, 'syncing');

  try {
    // 2. Clean rows
    const { cleanedRows } = processRows(rawRows, columnConfig);

    // 3. Map to destination schema
    const mappedRows = cleanedRows.map((row: Record<string, unknown>) => mapRowToDestination(row, fieldMappings));

    // 4. Route to destination
    let result: { imported: number; skipped: number; errors: Array<{ row: number; message: string }> };

    switch (destinationType) {
      case 'members':
        result = await routeToMembers(mappedRows, siteId ?? null);
        break;
      case 'transactions':
        result = await routeToTransactions(mappedRows, siteId ?? null);
        break;
      case 'visits':
        result = await routeToVisits(mappedRows, siteId ?? null);
        break;
      case 'custom':
        if (!tableName) throw SyncServiceError('tableName required for custom destination');
        result = await routeToCustomTable(mappedRows, tableName);
        break;
      default:
        throw SyncServiceError(`Unknown destination type: ${destinationType}`);
    }

    // 5. Update sync log
    const status = result.errors.length > 0 && result.imported > 0 ? 'partial' : result.imported > 0 ? 'success' : 'failed';

    await updateSyncLog(syncLogId, {
      status,
      records_imported: result.imported,
      records_skipped: result.skipped,
      records_failed: result.errors.length,
      error_message: result.errors.length > 0 ? `${result.errors.length} rows had errors` : undefined,
    });

    await updateDataSourceStatus(dataSourceId, status === 'failed' ? 'failed' : 'success');

    return {
      syncLogId,
      status,
      recordsImported: result.imported,
      recordsSkipped: result.skipped,
      recordsFailed: result.errors.length,
      errors: result.errors.slice(0, 50), // Cap error list
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown sync error';

    await updateSyncLog(syncLogId, {
      status: 'failed',
      error_message: message,
    });

    await updateDataSourceStatus(dataSourceId, 'failed');

    return {
      syncLogId,
      status: 'failed',
      recordsImported: 0,
      recordsSkipped: 0,
      recordsFailed: rawRows.length,
      errors: [{ row: 0, message }],
    };
  }
}

// =============================================================================
// Export Service Object
// =============================================================================

export const syncService = {
  executeSyncPipeline,
};
