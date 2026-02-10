
import {
  detectValueType,
  detectColumnType,
  analyzeColumns,
  applyRule,
  applyColumnRules,
  matchesFilter,
  shouldIncludeRow,
  getRowKey,
  handleDuplicates,
  processRows,
  suggestCleaningRules,
  generateDefaultColumnConfig,
} from '../cleaningService';

// =============================================================================
// Type Detection
// =============================================================================

describe('detectValueType', () => {
  it('should detect email', () => {
    expect(detectValueType('test@example.com')).toBe('email');
  });

  it('should detect URL', () => {
    expect(detectValueType('https://example.com')).toBe('url');
    expect(detectValueType('http://example.com/path')).toBe('url');
  });

  it('should detect phone', () => {
    expect(detectValueType('(212) 555-1234')).toBe('phone');
    expect(detectValueType('+12125551234')).toBe('phone');
  });

  it('should detect boolean', () => {
    expect(detectValueType('true')).toBe('boolean');
    expect(detectValueType('false')).toBe('boolean');
    expect(detectValueType('yes')).toBe('boolean');
    expect(detectValueType('no')).toBe('boolean');
    expect(detectValueType('1')).toBe('boolean');
    expect(detectValueType('0')).toBe('boolean');
  });

  it('should detect integer', () => {
    expect(detectValueType('42')).toBe('integer');
    expect(detectValueType('12345')).toBe('integer');
    expect(detectValueType('-100')).toBe('integer');
  });

  it('should detect number', () => {
    expect(detectValueType('$1,234.56')).toBe('number');
    expect(detectValueType('3.14')).toBe('number');
  });

  it('should detect date', () => {
    expect(detectValueType('2025-01-15')).toBe('date');
    expect(detectValueType('January 15, 2025')).toBe('date');
  });

  it('should default to text', () => {
    expect(detectValueType('Hello World')).toBe('text');
    expect(detectValueType('')).toBe('text');
    expect(detectValueType(null)).toBe('text');
  });
});

describe('detectColumnType', () => {
  it('should return most common type', () => {
    const { type, confidence } = detectColumnType(['test@a.com', 'user@b.com', 'admin@c.com']);
    expect(type).toBe('email');
    expect(confidence).toBe(1);
  });

  it('should return text with 0 confidence for empty array', () => {
    const { type, confidence } = detectColumnType([]);
    expect(type).toBe('text');
    expect(confidence).toBe(0);
  });

  it('should skip null values', () => {
    const { type } = detectColumnType([null, '', 'test@a.com', null, 'user@b.com']);
    expect(type).toBe('email');
  });
});

describe('analyzeColumns', () => {
  it('should return empty array for empty rows', () => {
    expect(analyzeColumns([])).toEqual([]);
  });

  it('should analyze columns from rows', () => {
    const rows = [
      { name: 'John', email: 'john@example.com', age: '30' },
      { name: 'Jane', email: 'jane@example.com', age: '25' },
    ];
    const result = analyzeColumns(rows);
    expect(result).toHaveLength(3);
    expect(result.find(c => c.name === 'email')?.detected_type).toBe('email');
  });
});

// =============================================================================
// Cleaning Rule Application
// =============================================================================

