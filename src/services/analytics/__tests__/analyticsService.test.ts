import { analyticsService } from '../analyticsService';

// =============================================================================
// Mock Supabase
// =============================================================================

const { mockSingle, mockQueryChain } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockQueryChain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    gt: vi.fn(),
    lt: vi.fn(),
    lte: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    single: mockSingle,
    then: vi.fn(),
  };
  for (const key of Object.keys(mockQueryChain)) {
    if (key !== 'single' && key !== 'then') {
      mockQueryChain[key].mockReturnValue(mockQueryChain);
    }
  }
  return { mockSingle, mockQueryChain };
});

/**
 * Set the mock chain to resolve with a single result.
 * For methods with one query.
 */
const resolvableChain = (result: { data: unknown; error: unknown; count?: number | null }) => {
  Object.defineProperty(mockQueryChain, 'then', {
    value: vi.fn((resolve: (val: unknown) => void) => resolve(result)),
    writable: true,
    configurable: true,
  });
  mockSingle.mockResolvedValue(result);
};

/**
 * Set the mock chain to resolve sequentially for multi-query methods.
 * Each call to .then() returns the next result in the array.
 */
const resolvableSequence = (results: Array<{ data: unknown; error: unknown; count?: number | null }>) => {
  let callIndex = 0;
  Object.defineProperty(mockQueryChain, 'then', {
    value: vi.fn((resolve: (val: unknown) => void) => {
      const result = results[callIndex] ?? results[results.length - 1];
      callIndex++;
      resolve(result);
    }),
    writable: true,
    configurable: true,
  });
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockQueryChain),
  },
}));

// =============================================================================
// Tests
// =============================================================================

