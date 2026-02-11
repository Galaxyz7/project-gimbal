/**
 * Dropdown Menu
 * Accessible dropdown with keyboard navigation and ARIA attributes
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface DropdownItem {
  /** Unique key */
  key: string;
  /** Display label */
  label: string;
  /** Optional icon */
  icon?: ReactNode;
  /** Click handler */
  onClick: () => void;
  /** Whether item is disabled */
  disabled?: boolean;
  /** Danger style (red text) */
  danger?: boolean;
}

export interface DropdownDivider {
  key: string;
  divider: true;
}

export type DropdownEntry = DropdownItem | DropdownDivider;

export interface DropdownProps {
  /** Trigger element — rendered as the button that opens the menu */
  trigger: ReactNode;
  /** Menu items */
  items: DropdownEntry[];
  /** Alignment of dropdown relative to trigger */
  align?: 'left' | 'right';
  /** Additional class names for the wrapper */
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function isDivider(entry: DropdownEntry): entry is DropdownDivider {
  return 'divider' in entry && entry.divider === true;
}

// =============================================================================
// Component
// =============================================================================

export function Dropdown({
  trigger,
  items,
  align = 'right',
  className = '',
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const actionableItems = items
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => !isDivider(item) && !(item as DropdownItem).disabled);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Reset focus index when menu opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  const handleTriggerClick = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsOpen(true);
          setFocusedIndex(actionableItems.length > 0 ? actionableItems[0].idx : -1);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const currentPos = actionableItems.findIndex(({ idx }) => idx === focusedIndex);
          const nextPos = currentPos < actionableItems.length - 1 ? currentPos + 1 : 0;
          setFocusedIndex(actionableItems[nextPos].idx);
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const currentPos = actionableItems.findIndex(({ idx }) => idx === focusedIndex);
          const prevPos = currentPos > 0 ? currentPos - 1 : actionableItems.length - 1;
          setFocusedIndex(actionableItems[prevPos].idx);
          break;
        }
        case 'Enter':
        case ' ': {
          e.preventDefault();
          if (focusedIndex >= 0) {
            const entry = items[focusedIndex];
            if (!isDivider(entry) && !entry.disabled) {
              entry.onClick();
              setIsOpen(false);
            }
          }
          break;
        }
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
        case 'Tab':
          setIsOpen(false);
          break;
      }
    },
    [isOpen, focusedIndex, items, actionableItems]
  );

  const handleItemClick = useCallback(
    (entry: DropdownItem) => {
      if (entry.disabled) return;
      entry.onClick();
      setIsOpen(false);
    },
    []
  );

  return (
    <div ref={wrapperRef} className={`relative inline-block ${className}`}>
      {/* Trigger */}
      <div
        onClick={handleTriggerClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {trigger}
      </div>

      {/* Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          className={[
            'absolute top-full mt-1 z-50 min-w-[180px]',
            'bg-white rounded-lg border border-[#e0e0e0] shadow-lg py-1',
            align === 'right' ? 'right-0' : 'left-0',
          ].join(' ')}
        >
          {items.map((entry, index) => {
            if (isDivider(entry)) {
              return (
                <div
                  key={entry.key}
                  className="my-1 border-t border-[#e0e0e0]"
                  role="separator"
                />
              );
            }

            const isFocused = index === focusedIndex;

            return (
              <button
                key={entry.key}
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={entry.disabled}
                onClick={() => handleItemClick(entry)}
                onMouseEnter={() => setFocusedIndex(index)}
                className={[
                  'w-full flex items-center gap-2 px-4 py-2 text-sm text-left',
                  'transition-colors',
                  entry.disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : isFocused
                      ? 'bg-[#b9d6f2]/30'
                      : 'hover:bg-[#b9d6f2]/30',
                  entry.danger && !entry.disabled
                    ? 'text-[#d32f2f]'
                    : 'text-[#003559]',
                ].join(' ')}
              >
                {entry.icon && (
                  <span className="shrink-0 w-4 h-4">{entry.icon}</span>
                )}
                <span className="truncate">{entry.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Dropdown;
