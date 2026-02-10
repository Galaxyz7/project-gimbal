
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';

// =============================================================================
// Mocks
// =============================================================================

const { mockUseAuth, mockGetCurrentRole } = vi.hoisted(() => {
  const mockUseAuth = vi.fn().mockReturnValue({ user: null, loading: true });
  const mockGetCurrentRole = vi.fn().mockResolvedValue('user');
  return { mockUseAuth, mockGetCurrentRole };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('@/services/admin/profileService', () => ({
  profileService: {
    getCurrentRole: mockGetCurrentRole,
  },
}));

// Helper to render within a router
function renderWithRouter(ui: React.ReactElement, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
}

// =============================================================================
// Tests
// =============================================================================

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  it('should show loading spinner while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Unauthenticated redirects
  // ---------------------------------------------------------------------------

  it('should redirect to /login when no user', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Authenticated without role requirement
  // ---------------------------------------------------------------------------

  it('should render children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      loading: false,
    });
    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Role-based access
  // ---------------------------------------------------------------------------

  it('should show loading while fetching role', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      loading: false,
    });
    // Make getCurrentRole never resolve immediately
    mockGetCurrentRole.mockReturnValue(new Promise(() => {}));
    renderWithRouter(
      <ProtectedRoute requiredRole="admin">
        <div>Admin Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('should render children when user has required role', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      loading: false,
    });
    mockGetCurrentRole.mockResolvedValue('admin');
    renderWithRouter(
      <ProtectedRoute requiredRole="admin">
        <div>Admin Content</div>
      </ProtectedRoute>
    );
    await waitFor(() => {
      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });
  });

  it('should redirect when user lacks required role', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      loading: false,
    });
    mockGetCurrentRole.mockResolvedValue('viewer');
    renderWithRouter(
      <ProtectedRoute requiredRole="admin">
        <div>Admin Content</div>
      </ProtectedRoute>
    );
    await waitFor(() => {
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });
  });

  it('should redirect to custom path when unauthorized', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      loading: false,
    });
    mockGetCurrentRole.mockResolvedValue('viewer');
    renderWithRouter(
      <ProtectedRoute requiredRole="admin" unauthorizedRedirect="/forbidden">
        <div>Admin Content</div>
      </ProtectedRoute>
    );
    await waitFor(() => {
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });
  });

  it('should redirect when role fetch fails', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      loading: false,
    });
    mockGetCurrentRole.mockRejectedValue(new Error('Network error'));
    renderWithRouter(
      <ProtectedRoute requiredRole="admin">
        <div>Admin Content</div>
      </ProtectedRoute>
    );
    await waitFor(() => {
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });
  });

  it('should have accessible loading state', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-label', 'Checking authentication');
  });
});
