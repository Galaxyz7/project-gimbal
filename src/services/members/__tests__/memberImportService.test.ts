/**
 * Tests for memberImportService
 *
 * Covers pure functions (parseCSV, generatePreview, suggestFieldMappings)
 * and async Supabase-calling functions (importMembers, importTransactions, importVisits).
 */

import type { ParsedCSVData } from '../memberImportService';
import type { MemberImportMapping, MemberImportConfig } from '@/types/member';

// =============================================================================
// Mock Supabase
// =============================================================================

const { mockSingle, mockQueryChain, mockGetUser, mockFrom } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockQueryChain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
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
  const mockGetUser = vi.fn();
  const mockFrom = vi.fn(() => mockQueryChain);
  return { mockSingle, mockQueryChain, mockGetUser, mockFrom };
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
    from: mockFrom,
    auth: { getUser: mockGetUser },
  },
}));

// =============================================================================
// Mock cleaningService
// =============================================================================

const { mockDetectColumnType, mockApplyColumnRules } = vi.hoisted(() => ({
  mockDetectColumnType: vi.fn().mockReturnValue({ type: 'text', confidence: 1 }),
  mockApplyColumnRules: vi.fn().mockReturnValue({ value: 'cleaned', skip: false }),
}));

vi.mock('@/services/data-sources/cleaningService', () => ({
  detectColumnType: mockDetectColumnType,
  applyColumnRules: mockApplyColumnRules,
}));

// =============================================================================
// Import after mocks
// =============================================================================

import {
  parseCSV,
  generatePreview,
  suggestFieldMappings,
  importMembers,
  importTransactions,
  importVisits,
} from '../memberImportService';

// =============================================================================
// Test Data
// =============================================================================

const testCSV: ParsedCSVData = {
  headers: ['Email', 'First Name', 'Last Name', 'Phone'],
  rows: [['john@test.com', 'John', 'Doe', '5551234567']],
  totalRows: 1,
};

const testMappings: MemberImportMapping[] = [
  { sourceColumn: 'Email', targetField: 'email', transformRules: [] },
  { sourceColumn: 'First Name', targetField: 'firstName', transformRules: [] },
  { sourceColumn: 'Last Name', targetField: 'lastName', transformRules: [] },
  { sourceColumn: 'Phone', targetField: 'phone', transformRules: [] },
];

const testConfig: MemberImportConfig = {
  siteId: 'site-1',
  defaultMembershipLevelId: 'level-1',
  defaultAcquisitionSource: 'import' as const,
  defaultTags: ['imported'],
  duplicateHandling: 'skip' as const,
  matchFields: ['email' as const],
};

// =============================================================================
// Tests
// =============================================================================

