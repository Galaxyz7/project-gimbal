
import {
  getProfiles,
  getProfileById,
  getCurrentProfile,
  getCurrentRole,
  hasRole,
  updateProfile,
  updateCurrentProfile,
  updateUserRole,
  deactivateUser,
  reactivateUser,
  updateLastLogin,
  getProfileCount,
  getProfileStats,
} from '../profileService';
import { mockProfileRow, TEST_IDS } from '@/test/mocks/fixtures';

// =============================================================================
// Mock Supabase
// =============================================================================

const { mockSingle, mockQueryChain, mockRpc, mockGetUser } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockQueryChain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    range: vi.fn(),
    single: mockSingle,
    then: vi.fn(),
  };
  for (const key of Object.keys(mockQueryChain)) {
    if (key !== 'single' && key !== 'then') {
      mockQueryChain[key].mockReturnValue(mockQueryChain);
    }
  }
  const mockRpc = vi.fn();
  const mockGetUser = vi.fn().mockResolvedValue({
    data: { user: { id: 'profile-uuid-1234' } },
    error: null,
  });
  return { mockSingle, mockQueryChain, mockRpc, mockGetUser };
});

const resolvableChain = (result: { data: unknown; error: unknown; count?: number | null }) => {
  Object.defineProperty(mockQueryChain, 'then', {
    value: vi.fn((resolve: (val: unknown) => void) => resolve(result)),
    writable: true,
    configurable: true,
  });
  mockSingle.mockResolvedValue(result);
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockQueryChain),
    rpc: mockRpc,
    auth: { getUser: mockGetUser },
  },
}));

// =============================================================================
// Tests
// =============================================================================

