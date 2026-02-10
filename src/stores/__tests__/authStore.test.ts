
import { useAuthStore, selectIsAuthenticated, selectIsLoading, useAuth } from '../authStore';
import { renderHook, act } from '@testing-library/react';

// =============================================================================
// Mocks
// =============================================================================

const { mockSignOut, mockGetSession, mockOnAuthStateChange } = vi.hoisted(() => {
  const mockSignOut = vi.fn().mockResolvedValue({ error: null });
  const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null }, error: null });
  const mockOnAuthStateChange = vi.fn().mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
  return { mockSignOut, mockGetSession, mockOnAuthStateChange };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      signOut: mockSignOut,
      onAuthStateChange: mockOnAuthStateChange,
    },
  },
}));

vi.mock('@/utils/rememberMe', () => ({
  clearRememberMe: vi.fn(),
}));

vi.mock('@/utils/auditLog', () => ({
  auditLogger: { log: vi.fn() },
  AuditEventType: {
    LOGIN_SUCCESS: 'login_success',
    LOGIN_FAILED: 'login_failed',
    LOGOUT: 'logout',
    SESSION_EXPIRED: 'session_expired',
    ACCOUNT_LOCKED: 'account_locked',
  },
}));

// =============================================================================
// Tests
// =============================================================================

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the store to initial state
    useAuthStore.setState({
      user: null,
      session: null,
      loading: true,
      initialized: false,
    });
  });

  describe('initial state', () => {
    it('should have null user', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });

    it('should be loading initially', () => {
      const state = useAuthStore.getState();
      expect(state.loading).toBe(true);
    });

    it('should not be initialized', () => {
      const state = useAuthStore.getState();
      expect(state.initialized).toBe(false);
    });
  });

  describe('setUser', () => {
    it('should set the user', () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' } as never;
      act(() => {
        useAuthStore.getState().setUser(mockUser);
      });
      expect(useAuthStore.getState().user).toEqual(mockUser);
    });

    it('should set user to null', () => {
      act(() => {
        useAuthStore.getState().setUser(null);
      });
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('setSession', () => {
    it('should set session and extract user', () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' },
        access_token: 'token',
      } as never;
      act(() => {
        useAuthStore.getState().setSession(mockSession);
      });
      const state = useAuthStore.getState();
      expect(state.session).toEqual(mockSession);
      expect(state.user).toEqual(mockSession.user);
    });

    it('should clear user when session is null', () => {
      act(() => {
        useAuthStore.getState().setSession(null);
      });
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('initialize', () => {
    it('should set loading to false after init', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
      await act(async () => {
        await useAuthStore.getState().initialize();
      });
      const state = useAuthStore.getState();
      expect(state.loading).toBe(false);
      expect(state.initialized).toBe(true);
    });

    it('should not reinitialize if already initialized', async () => {
      useAuthStore.setState({ initialized: true });
      await act(async () => {
        await useAuthStore.getState().initialize();
      });
      expect(mockGetSession).not.toHaveBeenCalled();
    });

    it('should set user from existing session', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockSession = { user: mockUser, access_token: 'token' };
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });
      await act(async () => {
        await useAuthStore.getState().initialize();
      });
      expect(useAuthStore.getState().user).toEqual(mockUser);
    });

    it('should handle initialization error gracefully', async () => {
      mockGetSession.mockRejectedValue(new Error('Network error'));
      await act(async () => {
        await useAuthStore.getState().initialize();
      });
      const state = useAuthStore.getState();
      expect(state.loading).toBe(false);
      expect(state.initialized).toBe(true);
      expect(state.user).toBeNull();
    });
  });

  describe('signOut', () => {
    it('should clear user and session', async () => {
      useAuthStore.setState({
        user: { id: 'user-1', email: 'test@example.com' } as never,
        session: { access_token: 'token' } as never,
      });
      await act(async () => {
        await useAuthStore.getState().signOut();
      });
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().session).toBeNull();
    });

    it('should call supabase signOut', async () => {
      await act(async () => {
        await useAuthStore.getState().signOut();
      });
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      useAuthStore.setState({
        user: { id: 'user-1' } as never,
        loading: false,
        initialized: true,
      });
      act(() => {
        useAuthStore.getState().reset();
      });
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.loading).toBe(true);
      expect(state.initialized).toBe(false);
    });
  });

  describe('selectors', () => {
    it('selectIsAuthenticated should return true when user exists', () => {
      const state = { user: { id: '1' }, session: null, loading: false, initialized: true } as never;
      expect(selectIsAuthenticated(state)).toBe(true);
    });

    it('selectIsAuthenticated should return false when user is null', () => {
      const state = { user: null, session: null, loading: false, initialized: true } as never;
      expect(selectIsAuthenticated(state)).toBe(false);
    });

    it('selectIsLoading should return loading state', () => {
      expect(selectIsLoading({ loading: true } as never)).toBe(true);
      expect(selectIsLoading({ loading: false } as never)).toBe(false);
    });
  });

  describe('useAuth hook', () => {
    it('should return user and loading', () => {
      useAuthStore.setState({
        user: { id: 'user-1', email: 'test@example.com' } as never,
        loading: false,
      });
      const { result } = renderHook(() => useAuth());
      expect(result.current.user).toBeTruthy();
      expect(result.current.loading).toBe(false);
    });
  });
});
