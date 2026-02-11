/**
 * ColumnToggle - Dropdown with checkbox list for toggling column visibility.
 */

import { useState, useRef, useEffect } from 'react';
import { Button } from './Button';

// =============================================================================
// Types
// =============================================================================

export interface ColumnToggleProps {
  columns: Array<{ id: string; label: string }>;
  visibleColumns: string[];
  onToggle: (columnId: string) => void;
  onReset: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function ColumnToggle({ columns, visibleColumns, onToggle, onReset }: ColumnToggleProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Toggle columns"
      >
        <svg className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
        </svg>
        Columns
      </Button>

      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-white border border-[#e0e0e0] rounded-lg shadow-lg z-20 py-1">
          {columns.map((col) => (
            <label
              key={col.id}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#003559] hover:bg-[#f5f5f5] cursor-pointer"
            >
              <input
                type="checkbox"
                checked={visibleColumns.includes(col.id)}
                onChange={() => onToggle(col.id)}
                className="rounded border-[#e0e0e0] text-[#0353a4] focus:ring-[#0353a4]"
              />
              {col.label}
            </label>
          ))}
          <div className="border-t border-[#e0e0e0] mt-1 pt-1 px-3 py-1.5">
            <button
              type="button"
              onClick={onReset}
              className="text-xs text-[#0353a4] hover:underline"
            >
              Reset to defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ColumnToggle;
