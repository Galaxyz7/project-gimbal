/**
 * useInlineEdit - Manages inline editing state (edit mode, value, save, cancel)
 */

import { useState, useCallback } from 'react';

export interface UseInlineEditOptions {
  onSave: (value: string) => Promise<void>;
}

export function useInlineEdit({ onSave }: UseInlineEditOptions) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = useCallback((currentValue: string) => {
    setEditValue(currentValue);
    setError(null);
    setIsEditing(true);
  }, []);

  const cancel = useCallback(() => {
    setIsEditing(false);
    setEditValue('');
    setError(null);
  }, []);

  const save = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await onSave(editValue);
      setIsEditing(false);
      setEditValue('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [editValue, isSaving, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        save();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    },
    [save, cancel]
  );

  return {
    isEditing,
    editValue,
    setEditValue,
    isSaving,
    error,
    startEdit,
    save,
    cancel,
    handleKeyDown,
  };
}

export default useInlineEdit;