describe('memberImportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolvableChain({ data: [], error: null });
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@gimbal.test' } },
      error: null,
    });
  });

  // ---------------------------------------------------------------------------
  // parseCSV
  // ---------------------------------------------------------------------------

  describe('parseCSV', () => {
    it('should parse basic CSV with header and rows', () => {
      const result = parseCSV('Name,Email\nJohn,john@test.com\nJane,jane@test.com');
      expect(result.headers).toEqual(['Name', 'Email']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual(['John', 'john@test.com']);
      expect(result.rows[1]).toEqual(['Jane', 'jane@test.com']);
      expect(result.totalRows).toBe(2);
    });

    it('should parse with custom tab delimiter', () => {
      const result = parseCSV('Name\tEmail\nJohn\tjohn@test.com', '\t');
      expect(result.headers).toEqual(['Name', 'Email']);
      expect(result.rows[0]).toEqual(['John', 'john@test.com']);
    });

    it('should parse with semicolon delimiter', () => {
      const result = parseCSV('Name;Email\nJohn;john@test.com', ';');
      expect(result.headers).toEqual(['Name', 'Email']);
      expect(result.rows[0]).toEqual(['John', 'john@test.com']);
    });

    it('should return empty arrays for empty content', () => {
      const result = parseCSV('');
      expect(result.headers).toEqual([]);
      expect(result.rows).toEqual([]);
      expect(result.totalRows).toBe(0);
    });

    it('should handle quoted values with commas inside', () => {
      const result = parseCSV('Name,Address\nJohn,"123 Main St, Apt 4"');
      expect(result.headers).toEqual(['Name', 'Address']);
      expect(result.rows[0]).toEqual(['John', '123 Main St, Apt 4']);
    });

    it('should handle escaped quotes inside quoted fields', () => {
      const result = parseCSV('Name,Note\nJohn,"He said ""hello"""');
      expect(result.headers).toEqual(['Name', 'Note']);
      expect(result.rows[0]).toEqual(['John', 'He said "hello"']);
    });

    it('should filter completely empty rows', () => {
      const result = parseCSV('Name,Email\nJohn,john@test.com\n,,\nJane,jane@test.com');
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual(['John', 'john@test.com']);
      expect(result.rows[1]).toEqual(['Jane', 'jane@test.com']);
      // totalRows includes the empty row before filtering
      expect(result.totalRows).toBe(3);
    });

    it('should handle Windows line endings (\\r\\n)', () => {
      const result = parseCSV('Name,Email\r\nJohn,john@test.com\r\nJane,jane@test.com');
      expect(result.headers).toEqual(['Name', 'Email']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual(['John', 'john@test.com']);
    });

    it('should return empty rows for header only (no data)', () => {
      const result = parseCSV('Name,Email');
      expect(result.headers).toEqual(['Name', 'Email']);
      expect(result.rows).toEqual([]);
      expect(result.totalRows).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // generatePreview
  // ---------------------------------------------------------------------------

  describe('generatePreview', () => {
    it('should generate correct column previews with type detection', () => {
      const data: ParsedCSVData = {
        headers: ['Name', 'Email'],
        rows: [
          ['John', 'john@test.com'],
          ['Jane', 'jane@test.com'],
        ],
        totalRows: 2,
      };

      const preview = generatePreview(data);

      expect(preview.columns).toHaveLength(2);
      expect(preview.columns[0].name).toBe('Name');
      expect(preview.columns[1].name).toBe('Email');
      expect(mockDetectColumnType).toHaveBeenCalledTimes(2);
      expect(preview.totalRows).toBe(2);
    });

    it('should limit rows to maxRows parameter', () => {
      const data: ParsedCSVData = {
        headers: ['Name'],
        rows: Array.from({ length: 20 }, (_, i) => [`Person${i}`]),
        totalRows: 20,
      };

      const preview = generatePreview(data, 5);
      expect(preview.rows).toHaveLength(5);
      expect(preview.rows[0]).toEqual({ Name: 'Person0' });
      expect(preview.rows[4]).toEqual({ Name: 'Person4' });
    });

    it('should handle empty data', () => {
      const data: ParsedCSVData = { headers: [], rows: [], totalRows: 0 };
      const preview = generatePreview(data);
      expect(preview.columns).toEqual([]);
      expect(preview.rows).toEqual([]);
      expect(preview.totalRows).toBe(0);
    });

    it('should report null and unique counts correctly', () => {
      const data: ParsedCSVData = {
        headers: ['Status'],
        rows: [['active'], ['active'], [''], ['expired'], ['']],
        totalRows: 5,
      };

      const preview = generatePreview(data);
      const col = preview.columns[0];
      expect(col.nullCount).toBe(2);
      expect(col.uniqueCount).toBe(2); // 'active' and 'expired'
    });

    it('should exclude empty strings from sample values', () => {
      const data: ParsedCSVData = {
        headers: ['City'],
        rows: [[''], ['Denver'], [''], ['Austin'], ['Seattle']],
        totalRows: 5,
      };

      const preview = generatePreview(data);
      const col = preview.columns[0];
      // sampleValues takes first 5, then filters empties
      expect(col.sampleValues).toEqual(['Denver', 'Austin', 'Seattle']);
    });
  });

  // ---------------------------------------------------------------------------
  // suggestFieldMappings
  // ---------------------------------------------------------------------------

  describe('suggestFieldMappings', () => {
    it('should map "First Name" to firstName', () => {
      const result = suggestFieldMappings(['First Name']);
      expect(result[0].targetField).toBe('firstName');
    });

    it('should map "Email Address" to email', () => {
      const result = suggestFieldMappings(['Email Address']);
      expect(result[0].targetField).toBe('email');
    });

    it('should map "Phone Number" to phone', () => {
      const result = suggestFieldMappings(['Phone Number']);
      expect(result[0].targetField).toBe('phone');
    });

    it('should map unknown headers to skip', () => {
      const result = suggestFieldMappings(['Favorite Color']);
      expect(result[0].targetField).toBe('skip');
      expect(result[0].sourceColumn).toBe('Favorite Color');
    });

    it('should handle multiple recognizable headers', () => {
      const result = suggestFieldMappings([
        'Email',
        'First Name',
        'Last Name',
        'Mobile',
        'DOB',
      ]);
      expect(result[0].targetField).toBe('email');
      expect(result[1].targetField).toBe('firstName');
      expect(result[2].targetField).toBe('lastName');
      expect(result[3].targetField).toBe('phone');
      expect(result[4].targetField).toBe('dateOfBirth');
    });

    it('should match case insensitively', () => {
      const result = suggestFieldMappings(['EMAIL', 'firstname', 'PHONE']);
      expect(result[0].targetField).toBe('email');
      expect(result[1].targetField).toBe('firstName');
      expect(result[2].targetField).toBe('phone');
    });
  });

  // ---------------------------------------------------------------------------
  // importMembers
  // ---------------------------------------------------------------------------

  describe('importMembers', () => {
    it('should throw when not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      await expect(importMembers(testCSV, testMappings, testConfig)).rejects.toThrow(
        'Not authenticated'
      );
    });

    it('should successfully import a basic member', async () => {
      // findDuplicateMember returns no match
      resolvableChain({ data: [], error: null });
      // insert succeeds
      resolvableChain({ data: null, error: null });

      const result = await importMembers(testCSV, testMappings, testConfig);

      expect(result.imported).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.totalRows).toBe(1);
    });

    it('should call progress callback', async () => {
      resolvableChain({ data: [], error: null });
      resolvableChain({ data: null, error: null });

      const onProgress = vi.fn();
      await importMembers(testCSV, testMappings, testConfig, onProgress);

      // Called at least for initial processing, per-row, and completion
      expect(onProgress).toHaveBeenCalled();

      // Verify completion call
      const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1][0];
      expect(lastCall.phase).toBe('complete');
      expect(lastCall.processed).toBe(1);
      expect(lastCall.total).toBe(1);
    });

    it('should fail row when no identifier is present', async () => {
      const noIdMappings: MemberImportMapping[] = [
        { sourceColumn: 'First Name', targetField: 'firstName', transformRules: [] },
        { sourceColumn: 'Last Name', targetField: 'lastName', transformRules: [] },
      ];
      const noIdCSV: ParsedCSVData = {
        headers: ['First Name', 'Last Name'],
        rows: [['John', 'Doe']],
        totalRows: 1,
      };

      const result = await importMembers(noIdCSV, noIdMappings, testConfig);

      expect(result.failed).toBe(1);
      expect(result.imported).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('identifier');
    });

    it('should skip duplicate when strategy is "skip"', async () => {
      // findDuplicateMember returns existing member
      resolvableChain({ data: [{ id: 'existing-id' }], error: null });

      const skipConfig = { ...testConfig, duplicateHandling: 'skip' as const };
      const result = await importMembers(testCSV, testMappings, skipConfig);

      expect(result.skipped).toBe(1);
      expect(result.imported).toBe(0);
    });

    it('should update duplicate when strategy is "update"', async () => {
      // findDuplicateMember returns existing member
      resolvableChain({ data: [{ id: 'existing-id' }], error: null });
      // update succeeds (the update call also resolves via the chain)

      const updateConfig = { ...testConfig, duplicateHandling: 'update' as const };
      const result = await importMembers(testCSV, testMappings, updateConfig);

      expect(result.updated).toBe(1);
      expect(result.imported).toBe(0);
      expect(mockFrom).toHaveBeenCalledWith('members');
      expect(mockQueryChain.update).toHaveBeenCalled();
    });

    it('should create new when strategy is "create_new" even with duplicate', async () => {
      // findDuplicateMember returns existing member
      resolvableChain({ data: [{ id: 'existing-id' }], error: null });
      // insert succeeds (falls through to create)

      const createNewConfig = { ...testConfig, duplicateHandling: 'create_new' as const };
      const result = await importMembers(testCSV, testMappings, createNewConfig);

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
      expect(mockQueryChain.insert).toHaveBeenCalled();
    });

    it('should handle insert error gracefully', async () => {
      // findDuplicateMember returns no match
      resolvableChain({ data: [], error: null });
      // Insert fails
      resolvableChain({ data: null, error: { message: 'Database constraint violated' } });

      const result = await importMembers(testCSV, testMappings, testConfig);

      expect(result.failed).toBe(1);
      expect(result.imported).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Database constraint violated');
      expect(result.errors[0].field).toBe('database');
    });

    it('should return correct counts for mixed results', async () => {
      const multiCSV: ParsedCSVData = {
        headers: ['Email', 'First Name'],
        rows: [
          ['john@test.com', 'John'],
          ['jane@test.com', 'Jane'],
          ['', ''],
        ],
        totalRows: 3,
      };
      const multiMappings: MemberImportMapping[] = [
        { sourceColumn: 'Email', targetField: 'email', transformRules: [] },
        { sourceColumn: 'First Name', targetField: 'firstName', transformRules: [] },
      ];

      // Row 1: no duplicate, insert OK
      // Row 2: no duplicate, insert OK
      // Row 3: filtered out as empty row by parseCSV... but we're passing raw data
      // Actually row 3 has empty email -> no identifier -> fails
      resolvableChain({ data: [], error: null });
      resolvableChain({ data: null, error: null });

      const result = await importMembers(multiCSV, multiMappings, testConfig);

      // Row 1 and 2 pass duplicate check (empty data array) and insert (null error)
      // Row 3 has no identifier -> fails
      expect(result.totalRows).toBe(3);
      expect(result.imported).toBe(2);
      expect(result.failed).toBe(1);
    });

    it('should apply cleaning rules when present in mapping', async () => {
      const cleaningMappings: MemberImportMapping[] = [
        {
          sourceColumn: 'Email',
          targetField: 'email',
          transformRules: [JSON.stringify({ type: 'trim' })],
        },
        { sourceColumn: 'First Name', targetField: 'firstName', transformRules: [] },
        { sourceColumn: 'Last Name', targetField: 'lastName', transformRules: [] },
        { sourceColumn: 'Phone', targetField: 'phone', transformRules: [] },
      ];

      mockApplyColumnRules.mockReturnValue({ value: 'cleaned@test.com', skip: false });

      // findDuplicateMember: no duplicate
      resolvableChain({ data: [], error: null });
      // insert succeeds
      resolvableChain({ data: null, error: null });

      const result = await importMembers(testCSV, cleaningMappings, testConfig);

      expect(mockApplyColumnRules).toHaveBeenCalled();
      expect(result.imported).toBe(1);
    });

    it('should skip row when cleaning rule returns skip: true', async () => {
      const cleaningMappings: MemberImportMapping[] = [
        {
          sourceColumn: 'Email',
          targetField: 'email',
          transformRules: [JSON.stringify({ type: 'validate_email', on_invalid: 'skip' })],
        },
        { sourceColumn: 'First Name', targetField: 'firstName', transformRules: [] },
        { sourceColumn: 'Last Name', targetField: 'lastName', transformRules: [] },
        { sourceColumn: 'Phone', targetField: 'phone', transformRules: [] },
      ];

      // Cleaning rule says skip
      mockApplyColumnRules.mockReturnValue({ value: null, skip: true });

      // Since email will be skipped, the member won't have email set
      // But phone mapping is still there, so it will have phone as identifier
      // findDuplicateMember: no match
      resolvableChain({ data: [], error: null });
      // insert succeeds
      resolvableChain({ data: null, error: null });

      const result = await importMembers(testCSV, cleaningMappings, testConfig);

      expect(mockApplyColumnRules).toHaveBeenCalled();
      // Row should still import because phone is present as identifier
      expect(result.imported).toBe(1);
    });

    it('should handle row with email but no other identifiers', async () => {
      const emailOnlyCSV: ParsedCSVData = {
        headers: ['Email'],
        rows: [['test@example.com']],
        totalRows: 1,
      };
      const emailOnlyMappings: MemberImportMapping[] = [
        { sourceColumn: 'Email', targetField: 'email', transformRules: [] },
      ];

      // No duplicate
      resolvableChain({ data: [], error: null });
      // Insert succeeds
      resolvableChain({ data: null, error: null });

      const result = await importMembers(emailOnlyCSV, emailOnlyMappings, testConfig);

      expect(result.imported).toBe(1);
      expect(result.failed).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // importTransactions
  // ---------------------------------------------------------------------------

  describe('importTransactions', () => {
    it('should throw when required columns not found', async () => {
      const data: ParsedCSVData = {
        headers: ['Name', 'Value'],
        rows: [['John', '100']],
        totalRows: 1,
      };

      await expect(
        importTransactions(data, 'MemberID', 'Date', 'Amount')
      ).rejects.toThrow('Required columns not found');
    });

    it('should successfully import a transaction', async () => {
      const data: ParsedCSVData = {
        headers: ['MemberID', 'Date', 'Amount', 'Type'],
        rows: [['550e8400-e29b-41d4-a716-446655440000', '2024-06-15', '99.99', 'purchase']],
        totalRows: 1,
      };

      // Insert succeeds
      resolvableChain({ data: null, error: null });

      const result = await importTransactions(
        data,
        'MemberID',
        'Date',
        'Amount',
        'Type',
        'site-1'
      );

      expect(result.imported).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockFrom).toHaveBeenCalledWith('member_transactions');
      expect(mockQueryChain.insert).toHaveBeenCalled();
    });

    it('should look up member by external_id for non-UUID IDs', async () => {
      const data: ParsedCSVData = {
        headers: ['MemberID', 'Date', 'Amount'],
        rows: [['EXT-12345', '2024-06-15', '50']],
        totalRows: 1,
      };

      // Lookup returns a member
      mockSingle.mockResolvedValueOnce({
        data: { id: '550e8400-e29b-41d4-a716-446655440000' },
        error: null,
      });
      // Insert succeeds
      resolvableChain({ data: null, error: null });

      const result = await importTransactions(data, 'MemberID', 'Date', 'Amount');

      expect(result.imported).toBe(1);
      expect(mockFrom).toHaveBeenCalledWith('members');
      expect(mockQueryChain.eq).toHaveBeenCalledWith('external_id', 'EXT-12345');
    });

    it('should handle missing required fields in row', async () => {
      const data: ParsedCSVData = {
        headers: ['MemberID', 'Date', 'Amount'],
        rows: [['', '2024-06-15', '50']],
        totalRows: 1,
      };

      const result = await importTransactions(data, 'MemberID', 'Date', 'Amount');

      expect(result.failed).toBe(1);
      expect(result.errors[0].message).toBe('Missing required fields');
    });

    it('should record errors when member not found by external_id', async () => {
      const data: ParsedCSVData = {
        headers: ['MemberID', 'Date', 'Amount'],
        rows: [['NONEXISTENT', '2024-06-15', '50']],
        totalRows: 1,
      };

      // Member lookup returns null
      mockSingle.mockResolvedValueOnce({ data: null, error: null });

      const result = await importTransactions(data, 'MemberID', 'Date', 'Amount');

      expect(result.failed).toBe(1);
      expect(result.errors[0].message).toContain('Member not found');
      expect(result.errors[0].message).toContain('NONEXISTENT');
    });
  });

  // ---------------------------------------------------------------------------
  // importVisits
  // ---------------------------------------------------------------------------

  describe('importVisits', () => {
    it('should throw when required columns not found', async () => {
      const data: ParsedCSVData = {
        headers: ['Name', 'Value'],
        rows: [['John', '100']],
        totalRows: 1,
      };

      await expect(
        importVisits(data, 'MemberID', 'Date', 'site-1')
      ).rejects.toThrow('Required columns not found');
    });

    it('should successfully import a visit with time', async () => {
      const data: ParsedCSVData = {
        headers: ['MemberID', 'Date', 'Time', 'Type'],
        rows: [['550e8400-e29b-41d4-a716-446655440000', '2024-06-15', '09:30', 'class']],
        totalRows: 1,
      };

      // Insert succeeds
      resolvableChain({ data: null, error: null });

      const result = await importVisits(
        data,
        'MemberID',
        'Date',
        'site-1',
        'Time',
        'Type'
      );

      expect(result.imported).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockFrom).toHaveBeenCalledWith('member_visits');
      expect(mockQueryChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          site_id: 'site-1',
          visit_type: 'class',
        })
      );
    });

    it('should handle non-UUID member ID lookup', async () => {
      const data: ParsedCSVData = {
        headers: ['MemberID', 'Date'],
        rows: [['EXT-99', '2024-06-15']],
        totalRows: 1,
      };

      // Lookup returns a member
      mockSingle.mockResolvedValueOnce({
        data: { id: '550e8400-e29b-41d4-a716-446655440000' },
        error: null,
      });
      // Insert succeeds
      resolvableChain({ data: null, error: null });

      const result = await importVisits(data, 'MemberID', 'Date', 'site-1');

      expect(result.imported).toBe(1);
      expect(mockFrom).toHaveBeenCalledWith('members');
      expect(mockQueryChain.eq).toHaveBeenCalledWith('external_id', 'EXT-99');
    });

    it('should record import errors for member not found', async () => {
      const data: ParsedCSVData = {
        headers: ['MemberID', 'Date'],
        rows: [['MISSING-MEMBER', '2024-06-15']],
        totalRows: 1,
      };

      // Member lookup returns null
      mockSingle.mockResolvedValueOnce({ data: null, error: null });

      const result = await importVisits(data, 'MemberID', 'Date', 'site-1');

      expect(result.failed).toBe(1);
      expect(result.errors[0].message).toContain('Member not found');
      expect(result.errors[0].message).toContain('MISSING-MEMBER');
    });
  });
});
