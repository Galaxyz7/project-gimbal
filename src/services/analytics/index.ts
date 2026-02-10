/**
 * Analytics Service
 *
 * @module services/analytics
 */

export { analyticsService } from './analyticsService';
export type {
  DashboardMetrics,
  MemberStatusBreakdown,
  RevenueByMonth,
  VisitsByDay,
  MembershipLevelBreakdown,
  TopMember,
  DateRange,
} from './analyticsService';

export {
  useDashboardMetrics,
  usePreviousPeriodMetrics,
  useMemberStatusBreakdown,
  useRevenueByMonth,
  useVisitsByDay,
  useMembershipLevelBreakdown,
  useTopMembersByLtv,
  useEngagementTrends,
} from './useAnalytics';
