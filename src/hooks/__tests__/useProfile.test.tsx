import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test/helpers';

// =============================================================================
// Mocks
// =============================================================================

const mockProfileService = vi.hoisted(() => ({
  getCurrentProfile: vi.fn(),
  getCurrentRole: vi.fn(),
  getProfiles: vi.fn(),
  getProfileById: vi.fn(),
  getProfileWithStats: vi.fn(),
  getProfileStats: vi.fn(),
  updateCurrentProfile: vi.fn(),
  updateProfile: vi.fn(),
  updateUserRole: vi.fn(),
  deactivateUser: vi.fn(),
  reactivateUser: vi.fn(),
}));

const mockAppSettingsService = vi.hoisted(() => ({
  getAppSettingsMasked: vi.fn(),
  getMessagingStatus: vi.fn(),
  updateAppSettings: vi.fn(),
  getAuditLogs: vi.fn(),
  getAuditLogStats: vi.fn(),
  getAuditEventTypes: vi.fn(),
}));

vi.mock('@/services/admin/profileService', () => ({
  profileService: mockProfileService,
}));

vi.mock('@/services/admin/appSettingsService', () => ({
  appSettingsService: mockAppSettingsService,
}));

import {
  useCurrentProfile,
  useCurrentRole,
  useProfiles,
  useProfile,
  useProfileWithStats,
  useProfileStats,
  useUpdateCurrentProfile,
  useUpdateProfile,
  useUpdateUserRole,
  useDeactivateUser,
  useReactivateUser,
  useAppSettings,
  useMessagingStatus,
  useUpdateAppSettings,
  useAuditLogs,
  useAuditLogStats,
  useAuditEventTypes,
  useHasRole,
  useIsAdmin,
} from '../useProfile';

// =============================================================================
// Test Wrapper
// =============================================================================

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

// =============================================================================
// Test Data
// =============================================================================

