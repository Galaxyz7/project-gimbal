/**
 * Analytics Hooks
 *
 * React Query hooks for fetching analytics data.
 */

import { useQuery } from '@tanstack/react-query';
import { analyticsKeys } from '../../lib/queryKeys';
import { analyticsService, type DateRange } from './analyticsService';

// =============================================================================
// Dashboard Metrics Hook
// =============================================================================

export function useDashboardMetrics(siteId?: string) {
  return useQuery({
    queryKey: analyticsKeys.dashboardMetrics(siteId),
    queryFn: () => analyticsService.getDashboardMetrics(siteId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// =============================================================================
// Previous Period Metrics Hook (for trend comparison)
// =============================================================================

export function usePreviousPeriodMetrics(periodDays: number = 30, siteId?: string) {
  return useQuery({
    queryKey: [...analyticsKeys.dashboardMetrics(siteId), 'previous', periodDays],
    queryFn: () => analyticsService.getPreviousPeriodMetrics(periodDays, siteId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// =============================================================================
// Member Status Breakdown Hook
// =============================================================================

export function useMemberStatusBreakdown(siteId?: string) {
  return useQuery({
    queryKey: analyticsKeys.memberMetrics(siteId),
    queryFn: () => analyticsService.getMemberStatusBreakdown(siteId),
    staleTime: 5 * 60 * 1000,
  });
}

// =============================================================================
// Revenue By Month Hook
// =============================================================================

export function useRevenueByMonth(months: number = 6, siteId?: string) {
  return useQuery({
    queryKey: analyticsKeys.transactionMetrics(siteId, undefined),
    queryFn: () => analyticsService.getRevenueByMonth(months, siteId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// =============================================================================
// Visits By Day Hook
// =============================================================================

export function useVisitsByDay(dateRange: DateRange, siteId?: string) {
  const rangeKey = {
    start: dateRange.start.toISOString().split('T')[0],
    end: dateRange.end.toISOString().split('T')[0],
  };

  return useQuery({
    queryKey: analyticsKeys.visitMetrics(siteId, rangeKey),
    queryFn: () => analyticsService.getVisitsByDay(dateRange, siteId),
    staleTime: 5 * 60 * 1000,
  });
}

// =============================================================================
// Membership Level Breakdown Hook
// =============================================================================

export function useMembershipLevelBreakdown(siteId?: string) {
  return useQuery({
    queryKey: analyticsKeys.ltvDistribution(siteId),
    queryFn: () => analyticsService.getMembershipLevelBreakdown(siteId),
    staleTime: 10 * 60 * 1000,
  });
}

// =============================================================================
// Top Members Hook
// =============================================================================

export function useTopMembersByLtv(limit: number = 10, siteId?: string) {
  return useQuery({
    queryKey: [...analyticsKeys.memberMetrics(siteId), 'top', limit],
    queryFn: () => analyticsService.getTopMembersByLtv(limit, siteId),
    staleTime: 10 * 60 * 1000,
  });
}

// =============================================================================
// Engagement Trends Hook
// =============================================================================

export function useEngagementTrends(dateRange: DateRange, siteId?: string) {
  const rangeKey = {
    start: dateRange.start.toISOString().split('T')[0],
    end: dateRange.end.toISOString().split('T')[0],
  };

  return useQuery({
    queryKey: analyticsKeys.engagementTrends(siteId, rangeKey),
    queryFn: () => analyticsService.getEngagementTrends(dateRange, siteId),
    staleTime: 5 * 60 * 1000,
  });
}

// =============================================================================
// Follow-Up Members Hook
// =============================================================================

export function useFollowUpMembers(limit: number = 5, siteId?: string) {
  return useQuery({
    queryKey: [...analyticsKeys.memberMetrics(siteId), 'followUp', limit],
    queryFn: () => analyticsService.getFollowUpMembers(limit, siteId),
    staleTime: 5 * 60 * 1000,
  });
}
