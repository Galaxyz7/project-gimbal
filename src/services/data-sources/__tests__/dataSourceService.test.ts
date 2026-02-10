/**
 * Data Source Service Tests
 *
 * Tests for CRUD operations and sync log retrieval
 * against the Supabase data_sources and sync_logs tables.
 */

import { supabase } from '@/lib/supabase';
import { dataSourceService } from '../dataSourceService';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const { mockSingle, mockQueryChain } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockQueryChain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    single: mockSingle,
    then: vi.fn(),
  };
  for (const key of Object.keys(mockQueryChain)) {
    if (key !== 'single' && key !== 'then') {
      mockQueryChain[key].mockReturnValue(mockQueryChain);
    }
  }
  return { mockSingle, mockQueryChain };
});

/**
 * Configure the mock chain to resolve with the given result.
 * Sets both the thenable (.then) for awaited chains and .single() for
 * queries that terminate with .single().
 */
const resolvableChain = (result: { data: unknown; error: unknown }) => {
  Object.defineProperty(mockQueryChain, 'then', {
    value: vi.fn((resolve: (val: unknown) => void) => resolve(result)),
    writable: true,
    configurable: true,
  });
  mockSingle.mockResolvedValue(result);
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockQueryChain),
  },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockDataSource = {
  id: 'ds-1',
  name: 'Test CSV',
  type: 'csv_upload',
  credentials: {},
  config: {},
  column_config: { columns: [], row_filters: [], duplicate_handling: 'keep_all' },
  schedule_config: { frequency: 'manual', retry_on_failure: true, max_retries: 3, retry_delay_minutes: 15 },
  sync_schedule: 'manual',
  sync_status: 'idle',
  is_active: true,
  last_sync_at: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const mockSyncLog = {
  id: 'log-1',
  data_source_id: 'ds-1',
  status: 'success',
  started_at: '2025-01-01T00:00:00Z',
  completed_at: '2025-01-01T00:01:00Z',
  records_processed: 100,
  records_failed: 0,
  error_message: null,
};

// ---------------------------------------------------------------------------
// Reset mocks before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  // Restore default chainable behaviour after clearAllMocks resets implementations
  for (const key of Object.keys(mockQueryChain)) {
    if (key !== 'single' && key !== 'then') {
      mockQueryChain[key].mockReturnValue(mockQueryChain);
    }
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('dataSourceService', () => {
  // -----------------------------------------------------------------------
  // getAll
  // -----------------------------------------------------------------------

  describe('getAll', () => {
    it('should query the data_sources table', async () => {
      resolvableChain({ data: [], error: null });

      await dataSourceService.getAll();

      expect(supabase.from).toHaveBeenCalledWith('data_sources');
    });

    it('should return an array of data sources', async () => {
      resolvableChain({ data: [mockDataSource], error: null });

      const result = await dataSourceService.getAll();

      expect(result).toEqual([mockDataSource]);
      expect(mockQueryChain.select).toHaveBeenCalledWith('*');
      expect(mockQueryChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should return an empty array when data is null', async () => {
      resolvableChain({ data: null, error: null });

      const result = await dataSourceService.getAll();

      expect(result).toEqual([]);
    });

    it('should throw an error when the query fails', async () => {
      resolvableChain({ data: null, error: { message: 'connection error' } });

      await expect(dataSourceService.getAll()).rejects.toThrow(
        'Failed to fetch data sources: connection error',
      );
    });
  });

  // -----------------------------------------------------------------------
  // getById
  // -----------------------------------------------------------------------

  describe('getById', () => {
    it('should return a single data source by id', async () => {
      resolvableChain({ data: mockDataSource, error: null });

      const result = await dataSourceService.getById('ds-1');

      expect(result).toEqual(mockDataSource);
      expect(mockQueryChain.select).toHaveBeenCalledWith('*');
      expect(mockQueryChain.eq).toHaveBeenCalledWith('id', 'ds-1');
      expect(mockSingle).toHaveBeenCalled();
    });

    it('should throw an error when the query fails', async () => {
      resolvableChain({ data: null, error: { message: 'not found' } });

      await expect(dataSourceService.getById('ds-999')).rejects.toThrow(
        'Failed to fetch data source: not found',
      );
    });
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------

  describe('create', () => {
    it('should create a data source with full input', async () => {
      const input = {
        name: 'Test CSV',
        type: 'csv_upload' as const,
        credentials: {},
        config: {},
        column_config: { columns: [], row_filters: [], duplicate_handling: 'keep_all' as const },
        schedule_config: { frequency: 'manual' as const, retry_on_failure: true, max_retries: 3, retry_delay_minutes: 15 },
        sync_schedule: 'manual' as const,
      };

      resolvableChain({ data: mockDataSource, error: null });

      const result = await dataSourceService.create(input);

      expect(result).toEqual(mockDataSource);
      expect(mockQueryChain.insert).toHaveBeenCalledWith({
        name: 'Test CSV',
        type: 'csv_upload',
        credentials: {},
        config: {},
        column_config: input.column_config,
        schedule_config: input.schedule_config,
        sync_schedule: 'manual',
      });
      expect(mockQueryChain.select).toHaveBeenCalled();
      expect(mockSingle).toHaveBeenCalled();
    });

    it('should apply defaults for optional fields when not provided', async () => {
      const input = {
        name: 'Minimal Source',
        type: 'postgres' as const,
        credentials: { host: 'localhost' },
        config: { query_type: 'table' as const },
      };

      resolvableChain({ data: { ...mockDataSource, name: 'Minimal Source', type: 'postgres' }, error: null });

      await dataSourceService.create(input);

      expect(mockQueryChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          column_config: { columns: [], row_filters: [], duplicate_handling: 'keep_all' },
          schedule_config: { frequency: 'manual', retry_on_failure: true, max_retries: 3, retry_delay_minutes: 15 },
          sync_schedule: 'manual',
        }),
      );
    });

    it('should throw an error when creation fails', async () => {
      const input = {
        name: 'Bad Source',
        type: 'csv_upload' as const,
        credentials: {},
        config: {},
      };

      resolvableChain({ data: null, error: { message: 'duplicate name' } });

      await expect(dataSourceService.create(input)).rejects.toThrow(
        'Failed to create data source: duplicate name',
      );
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------

  describe('update', () => {
    it('should update a data source and return the updated record', async () => {
      const updatedSource = { ...mockDataSource, name: 'Updated CSV' };
      resolvableChain({ data: updatedSource, error: null });

      const result = await dataSourceService.update('ds-1', { name: 'Updated CSV' });

      expect(result).toEqual(updatedSource);
      expect(mockQueryChain.update).toHaveBeenCalledWith({ name: 'Updated CSV' });
      expect(mockQueryChain.eq).toHaveBeenCalledWith('id', 'ds-1');
      expect(mockQueryChain.select).toHaveBeenCalled();
      expect(mockSingle).toHaveBeenCalled();
    });

    it('should throw an error when the update fails', async () => {
      resolvableChain({ data: null, error: { message: 'permission denied' } });

      await expect(dataSourceService.update('ds-1', { name: 'Nope' })).rejects.toThrow(
        'Failed to update data source: permission denied',
      );
    });
  });

  // -----------------------------------------------------------------------
  // delete
  // -----------------------------------------------------------------------

  describe('delete', () => {
    it('should delete a data source without throwing', async () => {
      resolvableChain({ data: null, error: null });

      await expect(dataSourceService.delete('ds-1')).resolves.toBeUndefined();
      expect(mockQueryChain.delete).toHaveBeenCalled();
      expect(mockQueryChain.eq).toHaveBeenCalledWith('id', 'ds-1');
    });

    it('should not call .single() on delete', async () => {
      resolvableChain({ data: null, error: null });

      await dataSourceService.delete('ds-1');

      expect(mockSingle).not.toHaveBeenCalled();
    });

    it('should throw an error when deletion fails', async () => {
      resolvableChain({ data: null, error: { message: 'foreign key constraint' } });

      await expect(dataSourceService.delete('ds-1')).rejects.toThrow(
        'Failed to delete data source: foreign key constraint',
      );
    });
  });

  // -----------------------------------------------------------------------
  // getSyncLogs
  // -----------------------------------------------------------------------

  describe('getSyncLogs', () => {
    it('should query the sync_logs table', async () => {
      resolvableChain({ data: [], error: null });

      await dataSourceService.getSyncLogs('ds-1');

      expect(supabase.from).toHaveBeenCalledWith('sync_logs');
    });

    it('should return sync logs for a data source', async () => {
      resolvableChain({ data: [mockSyncLog], error: null });

      const result = await dataSourceService.getSyncLogs('ds-1');

      expect(result).toEqual([mockSyncLog]);
      expect(mockQueryChain.select).toHaveBeenCalledWith('*');
      expect(mockQueryChain.eq).toHaveBeenCalledWith('data_source_id', 'ds-1');
      expect(mockQueryChain.order).toHaveBeenCalledWith('started_at', { ascending: false });
      expect(mockQueryChain.limit).toHaveBeenCalledWith(50);
    });

    it('should return an empty array when data is null', async () => {
      resolvableChain({ data: null, error: null });

      const result = await dataSourceService.getSyncLogs('ds-1');

      expect(result).toEqual([]);
    });

    it('should throw an error when fetching sync logs fails', async () => {
      resolvableChain({ data: null, error: { message: 'timeout' } });

      await expect(dataSourceService.getSyncLogs('ds-1')).rejects.toThrow(
        'Failed to fetch sync logs: timeout',
      );
    });
  });
});