describe('analyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolvableChain({ data: [], error: null, count: 0 });
  });

  // ===========================================================================
  // getDashboardMetrics
  // ===========================================================================

  describe('getDashboardMetrics', () => {
    it('should return zero metrics when no data', async () => {
      resolvableSequence([
        { data: [], error: null, count: 0 },     // members
        { data: [], error: null },                 // transactions
        { data: [], error: null, count: 0 },       // visits
      ]);

      const result = await analyticsService.getDashboardMetrics();
      expect(result.totalMembers).toBe(0);
      expect(result.activeMembers).toBe(0);
      expect(result.newMembersThisMonth).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.revenueThisMonth).toBe(0);
      expect(result.avgLtv).toBe(0);
      expect(result.totalVisits).toBe(0);
      expect(result.visitsThisMonth).toBe(0);
      expect(result.avgVisitsPerMember).toBe(0);
    });

    it('should calculate metrics from member data', async () => {
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 5).toISOString();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 10).toISOString();

      resolvableSequence([
        {
          data: [
            { id: '1', membership_status: 'active', lifetime_value: 500, total_visits: 10, created_at: thisMonth },
            { id: '2', membership_status: 'inactive', lifetime_value: 200, total_visits: 5, created_at: lastMonth },
          ],
          count: 2,
          error: null,
        },
        {
          data: [
            { amount: 100, transaction_type: 'purchase', transaction_date: thisMonth },
          ],
          error: null,
        },
        { data: [], error: null, count: 3 },
      ]);

      const result = await analyticsService.getDashboardMetrics();
      expect(result.totalMembers).toBe(2);
      expect(result.activeMembers).toBe(1);
      expect(result.newMembersThisMonth).toBe(1);
      expect(result.totalRevenue).toBe(100);
      expect(result.avgLtv).toBe(350);
      expect(result.totalVisits).toBe(15);
      expect(result.visitsThisMonth).toBe(3);
      expect(result.avgVisitsPerMember).toBe(7.5);
    });

    it('should filter by siteId when provided', async () => {
      resolvableSequence([
        { data: [], error: null, count: 0 },
        { data: [], error: null },
        { data: [], error: null, count: 0 },
      ]);

      await analyticsService.getDashboardMetrics('site-123');
      expect(mockQueryChain.eq).toHaveBeenCalledWith('site_id', 'site-123');
    });

    it('should subtract refunds from revenue', async () => {
      resolvableSequence([
        { data: [], error: null, count: 0 },
        {
          data: [
            { amount: 100, transaction_type: 'purchase', transaction_date: '2025-01-15T00:00:00Z' },
            { amount: 30, transaction_type: 'refund', transaction_date: '2025-01-20T00:00:00Z' },
          ],
          error: null,
        },
        { data: [], error: null, count: 0 },
      ]);

      const result = await analyticsService.getDashboardMetrics();
      expect(result.totalRevenue).toBe(70);
    });
  });

  // ===========================================================================
  // getPreviousPeriodMetrics
  // ===========================================================================

  describe('getPreviousPeriodMetrics', () => {
    it('should return zero metrics when no data', async () => {
      resolvableSequence([
        { data: [], error: null, count: 0 },  // members
        { data: [], error: null },              // transactions
        { data: [], error: null, count: 0 },    // visits
      ]);

      const result = await analyticsService.getPreviousPeriodMetrics();
      expect(result.previousMembers).toBe(0);
      expect(result.previousRevenue).toBe(0);
      expect(result.previousVisits).toBe(0);
    });

    it('should use date range filters', async () => {
      resolvableSequence([
        { data: [], error: null, count: 0 },
        { data: [], error: null },
        { data: [], error: null, count: 0 },
      ]);

      await analyticsService.getPreviousPeriodMetrics(30);
      expect(mockQueryChain.gte).toHaveBeenCalled();
      expect(mockQueryChain.lt).toHaveBeenCalled();
    });

    it('should calculate previous revenue with refunds', async () => {
      resolvableSequence([
        { data: [], error: null, count: 5 },
        {
          data: [
            { amount: 200, transaction_type: 'purchase' },
            { amount: 50, transaction_type: 'refund' },
          ],
          error: null,
        },
        { data: [], error: null, count: 10 },
      ]);

      const result = await analyticsService.getPreviousPeriodMetrics(30);
      expect(result.previousMembers).toBe(5);
      expect(result.previousRevenue).toBe(150);
      expect(result.previousVisits).toBe(10);
    });

    it('should filter by siteId when provided', async () => {
      resolvableSequence([
        { data: [], error: null, count: 0 },
        { data: [], error: null },
        { data: [], error: null, count: 0 },
      ]);

      await analyticsService.getPreviousPeriodMetrics(30, 'site-123');
      expect(mockQueryChain.eq).toHaveBeenCalledWith('site_id', 'site-123');
    });
  });

  // ===========================================================================
  // getMemberStatusBreakdown
  // ===========================================================================

  describe('getMemberStatusBreakdown', () => {
    it('should return empty array when no members', async () => {
      resolvableChain({ data: [], error: null });
      const result = await analyticsService.getMemberStatusBreakdown();
      expect(result).toEqual([]);
    });

    it('should return empty array when data is null', async () => {
      resolvableChain({ data: null, error: null });
      const result = await analyticsService.getMemberStatusBreakdown();
      expect(result).toEqual([]);
    });

    it('should group members by status', async () => {
      resolvableChain({
        data: [
          { membership_status: 'active' },
          { membership_status: 'active' },
          { membership_status: 'inactive' },
        ],
        error: null,
      });

      const result = await analyticsService.getMemberStatusBreakdown();
      expect(result).toHaveLength(2);
      const active = result.find(r => r.status === 'active');
      expect(active?.count).toBe(2);
      expect(active?.percentage).toBeCloseTo(66.67, 0);
    });

    it('should label null status as unknown', async () => {
      resolvableChain({
        data: [{ membership_status: null }],
        error: null,
      });

      const result = await analyticsService.getMemberStatusBreakdown();
      expect(result[0].status).toBe('unknown');
    });

    it('should filter by siteId when provided', async () => {
      resolvableChain({ data: [], error: null });
      await analyticsService.getMemberStatusBreakdown('site-123');
      expect(mockQueryChain.eq).toHaveBeenCalledWith('site_id', 'site-123');
    });
  });

  // ===========================================================================
  // getRevenueByMonth
  // ===========================================================================

  describe('getRevenueByMonth', () => {
    it('should return empty array when no transactions', async () => {
      resolvableChain({ data: null, error: null });
      const result = await analyticsService.getRevenueByMonth();
      expect(result).toEqual([]);
    });

    it('should group transactions by month', async () => {
      resolvableChain({
        data: [
          { amount: 100, transaction_type: 'purchase', transaction_date: '2025-06-15T00:00:00Z' },
          { amount: 50, transaction_type: 'purchase', transaction_date: '2025-06-20T00:00:00Z' },
          { amount: 200, transaction_type: 'purchase', transaction_date: '2025-05-10T00:00:00Z' },
        ],
        error: null,
      });

      const result = await analyticsService.getRevenueByMonth(6);
      expect(result).toHaveLength(2);
      expect(result[0].month).toBe('2025-05');
      expect(result[0].revenue).toBe(200);
      expect(result[1].month).toBe('2025-06');
      expect(result[1].revenue).toBe(150);
      expect(result[1].transactions).toBe(2);
    });

    it('should subtract refunds from revenue', async () => {
      resolvableChain({
        data: [
          { amount: 100, transaction_type: 'purchase', transaction_date: '2025-06-15T00:00:00Z' },
          { amount: 30, transaction_type: 'refund', transaction_date: '2025-06-20T00:00:00Z' },
        ],
        error: null,
      });

      const result = await analyticsService.getRevenueByMonth(6);
      expect(result[0].revenue).toBe(70);
    });

    it('should sort months chronologically', async () => {
      resolvableChain({
        data: [
          { amount: 50, transaction_type: 'purchase', transaction_date: '2025-08-15T12:00:00Z' },
          { amount: 100, transaction_type: 'purchase', transaction_date: '2025-03-15T12:00:00Z' },
        ],
        error: null,
      });

      const result = await analyticsService.getRevenueByMonth(12);
      expect(result[0].month).toBe('2025-03');
      expect(result[1].month).toBe('2025-08');
    });
  });

  // ===========================================================================
  // getVisitsByDay
  // ===========================================================================

  describe('getVisitsByDay', () => {
    it('should return empty array when no visits', async () => {
      resolvableChain({ data: null, error: null });
      const dateRange = {
        start: new Date('2025-06-01'),
        end: new Date('2025-06-03'),
      };
      const result = await analyticsService.getVisitsByDay(dateRange);
      expect(result).toEqual([]);
    });

    it('should group visits by date and fill missing days', async () => {
      resolvableChain({
        data: [
          { visit_date: '2025-06-01' },
          { visit_date: '2025-06-01' },
          { visit_date: '2025-06-03' },
        ],
        error: null,
      });

      const dateRange = {
        start: new Date('2025-06-01'),
        end: new Date('2025-06-03'),
      };
      const result = await analyticsService.getVisitsByDay(dateRange);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ date: '2025-06-01', visits: 2 });
      expect(result[1]).toEqual({ date: '2025-06-02', visits: 0 });
      expect(result[2]).toEqual({ date: '2025-06-03', visits: 1 });
    });

    it('should use date range filters', async () => {
      resolvableChain({ data: [], error: null });
      const dateRange = {
        start: new Date('2025-06-01'),
        end: new Date('2025-06-07'),
      };
      await analyticsService.getVisitsByDay(dateRange);
      expect(mockQueryChain.gte).toHaveBeenCalledWith('visit_date', '2025-06-01');
      expect(mockQueryChain.lte).toHaveBeenCalledWith('visit_date', '2025-06-07');
    });
  });

  // ===========================================================================
  // getMembershipLevelBreakdown
  // ===========================================================================

  describe('getMembershipLevelBreakdown', () => {
    it('should return empty array when no members', async () => {
      resolvableChain({ data: null, error: null });
      const result = await analyticsService.getMembershipLevelBreakdown();
      expect(result).toEqual([]);
    });

    it('should group by membership level', async () => {
      resolvableChain({
        data: [
          { membership_level_id: 'lvl-1', lifetime_value: 100, membership_levels: { name: 'Gold' } },
          { membership_level_id: 'lvl-1', lifetime_value: 200, membership_levels: { name: 'Gold' } },
          { membership_level_id: null, lifetime_value: 50, membership_levels: null },
        ],
        error: null,
      });

      const result = await analyticsService.getMembershipLevelBreakdown();
      expect(result).toHaveLength(2);
      const gold = result.find(r => r.levelName === 'Gold');
      expect(gold?.count).toBe(2);
      expect(gold?.totalLtv).toBe(300);
      expect(gold?.avgLtv).toBe(150);
      const noLevel = result.find(r => r.levelId === null);
      expect(noLevel?.levelName).toBe('No Level');
      expect(noLevel?.count).toBe(1);
    });

    it('should filter by siteId when provided', async () => {
      resolvableChain({ data: [], error: null });
      await analyticsService.getMembershipLevelBreakdown('site-123');
      expect(mockQueryChain.eq).toHaveBeenCalledWith('site_id', 'site-123');
    });
  });

  // ===========================================================================
  // getTopMembersByLtv
  // ===========================================================================

  describe('getTopMembersByLtv', () => {
    it('should return empty array when no members', async () => {
      resolvableChain({ data: null, error: null });
      const result = await analyticsService.getTopMembersByLtv();
      expect(result).toEqual([]);
    });

    it('should map member rows to TopMember objects', async () => {
      resolvableChain({
        data: [
          {
            id: 'mem-1',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com',
            lifetime_value: 1000,
            total_visits: 50,
            sites: { name: 'Main Gym' },
          },
        ],
        error: null,
      });

      const result = await analyticsService.getTopMembersByLtv(5);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'mem-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        lifetimeValue: 1000,
        totalVisits: 50,
        siteName: 'Main Gym',
      });
    });

    it('should use limit parameter', async () => {
      resolvableChain({ data: [], error: null });
      await analyticsService.getTopMembersByLtv(5);
      expect(mockQueryChain.limit).toHaveBeenCalledWith(5);
    });

    it('should order by lifetime_value descending', async () => {
      resolvableChain({ data: [], error: null });
      await analyticsService.getTopMembersByLtv();
      expect(mockQueryChain.order).toHaveBeenCalledWith('lifetime_value', { ascending: false });
    });

    it('should handle null site name', async () => {
      resolvableChain({
        data: [
          {
            id: 'mem-1',
            first_name: null,
            last_name: null,
            email: null,
            lifetime_value: 0,
            total_visits: 0,
            sites: null,
          },
        ],
        error: null,
      });

      const result = await analyticsService.getTopMembersByLtv();
      expect(result[0].siteName).toBe('Unknown');
      expect(result[0].lifetimeValue).toBe(0);
    });
  });

  // ===========================================================================
  // getEngagementTrends
  // ===========================================================================

  describe('getEngagementTrends', () => {
    it('should return filled date range when no data', async () => {
      resolvableSequence([
        { data: [], error: null },   // visits
        { data: [], error: null },   // transactions
      ]);

      const dateRange = {
        start: new Date('2025-06-01'),
        end: new Date('2025-06-02'),
      };
      const result = await analyticsService.getEngagementTrends(dateRange);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ date: '2025-06-01', visits: 0, transactions: 0 });
      expect(result[1]).toEqual({ date: '2025-06-02', visits: 0, transactions: 0 });
    });

    it('should merge visits and transactions by date', async () => {
      resolvableSequence([
        {
          data: [
            { visit_date: '2025-06-01' },
            { visit_date: '2025-06-01' },
          ],
          error: null,
        },
        {
          data: [
            { transaction_date: '2025-06-01T12:00:00' },
          ],
          error: null,
        },
      ]);

      const dateRange = {
        start: new Date('2025-06-01'),
        end: new Date('2025-06-01'),
      };
      const result = await analyticsService.getEngagementTrends(dateRange);
      expect(result).toHaveLength(1);
      expect(result[0].visits).toBe(2);
      expect(result[0].transactions).toBe(1);
    });

    it('should fill missing days with zeros', async () => {
      resolvableSequence([
        { data: [{ visit_date: '2025-06-03' }], error: null },
        { data: [], error: null },
      ]);

      const dateRange = {
        start: new Date('2025-06-01'),
        end: new Date('2025-06-03'),
      };
      const result = await analyticsService.getEngagementTrends(dateRange);
      expect(result).toHaveLength(3);
      expect(result[0].visits).toBe(0);
      expect(result[1].visits).toBe(0);
      expect(result[2].visits).toBe(1);
    });

    it('should filter by siteId when provided', async () => {
      resolvableSequence([
        { data: [], error: null },
        { data: [], error: null },
      ]);

      const dateRange = {
        start: new Date('2025-06-01'),
        end: new Date('2025-06-01'),
      };
      await analyticsService.getEngagementTrends(dateRange, 'site-123');
      expect(mockQueryChain.eq).toHaveBeenCalledWith('site_id', 'site-123');
    });
  });
});
