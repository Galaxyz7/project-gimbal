/**
 * Follow-up Members analytics test
 * Tests getFollowUpMembers query and engagement classification
 */

const { mockQueryChain } = vi.hoisted(() => {
  const mockQueryChain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    lt: vi.fn(),
    not: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  };

  // Make all methods chainable
  for (const key of Object.keys(mockQueryChain)) {
    mockQueryChain[key].mockReturnValue(mockQueryChain);
  }

  return { mockQueryChain };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockQueryChain),
  },
}));

import { analyticsService } from '../analyticsService';

// =============================================================================
// Helpers
// =============================================================================

function resolvableChain(result: { data: unknown; error?: unknown }) {
  Object.defineProperty(mockQueryChain, 'then', {
    value: vi.fn((resolve: (val: unknown) => void) => resolve(result)),
    writable: true,
    configurable: true,
  });
}

// =============================================================================
// Fixtures
// =============================================================================

const fortyDaysAgo = new Date();
fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);

const seventyDaysAgo = new Date();
seventyDaysAgo.setDate(seventyDaysAgo.getDate() - 70);

const mockMembersData = [
  {
    id: 'mem-1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    phone: '+15551234567',
    lifetime_value: 5000,
    last_visit_at: fortyDaysAgo.toISOString(),
    total_visits: 20,
    sites: { name: 'Downtown' },
  },
  {
    id: 'mem-2',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane@example.com',
    phone: '+15559876543',
    lifetime_value: 2000,
    last_visit_at: seventyDaysAgo.toISOString(),
    total_visits: 5,
    sites: { name: 'Uptown' },
  },
];

// =============================================================================
// Tests
// =============================================================================

describe('analyticsService.getFollowUpMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolvableChain({ data: mockMembersData });
  });

  it('should return follow-up members with transformed fields', async () => {
    const result = await analyticsService.getFollowUpMembers();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'mem-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+15551234567',
        lifetimeValue: 5000,
        siteName: 'Downtown',
      })
    );
  });

  it('should calculate daysSinceVisit correctly', async () => {
    const result = await analyticsService.getFollowUpMembers();

    // Allow 1 day tolerance for test timing
    expect(result[0].daysSinceVisit).toBeGreaterThanOrEqual(39);
    expect(result[0].daysSinceVisit).toBeLessThanOrEqual(41);

    expect(result[1].daysSinceVisit).toBeGreaterThanOrEqual(69);
    expect(result[1].daysSinceVisit).toBeLessThanOrEqual(71);
  });

  it('should classify engagement as warning (<=60 days) or danger (>60 days)', async () => {
    const result = await analyticsService.getFollowUpMembers();

    expect(result[0].engagement).toBe('warning'); // ~40 days
    expect(result[1].engagement).toBe('danger');  // ~70 days
  });

  it('should apply limit parameter', async () => {
    await analyticsService.getFollowUpMembers(10);
    expect(mockQueryChain.limit).toHaveBeenCalledWith(10);
  });

  it('should filter by siteId when provided', async () => {
    await analyticsService.getFollowUpMembers(5, 'site-001');
    expect(mockQueryChain.eq).toHaveBeenCalledWith('site_id', 'site-001');
  });

  it('should query active members with active status', async () => {
    await analyticsService.getFollowUpMembers();
    expect(mockQueryChain.eq).toHaveBeenCalledWith('is_active', true);
    expect(mockQueryChain.eq).toHaveBeenCalledWith('membership_status', 'active');
  });

  it('should order by lifetime_value descending', async () => {
    await analyticsService.getFollowUpMembers();
    expect(mockQueryChain.order).toHaveBeenCalledWith('lifetime_value', { ascending: false });
  });

  it('should return empty array when data is null', async () => {
    resolvableChain({ data: null });
    const result = await analyticsService.getFollowUpMembers();
    expect(result).toEqual([]);
  });

  it('should handle missing site name', async () => {
    resolvableChain({
      data: [{ ...mockMembersData[0], sites: null }],
    });

    const result = await analyticsService.getFollowUpMembers();
    expect(result[0].siteName).toBe('Unknown');
  });

  it('should handle missing lifetime_value', async () => {
    resolvableChain({
      data: [{ ...mockMembersData[0], lifetime_value: null }],
    });

    const result = await analyticsService.getFollowUpMembers();
    expect(result[0].lifetimeValue).toBe(0);
  });
});
