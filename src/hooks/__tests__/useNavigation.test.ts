
import { renderHook } from '@testing-library/react';
import { useNavigation } from '../useNavigation';

// =============================================================================
// Mocks
// =============================================================================

const { mockUseCurrentRole } = vi.hoisted(() => {
  const mockUseCurrentRole = vi.fn().mockReturnValue({ data: null, isLoading: false });
  return { mockUseCurrentRole };
});

vi.mock('@/hooks/useProfile', () => ({
  useCurrentRole: mockUseCurrentRole,
}));

// =============================================================================
// Tests
// =============================================================================

describe('useNavigation', () => {
  it('should return nav items for admin role', () => {
    mockUseCurrentRole.mockReturnValue({ data: 'admin', isLoading: false });
    const { result } = renderHook(() => useNavigation());
    expect(result.current.isLoading).toBe(false);
    // Admin should see all items including Admin section
    const ids = result.current.navItems.map((item) => item.id);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('campaigns');
    expect(ids).toContain('templates');
    expect(ids).toContain('audience');
    expect(ids).toContain('segments');
    expect(ids).toContain('import');
    expect(ids).toContain('admin');
  });

  it('should filter admin items for user role', () => {
    mockUseCurrentRole.mockReturnValue({ data: 'user', isLoading: false });
    const { result } = renderHook(() => useNavigation());
    const ids = result.current.navItems.map((item) => item.id);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('campaigns');
    expect(ids).toContain('audience');
    expect(ids).toContain('import');
    expect(ids).not.toContain('admin');
  });

  it('should filter admin items for viewer role', () => {
    mockUseCurrentRole.mockReturnValue({ data: 'viewer', isLoading: false });
    const { result } = renderHook(() => useNavigation());
    const ids = result.current.navItems.map((item) => item.id);
    expect(ids).toContain('dashboard');
    expect(ids).not.toContain('admin');
  });

  it('should hide role-gated items when no role', () => {
    mockUseCurrentRole.mockReturnValue({ data: null, isLoading: false });
    const { result } = renderHook(() => useNavigation());
    const ids = result.current.navItems.map((item) => item.id);
    expect(ids).toContain('dashboard');
    expect(ids).not.toContain('admin');
  });

  it('should include children for admin nav item', () => {
    mockUseCurrentRole.mockReturnValue({ data: 'admin', isLoading: false });
    const { result } = renderHook(() => useNavigation());
    const adminItem = result.current.navItems.find((item) => item.id === 'admin');
    expect(adminItem).toBeDefined();
    expect(adminItem!.children).toBeDefined();
    expect(adminItem!.children!.length).toBeGreaterThan(0);
    const childIds = adminItem!.children!.map((c) => c.id);
    expect(childIds).toContain('users');
    expect(childIds).toContain('settings');
  });

  it('should return loading state', () => {
    mockUseCurrentRole.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useNavigation());
    expect(result.current.isLoading).toBe(true);
  });
});