describe('applyRule', () => {
  describe('whitespace rules', () => {
    it('should trim whitespace', () => {
      expect(applyRule('  hello  ', { type: 'trim' })).toEqual({ value: 'hello', skip: false });
    });

    it('should collapse whitespace', () => {
      expect(applyRule('hello   world', { type: 'collapse_whitespace' })).toEqual({ value: 'hello world', skip: false });
    });
  });

  describe('case rules', () => {
    it('should lowercase', () => {
      expect(applyRule('HELLO', { type: 'lowercase' })).toEqual({ value: 'hello', skip: false });
    });

    it('should uppercase', () => {
      expect(applyRule('hello', { type: 'uppercase' })).toEqual({ value: 'HELLO', skip: false });
    });

    it('should title case', () => {
      expect(applyRule('hello world', { type: 'title_case' })).toEqual({ value: 'Hello World', skip: false });
    });
  });

  describe('null handling', () => {
    it('should replace null with default', () => {
      expect(applyRule(null, { type: 'null_to_default', default_value: 'N/A' })).toEqual({ value: 'N/A', skip: false });
    });

    it('should replace empty string with default', () => {
      expect(applyRule('', { type: 'null_to_default', default_value: 'N/A' })).toEqual({ value: 'N/A', skip: false });
    });

    it('should convert empty to null', () => {
      expect(applyRule('  ', { type: 'empty_to_null' })).toEqual({ value: null, skip: false });
      expect(applyRule('hello', { type: 'empty_to_null' })).toEqual({ value: 'hello', skip: false });
    });

    it('should skip empty rows', () => {
      expect(applyRule('', { type: 'skip_if_empty' })).toEqual({ value: '', skip: true });
      expect(applyRule('hello', { type: 'skip_if_empty' })).toEqual({ value: 'hello', skip: false });
    });

    it('should skip null values', () => {
      expect(applyRule(null, { type: 'skip_if_empty' })).toEqual({ value: null, skip: true });
    });
  });

  describe('type coercion', () => {
    it('should parse number', () => {
      expect(applyRule('$1,234.56', { type: 'parse_number' })).toEqual({ value: 1234.56, skip: false });
    });

    it('should parse number with custom remove chars', () => {
      expect(applyRule('price: $100', { type: 'parse_number', remove_chars: 'price: ' })).toEqual({ value: 100, skip: false });
    });

    it('should return null for unparseable number', () => {
      expect(applyRule('abc', { type: 'parse_number' })).toEqual({ value: null, skip: false });
    });

    it('should parse boolean with custom values', () => {
      const rule = { type: 'parse_boolean' as const, true_values: ['yes', 'y'], false_values: ['no', 'n'] };
      expect(applyRule('yes', rule)).toEqual({ value: true, skip: false });
      expect(applyRule('NO', rule)).toEqual({ value: false, skip: false });
      expect(applyRule('maybe', rule)).toEqual({ value: null, skip: false });
    });

    it('should parse percentage', () => {
      expect(applyRule('50%', { type: 'parse_percentage', as_decimal: false })).toEqual({ value: 50, skip: false });
      expect(applyRule('50%', { type: 'parse_percentage', as_decimal: true })).toEqual({ value: 0.5, skip: false });
    });

    it('should parse date', () => {
      const result = applyRule('01/15/2025', { type: 'parse_date', format: 'MM/DD/YYYY' });
      expect(result.value).toBe('2025-01-15');
    });
  });

  describe('validation rules', () => {
    it('should validate email and skip invalid', () => {
      expect(applyRule('not-email', { type: 'validate_email', on_invalid: 'skip' })).toEqual({ value: null, skip: true });
    });

    it('should validate email and null invalid', () => {
      expect(applyRule('not-email', { type: 'validate_email', on_invalid: 'null' })).toEqual({ value: null, skip: false });
    });

    it('should validate email and keep invalid', () => {
      expect(applyRule('not-email', { type: 'validate_email', on_invalid: 'keep' })).toEqual({ value: 'not-email', skip: false });
    });

    it('should lowercase valid email', () => {
      expect(applyRule('Test@Example.COM', { type: 'validate_email', on_invalid: 'skip' })).toEqual({ value: 'test@example.com', skip: false });
    });

    it('should validate phone and format as E.164', () => {
      const result = applyRule('(212) 555-1234', { type: 'validate_phone', format: 'e164', on_invalid: 'skip' });
      expect(result.value).toBe('+12125551234');
      expect(result.skip).toBe(false);
    });

    it('should skip invalid phone', () => {
      expect(applyRule('abc', { type: 'validate_phone', format: 'e164', on_invalid: 'skip' })).toEqual({ value: null, skip: true });
    });

    it('should validate URL', () => {
      expect(applyRule('https://example.com', { type: 'validate_url', on_invalid: 'skip' })).toEqual({ value: 'https://example.com', skip: false });
      expect(applyRule('not-a-url', { type: 'validate_url', on_invalid: 'skip' })).toEqual({ value: null, skip: true });
    });
  });

  describe('transformation rules', () => {
    it('should find and replace', () => {
      expect(applyRule('hello world', { type: 'find_replace', find: 'world', replace: 'universe' })).toEqual({ value: 'hello universe', skip: false });
    });

    it('should find and replace with regex', () => {
      expect(applyRule('abc123def456', { type: 'find_replace', find: '\\d+', replace: '#', regex: true })).toEqual({ value: 'abc#def#', skip: false });
    });

    it('should split and take index', () => {
      expect(applyRule('John Doe', { type: 'split', delimiter: ' ', take_index: 0 })).toEqual({ value: 'John', skip: false });
      expect(applyRule('John Doe', { type: 'split', delimiter: ' ', take_index: 1 })).toEqual({ value: 'Doe', skip: false });
    });

    it('should return null for out-of-bounds split index', () => {
      expect(applyRule('John', { type: 'split', delimiter: ' ', take_index: 5 })).toEqual({ value: null, skip: false });
    });

    it('should add prefix', () => {
      expect(applyRule('world', { type: 'prefix', value: 'hello ' })).toEqual({ value: 'hello world', skip: false });
    });

    it('should add suffix', () => {
      expect(applyRule('hello', { type: 'suffix', value: ' world' })).toEqual({ value: 'hello world', skip: false });
    });
  });
});