const mockProfile = {
  id: 'p-1',
  email: 'test@test.com',
  role: 'admin' as const,
  displayName: 'Test User',
  avatarUrl: null,
  phone: null,
  isActive: true,
  lastLoginAt: null,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

const mockProfileWithStats = {
  ...mockProfile,
  campaignCount: 5,
  lastActivityAt: '2025-06-01T00:00:00Z',
};

// =============================================================================
// Tests
// =============================================================================

describe('useProfile hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Profile Queries
  // ===========================================================================

  describe('useCurrentProfile', () => {
    it('should call profileService.getCurrentProfile and return data', async () => {
      mockProfileService.getCurrentProfile.mockResolvedValue(mockProfile);

      const { result } = renderHook(() => useCurrentProfile(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockProfileService.getCurrentProfile).toHaveBeenCalled();
      expect(result.current.data).toEqual(mockProfile);
    });
  });

  describe('useCurrentRole', () => {
    it('should call profileService.getCurrentRole and return role', async () => {
      mockProfileService.getCurrentRole.mockResolvedValue('admin');

      const { result } = renderHook(() => useCurrentRole(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockProfileService.getCurrentRole).toHaveBeenCalled();
      expect(result.current.data).toBe('admin');
    });
  });

  describe('useProfiles', () => {
    it('should call profileService.getProfiles with params', async () => {
      const profiles = [mockProfile];
      mockProfileService.getProfiles.mockResolvedValue(profiles);

      const params = { role: 'admin' as const, isActive: true };
      const { result } = renderHook(() => useProfiles(params), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockProfileService.getProfiles).toHaveBeenCalledWith(params);
      expect(result.current.data).toEqual(profiles);
    });
  });

  describe('useProfile', () => {
    it('should call profileService.getProfileById when id is provided', async () => {
      mockProfileService.getProfileById.mockResolvedValue(mockProfile);

      const { result } = renderHook(() => useProfile('p-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockProfileService.getProfileById).toHaveBeenCalledWith('p-1');
      expect(result.current.data).toEqual(mockProfile);
    });

    it('should not fetch when id is undefined', () => {
      const { result } = renderHook(() => useProfile(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockProfileService.getProfileById).not.toHaveBeenCalled();
    });
  });

  describe('useProfileWithStats', () => {
    it('should call profileService.getProfileWithStats when id is provided', async () => {
      mockProfileService.getProfileWithStats.mockResolvedValue(mockProfileWithStats);

      const { result } = renderHook(() => useProfileWithStats('p-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockProfileService.getProfileWithStats).toHaveBeenCalledWith('p-1');
      expect(result.current.data).toEqual(mockProfileWithStats);
    });
  });

  describe('useProfileStats', () => {
    it('should call profileService.getProfileStats', async () => {
      const stats = { totalUsers: 10, activeUsers: 8 };
      mockProfileService.getProfileStats.mockResolvedValue(stats);

      const { result } = renderHook(() => useProfileStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockProfileService.getProfileStats).toHaveBeenCalled();
      expect(result.current.data).toEqual(stats);
    });
  });

  // ===========================================================================
  // Profile Mutations
  // ===========================================================================

  describe('useUpdateCurrentProfile', () => {
    it('should call profileService.updateCurrentProfile on mutate', async () => {
      const input = { displayName: 'Updated Name' };
      const updatedProfile = { ...mockProfile, displayName: 'Updated Name' };
      mockProfileService.updateCurrentProfile.mockResolvedValue(updatedProfile);

      const { result } = renderHook(() => useUpdateCurrentProfile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(input);
      });

      expect(mockProfileService.updateCurrentProfile).toHaveBeenCalledWith(input);
    });
  });

  describe('useUpdateProfile', () => {
    it('should call profileService.updateProfile with id and input', async () => {
      const input = { displayName: 'Admin Updated' };
      const updatedProfile = { ...mockProfile, displayName: 'Admin Updated' };
      mockProfileService.updateProfile.mockResolvedValue(updatedProfile);

      const { result } = renderHook(() => useUpdateProfile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({ id: 'p-1', input });
      });

      expect(mockProfileService.updateProfile).toHaveBeenCalledWith('p-1', input);
    });
  });

  describe('useUpdateUserRole', () => {
    it('should call profileService.updateUserRole with userId and role', async () => {
      const updatedProfile = { ...mockProfile, role: 'viewer' };
      mockProfileService.updateUserRole.mockResolvedValue(updatedProfile);

      const { result } = renderHook(() => useUpdateUserRole(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({ userId: 'p-1', role: 'viewer' });
      });

      expect(mockProfileService.updateUserRole).toHaveBeenCalledWith('p-1', 'viewer');
    });
  });

  describe('useDeactivateUser', () => {
    it('should call profileService.deactivateUser with userId', async () => {
      const deactivated = { ...mockProfile, isActive: false };
      mockProfileService.deactivateUser.mockResolvedValue(deactivated);

      const { result } = renderHook(() => useDeactivateUser(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('p-1');
      });

      expect(mockProfileService.deactivateUser).toHaveBeenCalledWith('p-1');
    });
  });

  describe('useReactivateUser', () => {
    it('should call profileService.reactivateUser with userId', async () => {
      const reactivated = { ...mockProfile, isActive: true };
      mockProfileService.reactivateUser.mockResolvedValue(reactivated);

      const { result } = renderHook(() => useReactivateUser(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('p-1');
      });

      expect(mockProfileService.reactivateUser).toHaveBeenCalledWith('p-1');
    });
  });

  // ===========================================================================
  // App Settings Queries
  // ===========================================================================

  describe('useAppSettings', () => {
    it('should call appSettingsService.getAppSettingsMasked', async () => {
      const settings = { id: 's-1', companyName: 'Test Co' };
      mockAppSettingsService.getAppSettingsMasked.mockResolvedValue(settings);

      const { result } = renderHook(() => useAppSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAppSettingsService.getAppSettingsMasked).toHaveBeenCalled();
      expect(result.current.data).toEqual(settings);
    });
  });

  describe('useMessagingStatus', () => {
    it('should call appSettingsService.getMessagingStatus', async () => {
      const status = { smsConfigured: true, emailConfigured: false };
      mockAppSettingsService.getMessagingStatus.mockResolvedValue(status);

      const { result } = renderHook(() => useMessagingStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAppSettingsService.getMessagingStatus).toHaveBeenCalled();
      expect(result.current.data).toEqual(status);
    });
  });

  // ===========================================================================
  // App Settings Mutations
  // ===========================================================================

  describe('useUpdateAppSettings', () => {
    it('should call appSettingsService.updateAppSettings on mutate', async () => {
      const input = { companyName: 'New Name' };
      const updated = { id: 's-1', companyName: 'New Name' };
      mockAppSettingsService.updateAppSettings.mockResolvedValue(updated);

      const { result } = renderHook(() => useUpdateAppSettings(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(input);
      });

      expect(mockAppSettingsService.updateAppSettings).toHaveBeenCalledWith(input);
    });
  });

  // ===========================================================================
  // Audit Log Queries
  // ===========================================================================

  describe('useAuditLogs', () => {
    it('should call appSettingsService.getAuditLogs with params', async () => {
      const logs = [{ id: 'log-1', eventType: 'LOGIN_SUCCESS' }];
      mockAppSettingsService.getAuditLogs.mockResolvedValue(logs);

      const params = { eventType: 'LOGIN_SUCCESS' };
      const { result } = renderHook(() => useAuditLogs(params), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAppSettingsService.getAuditLogs).toHaveBeenCalledWith(params);
      expect(result.current.data).toEqual(logs);
    });
  });

  describe('useAuditLogStats', () => {
    it('should call appSettingsService.getAuditLogStats with days', async () => {
      const stats = { totalEvents: 50 };
      mockAppSettingsService.getAuditLogStats.mockResolvedValue(stats);

      const { result } = renderHook(() => useAuditLogStats(14), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAppSettingsService.getAuditLogStats).toHaveBeenCalledWith(14);
      expect(result.current.data).toEqual(stats);
    });
  });

  describe('useAuditEventTypes', () => {
    it('should call appSettingsService.getAuditEventTypes', async () => {
      const types = ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT'];
      mockAppSettingsService.getAuditEventTypes.mockResolvedValue(types);

      const { result } = renderHook(() => useAuditEventTypes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAppSettingsService.getAuditEventTypes).toHaveBeenCalled();
      expect(result.current.data).toEqual(types);
    });
  });

  // ===========================================================================
  // Permission Helpers
  // ===========================================================================

  describe('useHasRole', () => {
    it('should return hasRole: true when admin checks for viewer role', async () => {
      mockProfileService.getCurrentRole.mockResolvedValue('admin');

      const { result } = renderHook(() => useHasRole('viewer'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasRole).toBe(true);
    });

    it('should return hasRole: false when viewer checks for admin role', async () => {
      mockProfileService.getCurrentRole.mockResolvedValue('viewer');

      const { result } = renderHook(() => useHasRole('admin'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasRole).toBe(false);
    });
  });

  describe('useIsAdmin', () => {
    it('should return isAdmin: true when role is admin', async () => {
      mockProfileService.getCurrentRole.mockResolvedValue('admin');

      const { result } = renderHook(() => useIsAdmin(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(true);
    });

    it('should return isAdmin: false when role is not admin', async () => {
      mockProfileService.getCurrentRole.mockResolvedValue('user');

      const { result } = renderHook(() => useIsAdmin(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(false);
    });
  });
});
