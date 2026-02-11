/**
 * useHotkey - Global keyboard shortcut hook
 * Skips when focus is in input/textarea/select elements
 */

import { useEffect, useCallback } from 'react';

interface HotkeyOptions {
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  enabled?: boolean;
}

export function useHotkey(
  key: string,
  callback: (e: KeyboardEvent) => void,
  options: HotkeyOptions = {}
) {
  const { ctrl, meta, shift, alt, enabled = true } = options;

  const handler = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Skip when focus is in input-like elements
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return;
      if (target.isContentEditable) return;

      // Check modifier keys
      if (ctrl !== undefined && e.ctrlKey !== ctrl) return;
      if (meta !== undefined && e.metaKey !== meta) return;
      if (shift !== undefined && e.shiftKey !== shift) return;
      if (alt !== undefined && e.altKey !== alt) return;

      // Check key (case-insensitive)
      if (e.key.toLowerCase() !== key.toLowerCase()) return;

      // If no modifier was requested, ensure no modifier is pressed
      if (ctrl === undefined && meta === undefined && shift === undefined && alt === undefined) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
      }

      e.preventDefault();
      callback(e);
    },
    [key, callback, ctrl, meta, shift, alt, enabled]
  );

  useEffect(() => {
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handler]);
}

export default useHotkey;