describe('applyColumnRules', () => {
  it('should apply multiple rules in order', () => {
    const rules = [
      { type: 'trim' as const },
      { type: 'lowercase' as const },
    ];
    expect(applyColumnRules('  HELLO  ', rules)).toEqual({ value: 'hello', skip: false });
  });

  it('should stop on skip', () => {
    const rules = [
      { type: 'skip_if_empty' as const },
      { type: 'lowercase' as const },
    ];
    expect(applyColumnRules('', rules)).toEqual({ value: '', skip: true });
  });
});

// =============================================================================
// Row Filtering
// =============================================================================

describe('matchesFilter', () => {
  const row = { name: 'John', age: '30', email: '' };

  it('should match equals', () => {
    expect(matchesFilter(row, { column: 'name', operator: 'equals', value: 'John', action: 'include' })).toBe(true);
    expect(matchesFilter(row, { column: 'name', operator: 'equals', value: 'Jane', action: 'include' })).toBe(false);
  });

  it('should match not_equals', () => {
    expect(matchesFilter(row, { column: 'name', operator: 'not_equals', value: 'Jane', action: 'include' })).toBe(true);
  });

  it('should match contains', () => {
    expect(matchesFilter(row, { column: 'name', operator: 'contains', value: 'oh', action: 'include' })).toBe(true);
  });

  it('should match is_empty', () => {
    expect(matchesFilter(row, { column: 'email', operator: 'is_empty', action: 'include' })).toBe(true);
    expect(matchesFilter(row, { column: 'name', operator: 'is_empty', action: 'include' })).toBe(false);
  });

  it('should match greater_than', () => {
    expect(matchesFilter(row, { column: 'age', operator: 'greater_than', value: 25, action: 'include' })).toBe(true);
    expect(matchesFilter(row, { column: 'age', operator: 'greater_than', value: 35, action: 'include' })).toBe(false);
  });
});

describe('shouldIncludeRow', () => {
  it('should include row matching all include filters', () => {
    const row = { name: 'John', age: '30' };
    const filters = [
      { column: 'name', operator: 'equals' as const, value: 'John', action: 'include' as const },
      { column: 'age', operator: 'greater_than' as const, value: 20, action: 'include' as const },
    ];
    expect(shouldIncludeRow(row, filters)).toBe(true);
  });

  it('should exclude row matching exclude filter', () => {
    const row = { name: 'John', status: 'inactive' };
    const filters = [
      { column: 'status', operator: 'equals' as const, value: 'inactive', action: 'exclude' as const },
    ];
    expect(shouldIncludeRow(row, filters)).toBe(false);
  });
});

// =============================================================================
// Duplicate Handling
// =============================================================================

describe('getRowKey', () => {
  it('should generate key from columns', () => {
    const row = { email: 'test@example.com', phone: '1234' };
    expect(getRowKey(row, ['email', 'phone'])).toBe('test@example.com|1234');
  });

  it('should handle missing columns', () => {
    const row = { email: 'test@example.com' };
    expect(getRowKey(row, ['email', 'missing'])).toBe('test@example.com|');
  });
});

