import { renderHook, waitFor, act } from '@testing-library/react';

// =============================================================================
// Mocks
// =============================================================================

const { mockGetSession, mockOnAuthStateChange, mockSignOut } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signOut: mockSignOut,
    },
  },
}));

vi.mock('../../utils/rememberMe', () => ({
  clearRememberMe: vi.fn(),
}));

vi.mock('../../utils/auditLog', () => ({
  auditLogger: { log: vi.fn() },
  AuditEventType: { SESSION_EXPIRED: 'SESSION_EXPIRED' },
}));

vi.mock('../../constants/app', () => ({
  STORAGE_KEYS: {
    REMEMBER_ME: 'gimbal-remember-me',
    REMEMBER_ME_EXPIRES: 'gimbal-remember-me-expires',
  },
}));

import { useAuth } from '../useAuth';

// =============================================================================
// Helpers
// =============================================================================

const mockUser = { id: 'user-1', email: 'test@example.com' };
const mockSession = { user: mockUser };
const mockUnsubscribe = vi.fn();

function setupMocks() {
  mockGetSession.mockResolvedValue({ data: { session: null } });
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: mockUnsubscribe } },
  });
  mockSignOut.mockResolvedValue({ error: null });
}

// =============================================================================
// Tests
// =============================================================================

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setupMocks();
  });

  it('should start in loading state', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('should set user from existing session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: mockSession } });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
  });

  it('should set user to null when no session exists', async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
  });

  it('should subscribe to auth state changes', () => {
    renderHook(() => useAuth());
    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
  });

  it('should unsubscribe on unmount', () => {
    const { unmount } = renderHook(() => useAuth());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('should update user on auth state change', async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Simulate auth state change
    const callback = mockOnAuthStateChange.mock.calls[0][0];
    act(() => {
      callback('SIGNED_IN', mockSession);
    });

    expect(result.current.user).toEqual(mockUser);
  });

  it('should set user to null on sign out event', async () => {
    mockGetSession.mockResolvedValue({ data: { session: mockSession } });
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    // Simulate sign out
    const callback = mockOnAuthStateChange.mock.calls[0][0];
    act(() => {
      callback('SIGNED_OUT', null);
    });

    expect(result.current.user).toBeNull();
  });

  it('should sign out when remember me has expired', async () => {
    localStorage.setItem('gimbal-remember-me', 'true');
    localStorage.setItem('gimbal-remember-me-expires', String(Date.now() - 1000));
    mockGetSession.mockResolvedValue({ data: { session: mockSession } });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });

  it('should keep session when remember me has not expired', async () => {
    localStorage.setItem('gimbal-remember-me', 'true');
    localStorage.setItem('gimbal-remember-me-expires', String(Date.now() + 60000));
    mockGetSession.mockResolvedValue({ data: { session: mockSession } });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(result.current.user).toEqual(mockUser);
  });

  it('should keep session when remember me is not set', async () => {
    mockGetSession.mockResolvedValue({ data: { session: mockSession } });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(result.current.user).toEqual(mockUser);
  });
});
