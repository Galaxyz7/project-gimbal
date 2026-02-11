/**
 * InlineEdit - Click-to-edit component for table cells.
 *
 * Display mode: text with subtle hover underline.
 * Edit mode: Input inline. Save on Enter/blur, cancel on Escape.
 */

import { useRef, useEffect } from 'react';
import { useInlineEdit } from '@/hooks/useInlineEdit';

// =============================================================================
// Types
// =============================================================================

export interface InlineEditProps {
  /** Current display value */
  value: string;
  /** Called with new value on save */
  onSave: (value: string) => Promise<void>;
  /** Input type */
  type?: 'text' | 'select';
  /** Options for select type */
  options?: Array<{ value: string; label: string }>;
  /** Disable editing */
  disabled?: boolean;
  /** Additional class for the display text */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function InlineEdit({
  value,
  onSave,
  type = 'text',
  options,
  disabled = false,
  className = '',
}: InlineEditProps) {
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const { isEditing, editValue, setEditValue, isSaving, error, startEdit, cancel, handleKeyDown } =
    useInlineEdit({ onSave });

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  if (disabled) {
    return <span className={className}>{value || '\u2014'}</span>;
  }

  if (isEditing) {
    if (type === 'select' && options) {
      return (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value);
            // Auto-save on select change
            onSave(e.target.value).then(() => cancel());
          }}
          onBlur={cancel}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          disabled={isSaving}
          className="text-sm border border-[#0353a4] rounded px-1.5 py-0.5 bg-white text-[#003559] focus:outline-none focus:ring-1 focus:ring-[#0353a4]"
          aria-label="Edit value"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <div>
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={cancel}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          disabled={isSaving}
          className="text-sm border border-[#0353a4] rounded px-1.5 py-0.5 w-full bg-white text-[#003559] focus:outline-none focus:ring-1 focus:ring-[#0353a4]"
          aria-label="Edit value"
        />
        {error && <span className="text-xs text-[#d32f2f] mt-0.5 block">{error}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        startEdit(value);
      }}
      className={`text-left hover:underline hover:decoration-dotted hover:decoration-[#0353a4] cursor-text ${className}`}
      title="Click to edit"
    >
      {value || '\u2014'}
      {isSaving && (
        <span className="ml-1 inline-block w-3 h-3 border-2 border-[#0353a4] border-t-transparent rounded-full animate-spin" />
      )}
      {error && !isEditing && <span className="text-xs text-[#d32f2f] ml-1">{error}</span>}
    </button>
  );
}

export default InlineEdit;
