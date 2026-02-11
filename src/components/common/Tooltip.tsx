/**
 * Tooltip Component
 * Simple tooltip triggered on hover/focus, positioned above the target element
 */

import { useState, useRef, useCallback, type ReactNode } from 'react';

// =============================================================================
// Types
// =============================================================================

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: TooltipPosition;
  className?: string;
}

// =============================================================================
// Position styles
// =============================================================================

const POSITION_CLASSES: Record<TooltipPosition, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

const ARROW_CLASSES: Record<TooltipPosition, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-[#003559] border-x-transparent border-b-transparent',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[#003559] border-x-transparent border-t-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-[#003559] border-y-transparent border-r-transparent',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-[#003559] border-y-transparent border-l-transparent',
};

// =============================================================================
// Component
// =============================================================================

export function Tooltip({ content, children, position = 'top', className = '' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(true), 200);
  }, []);

  const hide = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  }, []);

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={`absolute z-50 pointer-events-none ${POSITION_CLASSES[position]}`}
        >
          <span className="block px-2.5 py-1.5 text-xs font-medium text-white bg-[#003559] rounded shadow-lg whitespace-nowrap">
            {content}
          </span>
          <span className={`absolute w-0 h-0 border-4 ${ARROW_CLASSES[position]}`} />
        </span>
      )}
    </span>
  );
}

export default Tooltip;
