/**
 * useHotkey hook tests
 * Tests keyboard shortcut binding and input element skipping
 */

import { renderHook } from '@testing-library/react';
import { useHotkey } from '../useHotkey';

/**
 * Dispatch a keydown event. By default dispatches on document.body so that
 * e.target has a valid tagName (jsdom's Document node has no tagName).
 * For input-skipping tests, pass the element as `target` – the element must
 * be appended to the DOM first so the event bubbles to the document listener.
 */
function fireKeydown(key: string, opts: Partial<KeyboardEventInit> = {}, target?: HTMLElement) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...opts,
  });
  (target ?? document.body).dispatchEvent(event);
  return event;
}

describe('useHotkey', () => {
  const callback = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call callback when key is pressed', () => {
    renderHook(() => useHotkey('n', callback));
    fireKeydown('n');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should be case-insensitive', () => {
    renderHook(() => useHotkey('n', callback));
    fireKeydown('N');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should not call callback for wrong key', () => {
    renderHook(() => useHotkey('n', callback));
    fireKeydown('m');
    expect(callback).not.toHaveBeenCalled();
  });

  it('should not call callback when disabled', () => {
    renderHook(() => useHotkey('n', callback, { enabled: false }));
    fireKeydown('n');
    expect(callback).not.toHaveBeenCalled();
  });

  describe('modifier keys', () => {
    it('should require ctrl when specified', () => {
      renderHook(() => useHotkey('k', callback, { ctrl: true }));

      fireKeydown('k', { ctrlKey: false });
      expect(callback).not.toHaveBeenCalled();

      fireKeydown('k', { ctrlKey: true });
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should require meta when specified', () => {
      renderHook(() => useHotkey('k', callback, { meta: true }));

      fireKeydown('k', { metaKey: false });
      expect(callback).not.toHaveBeenCalled();

      fireKeydown('k', { metaKey: true });
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should require shift when specified', () => {
      renderHook(() => useHotkey('a', callback, { shift: true }));

      fireKeydown('a', { shiftKey: false });
      expect(callback).not.toHaveBeenCalled();

      fireKeydown('a', { shiftKey: true });
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should reject accidental modifiers when none specified', () => {
      renderHook(() => useHotkey('n', callback));

      fireKeydown('n', { ctrlKey: true });
      expect(callback).not.toHaveBeenCalled();

      fireKeydown('n', { metaKey: true });
      expect(callback).not.toHaveBeenCalled();

      fireKeydown('n', { altKey: true });
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('input element skipping', () => {
    it('should skip when target is an input', () => {
      renderHook(() => useHotkey('n', callback));
      const input = document.createElement('input');
      document.body.appendChild(input);
      fireKeydown('n', {}, input);
      document.body.removeChild(input);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should skip when target is a textarea', () => {
      renderHook(() => useHotkey('n', callback));
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      fireKeydown('n', {}, textarea);
      document.body.removeChild(textarea);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should skip when target is a select', () => {
      renderHook(() => useHotkey('n', callback));
      const select = document.createElement('select');
      document.body.appendChild(select);
      fireKeydown('n', {}, select);
      document.body.removeChild(select);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should skip when target is contentEditable', () => {
      renderHook(() => useHotkey('n', callback));
      const div = document.createElement('div');
      div.contentEditable = 'true';
      // jsdom doesn't compute isContentEditable from contentEditable attribute
      Object.defineProperty(div, 'isContentEditable', { value: true });
      document.body.appendChild(div);
      fireKeydown('n', {}, div);
      document.body.removeChild(div);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  it('should cleanup event listener on unmount', () => {
    const { unmount } = renderHook(() => useHotkey('n', callback));
    unmount();
    fireKeydown('n');
    expect(callback).not.toHaveBeenCalled();
  });
});
