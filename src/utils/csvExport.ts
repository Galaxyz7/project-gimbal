/**
 * CSV Export Utility
 * Generic helper for exporting data as downloadable CSV files
 */

// =============================================================================
// Types
// =============================================================================

export interface CsvColumn<T> {
  key: keyof T | string;
  header: string;
  format?: (value: unknown, row: T) => string;
}

// =============================================================================
// Export Functions
// =============================================================================

/**
 * Convert an array of objects to a CSV string.
 */
export function toCsvString<T extends Record<string, unknown>>(
  data: T[],
  columns: CsvColumn<T>[],
): string {
  const header = columns.map((col) => escapeCsvField(col.header)).join(',');

  const rows = data.map((row) =>
    columns
      .map((col) => {
        const raw = col.format
          ? col.format(row[col.key as keyof T], row)
          : row[col.key as keyof T];
        return escapeCsvField(String(raw ?? ''));
      })
      .join(','),
  );

  return [header, ...rows].join('\n');
}

/**
 * Download data as a CSV file.
 */
export function downloadCsv<T extends Record<string, unknown>>(
  data: T[],
  columns: CsvColumn<T>[],
  filename: string,
): void {
  const csv = toCsvString(data, columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// =============================================================================
// Helpers
// =============================================================================

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
