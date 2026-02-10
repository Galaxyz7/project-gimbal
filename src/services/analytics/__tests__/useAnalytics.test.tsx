import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test/helpers';
import {
  useDashboardMetrics,
  usePreviousPeriodMetrics,
  useMemberStatusBreakdown,
  useRevenueByMonth,
  useVisitsByDay,
  useMembershipLevelBreakdown,
  useTopMembersByLtv,
  useEngagementTrends,
} from '../useAnalytics';
import type { DateRange } from '../analyticsService';

// =============================================================================
// Mock analyticsService
// =============================================================================

const mockService = vi.hoisted(() => ({
  getDashboardMetrics: vi.fn(),
  getPreviousPeriodMetrics: vi.fn(),
  getMemberStatusBreakdown: vi.fn(),
  getRevenueByMonth: vi.fn(),
  getVisitsByDay: vi.fn(),
  getMembershipLevelBreakdown: vi.fn(),
  getTopMembersByLtv: vi.fn(),
  getEngagementTrends: vi.fn(),
}));

vi.mock('../analyticsService', () => ({
  analyticsService: mockService,
}));

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
// Tests
// =============================================================================

describe('useAnalytics hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useDashboardMetrics', () => {
    it('should call getDashboardMetrics and return data', async () => {
      const mockData = { totalMembers: 100, activeMembers: 80 };
      mockService.getDashboardMetrics.mockResolvedValue(mockData);

      const { result } = renderHook(() => useDashboardMetrics(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockData);
      expect(mockService.getDashboardMetrics).toHaveBeenCalledWith(undefined);
    });

    it('should pass siteId to service', async () => {
      mockService.getDashboardMetrics.mockResolvedValue({});

      const { result } = renderHook(() => useDashboardMetrics('site-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockService.getDashboardMetrics).toHaveBeenCalledWith('site-1');
    });
  });

  describe('usePreviousPeriodMetrics', () => {
    it('should call with default period', async () => {
      mockService.getPreviousPeriodMetrics.mockResolvedValue({
        previousMembers: 0, previousRevenue: 0, previousVisits: 0,
      });

      const { result } = renderHook(() => usePreviousPeriodMetrics(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockService.getPreviousPeriodMetrics).toHaveBeenCalledWith(30, undefined);
    });

    it('should pass custom periodDays and siteId', async () => {
      mockService.getPreviousPeriodMetrics.mockResolvedValue({
        previousMembers: 5, previousRevenue: 100, previousVisits: 10,
      });

      const { result } = renderHook(
        () => usePreviousPeriodMetrics(7, 'site-1'),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockService.getPreviousPeriodMetrics).toHaveBeenCalledWith(7, 'site-1');
    });
  });

  describe('useMemberStatusBreakdown', () => {
    it('should call getMemberStatusBreakdown', async () => {
      mockService.getMemberStatusBreakdown.mockResolvedValue([]);

      const { result } = renderHook(() => useMemberStatusBreakdown(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockService.getMemberStatusBreakdown).toHaveBeenCalledWith(undefined);
    });
  });

  describe('useRevenueByMonth', () => {
    it('should call with default months', async () => {
      mockService.getRevenueByMonth.mockResolvedValue([]);

      const { result } = renderHook(() => useRevenueByMonth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockService.getRevenueByMonth).toHaveBeenCalledWith(6, undefined);
    });
  });

  describe('useVisitsByDay', () => {
    it('should call with dateRange', async () => {
      const dateRange: DateRange = {
        start: new Date('2025-06-01'),
        end: new Date('2025-06-07'),
      };
      mockService.getVisitsByDay.mockResolvedValue([]);

      const { result } = renderHook(() => useVisitsByDay(dateRange), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockService.getVisitsByDay).toHaveBeenCalledWith(dateRange, undefined);
    });
  });

  describe('useMembershipLevelBreakdown', () => {
    it('should call getMembershipLevelBreakdown', async () => {
      mockService.getMembershipLevelBreakdown.mockResolvedValue([]);

      const { result } = renderHook(() => useMembershipLevelBreakdown(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockService.getMembershipLevelBreakdown).toHaveBeenCalledWith(undefined);
    });
  });

  describe('useTopMembersByLtv', () => {
    it('should call with default limit', async () => {
      mockService.getTopMembersByLtv.mockResolvedValue([]);

      const { result } = renderHook(() => useTopMembersByLtv(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockService.getTopMembersByLtv).toHaveBeenCalledWith(10, undefined);
    });

    it('should pass custom limit and siteId', async () => {
      mockService.getTopMembersByLtv.mockResolvedValue([]);

      const { result } = renderHook(
        () => useTopMembersByLtv(5, 'site-1'),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockService.getTopMembersByLtv).toHaveBeenCalledWith(5, 'site-1');
    });
  });

  describe('useEngagementTrends', () => {
    it('should call with dateRange', async () => {
      const dateRange: DateRange = {
        start: new Date('2025-06-01'),
        end: new Date('2025-06-07'),
      };
      mockService.getEngagementTrends.mockResolvedValue([]);

      const { result } = renderHook(
        () => useEngagementTrends(dateRange),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockService.getEngagementTrends).toHaveBeenCalledWith(dateRange, undefined);
    });
  });
});
