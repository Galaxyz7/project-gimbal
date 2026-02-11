/**
 * csvExport utility tests
 * Tests CSV string generation, escaping, and download
 */

import { toCsvString, downloadCsv } from '../csvExport';
import type { CsvColumn } from '../csvExport';

// =============================================================================
// Fixtures
// =============================================================================

interface TestRow {
  name: string;
  age: number;
  email: string;
  notes: string;
}

const columns: CsvColumn<TestRow>[] = [
  { key: 'name', header: 'Name' },
  { key: 'age', header: 'Age' },
  { key: 'email', header: 'Email' },
];

const sampleData: TestRow[] = [
  { name: 'John Doe', age: 30, email: 'john@example.com', notes: '' },
  { name: 'Jane Smith', age: 25, email: 'jane@example.com', notes: '' },
];

// =============================================================================
// Tests
// =============================================================================

describe('toCsvString', () => {
  it('should generate CSV with headers and rows', () => {
    const result = toCsvString(sampleData, columns);
    const lines = result.split('\n');

    expect(lines[0]).toBe('Name,Age,Email');
    expect(lines[1]).toBe('John Doe,30,john@example.com');
    expect(lines[2]).toBe('Jane Smith,25,jane@example.com');
  });

  it('should handle empty data array', () => {
    const result = toCsvString([], columns);
    expect(result).toBe('Name,Age,Email');
  });

  it('should escape fields containing commas', () => {
    const data = [{ name: 'Doe, John', age: 30, email: 'j@e.com', notes: '' }];
    const result = toCsvString(data, columns);
    const lines = result.split('\n');
    expect(lines[1]).toContain('"Doe, John"');
  });

  it('should escape fields containing double quotes', () => {
    const data = [{ name: 'John "JD" Doe', age: 30, email: 'j@e.com', notes: '' }];
    const result = toCsvString(data, columns);
    const lines = result.split('\n');
    expect(lines[1]).toContain('"John ""JD"" Doe"');
  });

  it('should escape fields containing newlines', () => {
    const data = [{ name: 'John\nDoe', age: 30, email: 'j@e.com', notes: '' }];
    const result = toCsvString(data, columns);
    const lines = result.split('\n');
    // The first data line should start with a quoted field
    expect(result).toContain('"John\nDoe"');
  });

  it('should handle null/undefined values', () => {
    const data = [{ name: null, age: undefined, email: 'j@e.com', notes: '' }] as unknown as TestRow[];
    const result = toCsvString(data, columns);
    const lines = result.split('\n');
    // null/undefined should become empty strings
    expect(lines[1]).toBe(',,j@e.com');
  });

  it('should apply custom format function', () => {
    const columnsWithFormat: CsvColumn<TestRow>[] = [
      { key: 'name', header: 'Name' },
      {
        key: 'age',
        header: 'Age',
        format: (value) => `${value} years`,
      },
    ];

    const result = toCsvString(sampleData, columnsWithFormat);
    const lines = result.split('\n');
    expect(lines[1]).toContain('30 years');
  });

  it('should escape headers containing special characters', () => {
    const specialCols: CsvColumn<TestRow>[] = [
      { key: 'name', header: 'Full Name, First Last' },
    ];
    const result = toCsvString(sampleData, specialCols);
    expect(result).toMatch(/^"Full Name, First Last"/);
  });
});

describe('downloadCsv', () => {
  let createElementSpy: ReturnType<typeof vi.spyOn>;
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let mockLink: { href: string; download: string; style: Record<string, string>; click: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockLink = {
      href: '',
      download: '',
      style: { display: '' },
      click: vi.fn(),
    };

    createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLElement);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as unknown as HTMLAnchorElement);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as unknown as HTMLAnchorElement);
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create and click a download link', () => {
    downloadCsv(sampleData, columns, 'export.csv');

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(mockLink.href).toBe('blob:test-url');
    expect(mockLink.download).toBe('export.csv');
    expect(mockLink.click).toHaveBeenCalled();
  });

  it('should append .csv extension if missing', () => {
    downloadCsv(sampleData, columns, 'export');
    expect(mockLink.download).toBe('export.csv');
  });

  it('should not double .csv extension', () => {
    downloadCsv(sampleData, columns, 'data.csv');
    expect(mockLink.download).toBe('data.csv');
  });

  it('should cleanup after download', () => {
    downloadCsv(sampleData, columns, 'test.csv');
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test-url');
  });

  it('should create blob with correct MIME type', () => {
    downloadCsv(sampleData, columns, 'test.csv');
    expect(createObjectURLSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'text/csv;charset=utf-8;' })
    );
  });
});