describe('profileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolvableChain({ data: [], error: null });
  });

  // ---------------------------------------------------------------------------
  // getProfiles
  // ---------------------------------------------------------------------------

  describe('getProfiles', () => {
    it('should fetch profiles', async () => {
      resolvableChain({ data: [mockProfileRow], error: null });
      const result = await getProfiles();
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('admin@example.com');
    });

    it('should apply search filter', async () => {
      resolvableChain({ data: [], error: null });
      await getProfiles({ search: 'admin' });
      expect(mockQueryChain.or).toHaveBeenCalled();
    });

    it('should filter by role', async () => {
      resolvableChain({ data: [], error: null });
      await getProfiles({ role: 'admin' });
      expect(mockQueryChain.eq).toHaveBeenCalledWith('role', 'admin');
    });

    it('should filter by active status', async () => {
      resolvableChain({ data: [], error: null });
      await getProfiles({ isActive: true });
      expect(mockQueryChain.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should throw on error', async () => {
      resolvableChain({ data: null, error: { message: 'DB error' } });
      await expect(getProfiles()).rejects.toThrow('Failed to fetch profiles');
    });
  });

  // ---------------------------------------------------------------------------
  // getProfileById
  // ---------------------------------------------------------------------------

  describe('getProfileById', () => {
    it('should return profile', async () => {
      mockSingle.mockResolvedValue({ data: mockProfileRow, error: null });
      const result = await getProfileById(TEST_IDS.profileId);
      expect(result).not.toBeNull();
      expect(result!.displayName).toBe('Test Admin');
    });

    it('should return null for not found', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
      const result = await getProfileById('nonexistent');
      expect(result).toBeNull();
    });

    it('should throw on unexpected error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: '500', message: 'Server error' } });
      await expect(getProfileById('test')).rejects.toThrow('Failed to fetch profile');
    });
  });

  // ---------------------------------------------------------------------------
  // getCurrentProfile
  // ---------------------------------------------------------------------------

  describe('getCurrentProfile', () => {
    it('should return null when no user', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
      const result = await getCurrentProfile();
      expect(result).toBeNull();
    });

    it('should fetch profile for current user', async () => {
      mockSingle.mockResolvedValue({ data: mockProfileRow, error: null });
      const result = await getCurrentProfile();
      expect(result).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // getCurrentRole / hasRole
  // ---------------------------------------------------------------------------

  describe('getCurrentRole', () => {
    it('should return role from RPC', async () => {
      mockRpc.mockResolvedValue({ data: 'admin', error: null });
      const result = await getCurrentRole();
      expect(result).toBe('admin');
    });

    it('should return null on error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'Error' } });
      const result = await getCurrentRole();
      expect(result).toBeNull();
    });
  });

  describe('hasRole', () => {
    it('should return true when role matches', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null });
      const result = await hasRole('admin');
      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'Error' } });
      const result = await hasRole('admin');
      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // updateProfile
  // ---------------------------------------------------------------------------

  describe('updateProfile', () => {
    it('should update and return profile', async () => {
      mockSingle.mockResolvedValue({
        data: { ...mockProfileRow, display_name: 'Updated Name' },
        error: null,
      });
      const result = await updateProfile(TEST_IDS.profileId, { displayName: 'Updated Name' });
      expect(result.displayName).toBe('Updated Name');
    });

    it('should throw on error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Update failed' } });
      await expect(updateProfile('test', { displayName: 'Test' })).rejects.toThrow('Failed to update profile');
    });
  });

  // ---------------------------------------------------------------------------
  // updateCurrentProfile
  // ---------------------------------------------------------------------------

  describe('updateCurrentProfile', () => {
    it('should throw when not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
      await expect(updateCurrentProfile({ displayName: 'Test' })).rejects.toThrow('Not authenticated');
    });

    it('should update current user profile', async () => {
      mockSingle.mockResolvedValue({ data: mockProfileRow, error: null });
      const result = await updateCurrentProfile({ displayName: 'New Name' });
      expect(result).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // updateUserRole
  // ---------------------------------------------------------------------------

  describe('updateUserRole', () => {
    it('should update user role', async () => {
      mockSingle.mockResolvedValue({
        data: { ...mockProfileRow, role: 'viewer' },
        error: null,
      });
      const result = await updateUserRole(TEST_IDS.profileId, 'viewer');
      expect(result.role).toBe('viewer');
    });
  });

  // ---------------------------------------------------------------------------
  // deactivateUser / reactivateUser
  // ---------------------------------------------------------------------------

  describe('deactivateUser', () => {
    it('should set is_active to false', async () => {
      mockSingle.mockResolvedValue({
        data: { ...mockProfileRow, is_active: false },
        error: null,
      });
      const result = await deactivateUser(TEST_IDS.profileId);
      expect(result.isActive).toBe(false);
    });
  });

  describe('reactivateUser', () => {
    it('should set is_active to true', async () => {
      mockSingle.mockResolvedValue({
        data: { ...mockProfileRow, is_active: true },
        error: null,
      });
      const result = await reactivateUser(TEST_IDS.profileId);
      expect(result.isActive).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // updateLastLogin
  // ---------------------------------------------------------------------------

  describe('updateLastLogin', () => {
    it('should call RPC', async () => {
      mockRpc.mockResolvedValue({ error: null });
      await updateLastLogin();
      expect(mockRpc).toHaveBeenCalledWith('update_last_login');
    });

    it('should not throw on error', async () => {
      mockRpc.mockResolvedValue({ error: { message: 'Error' } });
      await expect(updateLastLogin()).resolves.toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // getProfileCount
  // ---------------------------------------------------------------------------

  describe('getProfileCount', () => {
    it('should return count', async () => {
      resolvableChain({ data: null, error: null, count: 42 });
      const result = await getProfileCount();
      expect(result).toBe(42);
    });

    it('should filter by role', async () => {
      resolvableChain({ data: null, error: null, count: 5 });
      await getProfileCount({ role: 'admin' });
      expect(mockQueryChain.eq).toHaveBeenCalledWith('role', 'admin');
    });
  });

  // ---------------------------------------------------------------------------
  // getProfileStats
  // ---------------------------------------------------------------------------

  describe('getProfileStats', () => {
    it('should aggregate stats', async () => {
      resolvableChain({
        data: [
          { role: 'admin', is_active: true },
          { role: 'user', is_active: true },
          { role: 'viewer', is_active: false },
        ],
        error: null,
      });
      const result = await getProfileStats();
      expect(result.total).toBe(3);
      expect(result.active).toBe(2);
      expect(result.inactive).toBe(1);
      expect(result.byRole.admin).toBe(1);
      expect(result.byRole.user).toBe(1);
      expect(result.byRole.viewer).toBe(1);
    });

    it('should throw on error', async () => {
      resolvableChain({ data: null, error: { message: 'Error' } });
      await expect(getProfileStats()).rejects.toThrow('Failed to fetch profile stats');
    });
  });
});
