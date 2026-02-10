import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useToast } from '../useToast';
import { ToastContext } from '../../contexts/ToastContext';

// =============================================================================
// Tests
// =============================================================================

describe('useToast', () => {
  const mockContext = {
    toasts: [],
    addToast: vi.fn(),
    removeToast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    clearAll: vi.fn(),
  };

  function createWrapper() {
    return function Wrapper({ children }: { children: ReactNode }) {
      return (
        <ToastContext.Provider value={mockContext}>
          {children}
        </ToastContext.Provider>
      );
    };
  }

  it('should return toast context when used within provider', () => {
    const { result } = renderHook(() => useToast(), { wrapper: createWrapper() });

    expect(result.current).toBe(mockContext);
    expect(result.current.success).toBeDefined();
    expect(result.current.error).toBeDefined();
    expect(result.current.warning).toBeDefined();
    expect(result.current.info).toBeDefined();
  });

  it('should throw when used outside provider', () => {
    // Suppress console.error from the expected error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useToast());
    }).toThrow('useToast must be used within a ToastProvider');

    consoleSpy.mockRestore();
  });

  it('should expose all context methods', () => {
    const { result } = renderHook(() => useToast(), { wrapper: createWrapper() });

    expect(typeof result.current.addToast).toBe('function');
    expect(typeof result.current.removeToast).toBe('function');
    expect(typeof result.current.clearAll).toBe('function');
  });
});
