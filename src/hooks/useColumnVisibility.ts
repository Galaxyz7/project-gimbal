/**
 * useColumnVisibility - Manages visible columns with localStorage persistence.
 */

import { useState, useCallback } from 'react';

const STORAGE_KEY = 'gimbal-member-columns';

export interface ColumnDef {
  id: string;
  label: string;
  defaultVisible: boolean;
}

export function useColumnVisibility(columns: ColumnDef[]) {
  const defaultVisible = columns.filter((c) => c.defaultVisible).map((c) => c.id);

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        // Validate stored IDs still exist
        const validIds = new Set(columns.map((c) => c.id));
        const filtered = parsed.filter((id) => validIds.has(id));
        return filtered.length > 0 ? filtered : defaultVisible;
      }
    } catch {
      // ignore
    }
    return defaultVisible;
  });

  const toggleColumn = useCallback(
    (columnId: string) => {
      setVisibleColumns((prev) => {
        const next = prev.includes(columnId)
          ? prev.filter((id) => id !== columnId)
          : [...prev, columnId];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const resetToDefaults = useCallback(() => {
    setVisibleColumns(defaultVisible);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultVisible));
  }, [defaultVisible]);

  const isVisible = useCallback(
    (columnId: string) => visibleColumns.includes(columnId),
    [visibleColumns]
  );

  return { visibleColumns, toggleColumn, resetToDefaults, isVisible };
}

export default useColumnVisibility;