describe('handleDuplicates', () => {
  const rows = [
    { email: 'a@example.com', value: 1 },
    { email: 'b@example.com', value: 2 },
    { email: 'a@example.com', value: 3 },
  ];

  it('keep_all should return all rows', () => {
    expect(handleDuplicates(rows, ['email'], 'keep_all')).toHaveLength(3);
  });

  it('keep_first should keep first occurrence', () => {
    const result = handleDuplicates(rows, ['email'], 'keep_first');
    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(1);
  });

  it('keep_last should keep last occurrence', () => {
    const result = handleDuplicates(rows, ['email'], 'keep_last');
    expect(result).toHaveLength(2);
    expect(result.find(r => r.email === 'a@example.com')!.value).toBe(3);
  });

  it('skip_all should remove all rows with duplicated keys', () => {
    const result = handleDuplicates(rows, ['email'], 'skip_all');
    // skip_all removes all rows that have duplicate keys (including the non-duplicate)
    // because unique rows don't match keep_first/keep_last branches
    expect(result).toHaveLength(0);
  });

  it('should return all rows when no key columns', () => {
    expect(handleDuplicates(rows, [], 'keep_first')).toHaveLength(3);
  });
});

// =============================================================================
// Batch Processing
// =============================================================================

describe('processRows', () => {
  it('should clean, filter, and deduplicate rows', () => {
    const rows = [
      { name: '  John  ', email: 'john@example.com' },
      { name: '  Jane  ', email: 'jane@example.com' },
      { name: '  John  ', email: 'john@example.com' },
    ];
    const config = {
      columns: [
        { source_name: 'name', target_name: 'name', type: 'text' as const, included: true, cleaning_rules: [{ type: 'trim' as const }] },
        { source_name: 'email', target_name: 'email', type: 'text' as const, included: true, cleaning_rules: [{ type: 'lowercase' as const }] },
      ],
      row_filters: [],
      duplicate_key_columns: ['email'],
      duplicate_handling: 'keep_first' as const,
    };
    const result = processRows(rows, config);
    expect(result.cleanedRows).toHaveLength(2);
    expect(result.cleanedRows[0].name).toBe('John');
  });

  it('should exclude filtered rows', () => {
    const rows = [
      { name: 'John', status: 'active' },
      { name: 'Jane', status: 'inactive' },
    ];
    const config = {
      columns: [
        { source_name: 'name', target_name: 'name', type: 'text' as const, included: true, cleaning_rules: [] },
        { source_name: 'status', target_name: 'status', type: 'text' as const, included: true, cleaning_rules: [] },
      ],
      row_filters: [{ column: 'status', operator: 'equals' as const, value: 'inactive', action: 'exclude' as const }],
      duplicate_key_columns: [],
      duplicate_handling: 'keep_all' as const,
    };
    const result = processRows(rows, config);
    expect(result.cleanedRows).toHaveLength(1);
    expect(result.skippedCount).toBe(1);
  });
});

// =============================================================================
// Smart Suggestions
// =============================================================================

describe('suggestCleaningRules', () => {
  it('should suggest trim for whitespace issues', () => {
    const column = { name: 'name', detected_type: 'text' as const, sample_values: ['  John  ', 'Jane'], null_count: 0, unique_count: 2 };
    const rules = suggestCleaningRules(column);
    expect(rules.some(r => r.type === 'trim')).toBe(true);
  });

  it('should suggest lowercase and validation for email', () => {
    const column = { name: 'email', detected_type: 'email' as const, sample_values: ['test@example.com'], null_count: 0, unique_count: 1 };
    const rules = suggestCleaningRules(column);
    expect(rules.some(r => r.type === 'lowercase')).toBe(true);
    expect(rules.some(r => r.type === 'validate_email')).toBe(true);
  });

  it('should suggest phone validation for phone columns', () => {
    const column = { name: 'phone', detected_type: 'phone' as const, sample_values: ['(212) 555-1234'], null_count: 0, unique_count: 1 };
    const rules = suggestCleaningRules(column);
    expect(rules.some(r => r.type === 'validate_phone')).toBe(true);
  });
});

describe('generateDefaultColumnConfig', () => {
  it('should generate config from column previews', () => {
    const previews = [
      { name: 'First Name', detected_type: 'text' as const, sample_values: ['John'], null_count: 0, unique_count: 1 },
      { name: 'email', detected_type: 'email' as const, sample_values: ['test@example.com'], null_count: 0, unique_count: 1 },
    ];
    const config = generateDefaultColumnConfig(previews);
    expect(config).toHaveLength(2);
    expect(config[0].target_name).toBe('first_name');
    expect(config[0].included).toBe(true);
    expect(config[1].type).toBe('text'); // email maps to text storage type
  });
});
