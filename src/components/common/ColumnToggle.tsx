/**
 * ColumnToggle - Dropdown with checkbox list for toggling column visibility.
 * Supports keyboard navigation (Arrow keys, Enter/Space, Escape).
 */

import { useState, useRef, useEffect, useCallback } from 'react';
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
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLLabelElement | null)[]>([]);

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

  // Focus the active item
  useEffect(() => {
    if (open && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex]?.focus();
    }
  }, [open, focusedIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % columns.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + columns.length) % columns.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (columns[focusedIndex]) {
          onToggle(columns[focusedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
    }
  }, [columns, focusedIndex, onToggle]);

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen((prev) => {
            if (!prev) setFocusedIndex(0);
            return !prev;
          });
        }}
        aria-label="Toggle columns"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <svg className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
        </svg>
        Columns
      </Button>

      {open && (
        <div
          className="absolute right-0 mt-1 w-48 bg-white border border-[#e0e0e0] rounded-lg shadow-lg z-20 py-1"
          role="menu"
          onKeyDown={handleKeyDown}
        >
          {columns.map((col, index) => (
            <label
              key={col.id}
              ref={(el) => { itemRefs.current[index] = el; }}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm text-[#003559] cursor-pointer ${
                index === focusedIndex ? 'bg-[#f5f5f5]' : 'hover:bg-[#f5f5f5]'
              }`}
              role="menuitemcheckbox"
              aria-checked={visibleColumns.includes(col.id)}
              tabIndex={index === focusedIndex ? 0 : -1}
              onMouseEnter={() => setFocusedIndex(index)}
            >
              <input
                type="checkbox"
                checked={visibleColumns.includes(col.id)}
                onChange={() => onToggle(col.id)}
                className="rounded border-[#e0e0e0] text-[#0353a4] focus:ring-[#0353a4]"
                tabIndex={-1}
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
