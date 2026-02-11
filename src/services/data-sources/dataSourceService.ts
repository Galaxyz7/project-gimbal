/**
 * Data Source Service
 * CRUD operations for the data_sources table
 */

import { supabase } from '@/lib/supabase';
import type {
  DataSource,
  CreateDataSourceRequest,
  UpdateDataSourceRequest,
  SyncLog,
} from '@/types/dataImport';

// =============================================================================
// Service
// =============================================================================

export const dataSourceService = {
  async getAll(): Promise<DataSource[]> {
    const { data, error } = await supabase
      .from('data_sources')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch data sources: ${error.message}`);
    return (data as DataSource[]) || [];
  },

  async getById(id: string): Promise<DataSource> {
    const { data, error } = await supabase
      .from('data_sources')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(`Failed to fetch data source: ${error.message}`);
    return data as DataSource;
  },

  async create(input: CreateDataSourceRequest): Promise<DataSource> {
    const insertData: Record<string, unknown> = {
      name: input.name,
      type: input.type,
      credentials: input.credentials,
      config: input.config,
      column_config: input.column_config || { columns: [], row_filters: [], duplicate_handling: 'keep_all' },
      schedule_config: input.schedule_config || { frequency: 'manual', retry_on_failure: true, max_retries: 3, retry_delay_minutes: 15 },
      sync_schedule: input.sync_schedule || 'manual',
    };

    if (input.destination_type) insertData.destination_type = input.destination_type;
    if (input.field_mappings) insertData.field_mappings = input.field_mappings;
    if (input.site_id) insertData.site_id = input.site_id;

    const { data, error } = await supabase
      .from('data_sources')
      .insert(insertData)
      .select()
      .single();

    if (error) throw new Error(`Failed to create data source: ${error.message}`);
    return data as DataSource;
  },

  async update(id: string, input: UpdateDataSourceRequest): Promise<DataSource> {
    const { data, error } = await supabase
      .from('data_sources')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update data source: ${error.message}`);
    return data as DataSource;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('data_sources')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete data source: ${error.message}`);
  },

  async getSyncLogs(dataSourceId: string): Promise<SyncLog[]> {
    const { data, error } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('data_source_id', dataSourceId)
      .order('started_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(`Failed to fetch sync logs: ${error.message}`);
    return (data as SyncLog[]) || [];
  },
};
