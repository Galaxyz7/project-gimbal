/**
 * useInlineEdit hook tests
 * Tests state transitions, save, cancel, and keyboard handlers
 */

import { renderHook, act } from '@testing-library/react';
import { useInlineEdit } from '../useInlineEdit';

describe('useInlineEdit', () => {
  const mockOnSave = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start in non-editing state', () => {
    const { result } = renderHook(() => useInlineEdit({ onSave: mockOnSave }));
    expect(result.current.isEditing).toBe(false);
    expect(result.current.editValue).toBe('');
    expect(result.current.isSaving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  describe('startEdit', () => {
    it('should enter editing state with current value', () => {
      const { result } = renderHook(() => useInlineEdit({ onSave: mockOnSave }));

      act(() => {
        result.current.startEdit('Hello World');
      });

      expect(result.current.isEditing).toBe(true);
      expect(result.current.editValue).toBe('Hello World');
    });

    it('should clear previous error on new edit', async () => {
      const failSave = vi.fn().mockRejectedValue(new Error('fail'));
      const { result } = renderHook(() => useInlineEdit({ onSave: failSave }));

      // Trigger an error via failed save
      act(() => {
        result.current.startEdit('test');
      });

      await act(async () => {
        await result.current.save();
      });

      expect(result.current.error).toBe('fail');

      // Starting a new edit should clear the error
      act(() => {
        result.current.startEdit('new value');
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('cancel', () => {
    it('should exit editing state', () => {
      const { result } = renderHook(() => useInlineEdit({ onSave: mockOnSave }));

      act(() => {
        result.current.startEdit('Hello');
      });
      expect(result.current.isEditing).toBe(true);

      act(() => {
        result.current.cancel();
      });

      expect(result.current.isEditing).toBe(false);
      expect(result.current.editValue).toBe('');
      expect(result.current.error).toBeNull();
    });
  });

  describe('save', () => {
    it('should call onSave with current edit value', async () => {
      const { result } = renderHook(() => useInlineEdit({ onSave: mockOnSave }));

      act(() => {
        result.current.startEdit('Updated Name');
      });

      await act(async () => {
        await result.current.save();
      });

      expect(mockOnSave).toHaveBeenCalledWith('Updated Name');
    });

    it('should exit editing state on success', async () => {
      const { result } = renderHook(() => useInlineEdit({ onSave: mockOnSave }));

      act(() => {
        result.current.startEdit('value');
      });

      await act(async () => {
        await result.current.save();
      });

      expect(result.current.isEditing).toBe(false);
      expect(result.current.editValue).toBe('');
    });

    it('should set error on failure', async () => {
      const failSave = vi.fn().mockRejectedValue(new Error('Network error'));
      const { result } = renderHook(() => useInlineEdit({ onSave: failSave }));

      act(() => {
        result.current.startEdit('value');
      });

      await act(async () => {
        await result.current.save();
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.isEditing).toBe(true);
    });

    it('should set generic error for non-Error failures', async () => {
      const failSave = vi.fn().mockRejectedValue('string error');
      const { result } = renderHook(() => useInlineEdit({ onSave: failSave }));

      act(() => {
        result.current.startEdit('value');
      });

      await act(async () => {
        await result.current.save();
      });

      expect(result.current.error).toBe('Save failed');
    });

    it('should set and clear isSaving during save', async () => {
      let resolveSave: () => void;
      const slowSave = vi.fn(() => new Promise<void>((resolve) => { resolveSave = resolve; }));
      const { result } = renderHook(() => useInlineEdit({ onSave: slowSave }));

      act(() => {
        result.current.startEdit('value');
      });

      // Start save but don't await
      let savePromise: Promise<void>;
      act(() => {
        savePromise = result.current.save();
      });

      expect(result.current.isSaving).toBe(true);

      await act(async () => {
        resolveSave!();
        await savePromise!;
      });

      expect(result.current.isSaving).toBe(false);
    });

    it('should not save if already saving', async () => {
      let resolveSave: () => void;
      const slowSave = vi.fn(() => new Promise<void>((resolve) => { resolveSave = resolve; }));
      const { result } = renderHook(() => useInlineEdit({ onSave: slowSave }));

      act(() => {
        result.current.startEdit('value');
      });

      // Start first save
      let firstSave: Promise<void>;
      act(() => {
        firstSave = result.current.save();
      });

      // Try second save while first is in progress
      act(() => {
        result.current.save();
      });

      expect(slowSave).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveSave!();
        await firstSave!;
      });
    });
  });

  describe('setEditValue', () => {
    it('should update the edit value', () => {
      const { result } = renderHook(() => useInlineEdit({ onSave: mockOnSave }));

      act(() => {
        result.current.startEdit('initial');
      });

      act(() => {
        result.current.setEditValue('updated');
      });

      expect(result.current.editValue).toBe('updated');
    });
  });

  describe('handleKeyDown', () => {
    it('should call save on Enter', async () => {
      const { result } = renderHook(() => useInlineEdit({ onSave: mockOnSave }));

      act(() => {
        result.current.startEdit('value');
      });

      await act(async () => {
        result.current.handleKeyDown({
          key: 'Enter',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(mockOnSave).toHaveBeenCalledWith('value');
    });

    it('should call cancel on Escape', () => {
      const { result } = renderHook(() => useInlineEdit({ onSave: mockOnSave }));

      act(() => {
        result.current.startEdit('value');
      });

      act(() => {
        result.current.handleKeyDown({
          key: 'Escape',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.isEditing).toBe(false);
    });

    it('should not react to other keys', () => {
      const { result } = renderHook(() => useInlineEdit({ onSave: mockOnSave }));

      act(() => {
        result.current.startEdit('value');
      });

      act(() => {
        result.current.handleKeyDown({
          key: 'a',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.isEditing).toBe(true);
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });
});
