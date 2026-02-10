
import {
  generateTableName,
  createImportTable,
  registerImportTable,
  getImportTable,
  updateRowCount,
  dropImportTable,
  truncateImportTable,
  queryImportTable,
  insertRows,
  insertRowsBatched,
  getTableColumns,
  addColumn,
} from '../importTableService';

// =============================================================================
// Mock Supabase
// =============================================================================

const { mockSingle, mockQueryChain, mockRpc } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockQueryChain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    single: mockSingle,
    then: vi.fn(),
  };
  for (const key of Object.keys(mockQueryChain)) {
    if (key !== 'single' && key !== 'then') {
      mockQueryChain[key].mockReturnValue(mockQueryChain);
    }
  }
  const mockRpc = vi.fn();
  return { mockSingle, mockQueryChain, mockRpc };
});

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
    rpc: mockRpc,
  },
}));

// =============================================================================
// Tests
// =============================================================================

describe('importTableService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolvableChain({ data: null, error: null });
  });

  // ---------------------------------------------------------------------------
  // generateTableName
  // ---------------------------------------------------------------------------

  describe('generateTableName', () => {
    it('should generate a sanitized table name', () => {
      const name = generateTableName('My Data Source!');
      expect(name).toMatch(/^import_my_data_source_[a-f0-9]{8}$/);
    });

    it('should handle special characters', () => {
      const name = generateTableName('Test @#$ Source');
      expect(name).toMatch(/^import_test_source_[a-f0-9]{8}$/);
    });

    it('should collapse multiple underscores', () => {
      const name = generateTableName('test___source');
      expect(name).toMatch(/^import_test_source_[a-f0-9]{8}$/);
    });
  });

  // ---------------------------------------------------------------------------
  // createImportTable
  // ---------------------------------------------------------------------------

  describe('createImportTable', () => {
    it('should call RPC to create table', async () => {
      mockRpc.mockResolvedValue({ data: 'import_test_12345678', error: null });
      const result = await createImportTable('user-1', 'Test', []);
      expect(result).toBe('import_test_12345678');
      expect(mockRpc).toHaveBeenCalledWith('create_import_table', expect.objectContaining({
        p_user_id: 'user-1',
        p_source_name: 'Test',
      }));
    });

    it('should throw on error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC error' } });
      await expect(createImportTable('user-1', 'Test', [])).rejects.toThrow('Failed to create import table');
    });
  });

  // ---------------------------------------------------------------------------
  // registerImportTable
  // ---------------------------------------------------------------------------

  describe('registerImportTable', () => {
    it('should insert into import_tables', async () => {
      const tableData = { id: '1', data_source_id: 'ds-1', table_name: 'import_test', column_definitions: [], row_count: 0 };
      mockSingle.mockResolvedValue({ data: tableData, error: null });
      const result = await registerImportTable('ds-1', 'import_test', []);
      expect(result).toEqual(tableData);
    });

    it('should throw on error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Insert failed' } });
      await expect(registerImportTable('ds-1', 'test', [])).rejects.toThrow('Failed to register import table');
    });
  });

  // ---------------------------------------------------------------------------
  // getImportTable
  // ---------------------------------------------------------------------------

  describe('getImportTable', () => {
    it('should return import table info', async () => {
      const tableData = { id: '1', table_name: 'import_test' };
      mockSingle.mockResolvedValue({ data: tableData, error: null });
      const result = await getImportTable('ds-1');
      expect(result).toEqual(tableData);
    });

    it('should return null when not found', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
      const result = await getImportTable('nonexistent');
      expect(result).toBeNull();
    });

    it('should throw on unexpected error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: '500', message: 'Server error' } });
      await expect(getImportTable('ds-1')).rejects.toThrow('Failed to get import table');
    });
  });

  // ---------------------------------------------------------------------------
  // updateRowCount
  // ---------------------------------------------------------------------------

  describe('updateRowCount', () => {
    it('should update row count', async () => {
      resolvableChain({ data: null, error: null });
      await updateRowCount('import_test', 100);
      expect(mockQueryChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ row_count: 100 })
      );
    });

    it('should throw on error', async () => {
      resolvableChain({ data: null, error: { message: 'Update failed' } });
      await expect(updateRowCount('import_test', 100)).rejects.toThrow('Failed to update row count');
    });
  });

  // ---------------------------------------------------------------------------
  // dropImportTable
  // ---------------------------------------------------------------------------

  describe('dropImportTable', () => {
    it('should delete from registry and drop table', async () => {
      resolvableChain({ data: null, error: null });
      mockRpc.mockResolvedValue({ data: null, error: null });
      await dropImportTable('import_test');
      expect(mockQueryChain.delete).toHaveBeenCalled();
      expect(mockRpc).toHaveBeenCalledWith('drop_import_table', { p_table_name: 'import_test' });
    });

    it('should throw on RPC error', async () => {
      resolvableChain({ data: null, error: null });
      mockRpc.mockResolvedValue({ data: null, error: { message: 'Drop failed' } });
      await expect(dropImportTable('import_test')).rejects.toThrow('Failed to drop import table');
    });
  });

  // ---------------------------------------------------------------------------
  // truncateImportTable
  // ---------------------------------------------------------------------------

  describe('truncateImportTable', () => {
    it('should truncate table and reset row count', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });
      resolvableChain({ data: null, error: null });
      await truncateImportTable('import_test');
      expect(mockRpc).toHaveBeenCalledWith('truncate_import_table', { p_table_name: 'import_test' });
    });

    it('should throw on error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'Truncate failed' } });
      await expect(truncateImportTable('import_test')).rejects.toThrow('Failed to truncate import table');
    });
  });

  // ---------------------------------------------------------------------------
  // queryImportTable
  // ---------------------------------------------------------------------------

  describe('queryImportTable', () => {
    it('should query table via RPC', async () => {
      mockRpc.mockResolvedValue({
        data: { rows: [{ id: 1, name: 'Test' }], total_count: 1 },
        error: null,
      });
      const result = await queryImportTable('import_test');
      expect(result.data).toHaveLength(1);
      expect(result.count).toBe(1);
    });

    it('should pass options', async () => {
      mockRpc.mockResolvedValue({ data: { rows: [], total_count: 0 }, error: null });
      await queryImportTable('import_test', { limit: 50, offset: 10, orderBy: 'name' });
      expect(mockRpc).toHaveBeenCalledWith('query_import_table', expect.objectContaining({
        p_limit: 50,
        p_offset: 10,
        p_order_by: 'name',
      }));
    });

    it('should throw on error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'Query failed' } });
      await expect(queryImportTable('import_test')).rejects.toThrow('Failed to query import table');
    });
  });

  // ---------------------------------------------------------------------------
  // insertRows
  // ---------------------------------------------------------------------------

  describe('insertRows', () => {
    it('should return 0 for empty rows', async () => {
      const result = await insertRows('import_test', []);
      expect(result).toBe(0);
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('should insert rows via RPC', async () => {
      mockRpc.mockResolvedValue({ data: 5, error: null });
      const result = await insertRows('import_test', [{ name: 'Test' }]);
      expect(result).toBe(5);
    });

    it('should throw on error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'Insert failed' } });
      await expect(insertRows('import_test', [{ name: 'Test' }])).rejects.toThrow('Failed to insert rows');
    });
  });

  // ---------------------------------------------------------------------------
  // insertRowsBatched
  // ---------------------------------------------------------------------------

  describe('insertRowsBatched', () => {
    it('should batch insert rows', async () => {
      mockRpc.mockResolvedValue({ data: 2, error: null });
      resolvableChain({ data: null, error: null });
      const rows = Array.from({ length: 5 }, (_, i) => ({ id: i }));
      const result = await insertRowsBatched('import_test', rows, 2);
      // 5 rows with batch size 2 = 3 batches
      expect(mockRpc).toHaveBeenCalledTimes(3);
      expect(result).toBe(6); // 2 * 3 batches
    });

    it('should call onProgress callback', async () => {
      mockRpc.mockResolvedValue({ data: 1, error: null });
      resolvableChain({ data: null, error: null });
      const onProgress = vi.fn();
      await insertRowsBatched('import_test', [{ a: 1 }, { a: 2 }], 1, onProgress);
      expect(onProgress).toHaveBeenCalledTimes(2);
    });
  });

  // ---------------------------------------------------------------------------
  // getTableColumns / addColumn
  // ---------------------------------------------------------------------------

  describe('getTableColumns', () => {
    it('should return columns', async () => {
      mockRpc.mockResolvedValue({ data: [{ name: 'id', type: 'uuid', nullable: false }], error: null });
      const result = await getTableColumns('import_test');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('id');
    });
  });

  describe('addColumn', () => {
    it('should call RPC to add column', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });
      await addColumn('import_test', 'new_col', 'text');
      expect(mockRpc).toHaveBeenCalledWith('add_import_table_column', {
        p_table_name: 'import_test',
        p_column_name: 'new_col',
        p_column_type: 'text',
      });
    });
  });
});
