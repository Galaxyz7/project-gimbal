
import {
  getSites,
  getSiteById,
  createSite,
  updateSite,
  deleteSite,
  hardDeleteSite,
  getSiteHierarchy,
  getChildSiteIds,
  getMembershipLevels,
  getMembershipLevelById,
  createMembershipLevel,
  deleteMembershipLevel,
} from '../siteService';
import { mockSiteRow, TEST_IDS } from '@/test/mocks/fixtures';

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
    in: vi.fn(),
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
  const mockRpc = vi.fn();
  const mockGetUser = vi.fn().mockResolvedValue({
    data: { user: { id: 'user-1', email: 'admin@gimbal.test' } },
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

describe('siteService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolvableChain({ data: [], error: null });
  });

  // ---------------------------------------------------------------------------
  // Site CRUD
  // ---------------------------------------------------------------------------

  describe('getSites', () => {
    it('should fetch all sites', async () => {
      resolvableChain({ data: [mockSiteRow], error: null });
      const result = await getSites();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Gym');
    });

    it('should throw on error', async () => {
      resolvableChain({ data: null, error: { message: 'DB error' } });
      await expect(getSites()).rejects.toThrow('Failed to fetch sites');
    });
  });

  describe('getSiteById', () => {
    it('should return site by id', async () => {
      mockSingle.mockResolvedValue({ data: mockSiteRow, error: null });
      const result = await getSiteById(TEST_IDS.siteId);
      expect(result).not.toBeNull();
      expect(result!.code).toBe('TEST-GYM');
    });

    it('should return null for not found', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      const result = await getSiteById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('createSite', () => {
    it('should create a site', async () => {
      mockSingle.mockResolvedValue({ data: mockSiteRow, error: null });
      const result = await createSite({ name: 'Test Gym', code: 'TEST-GYM' });
      expect(result.name).toBe('Test Gym');
      expect(mockQueryChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Test Gym', code: 'TEST-GYM' })
      );
    });

    it('should throw if not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });
      await expect(createSite({ name: 'Test', code: 'T' })).rejects.toThrow('Not authenticated');
    });
  });

  describe('updateSite', () => {
    it('should update a site', async () => {
      mockSingle.mockResolvedValue({ data: { ...mockSiteRow, name: 'Updated Gym' }, error: null });
      const result = await updateSite(TEST_IDS.siteId, { name: 'Updated Gym' });
      expect(result.name).toBe('Updated Gym');
    });
  });

  describe('deleteSite', () => {
    it('should soft delete', async () => {
      resolvableChain({ data: null, error: null });
      await deleteSite(TEST_IDS.siteId);
      expect(mockQueryChain.update).toHaveBeenCalledWith({ is_active: false });
    });
  });

  describe('hardDeleteSite', () => {
    it('should permanently delete', async () => {
      resolvableChain({ data: null, error: null });
      await hardDeleteSite(TEST_IDS.siteId);
      expect(mockQueryChain.delete).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Hierarchy
  // ---------------------------------------------------------------------------

  describe('getSiteHierarchy', () => {
    it('should build hierarchy from flat sites', async () => {
      const parentRow = { ...mockSiteRow, id: 'parent-1', parent_site_id: null, site_level: 'company' };
      const childRow = { ...mockSiteRow, id: 'child-1', parent_site_id: 'parent-1', site_level: 'site' };
      resolvableChain({ data: [parentRow, childRow], error: null });
      const result = await getSiteHierarchy();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('parent-1');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children![0].id).toBe('child-1');
    });
  });

  describe('getChildSiteIds', () => {
    it('should return child site IDs', async () => {
      mockRpc.mockResolvedValue({ data: [{ id: 'child-1' }, { id: 'child-2' }], error: null });
      const result = await getChildSiteIds(TEST_IDS.siteId);
      expect(result).toEqual(['child-1', 'child-2']);
    });
  });

  // ---------------------------------------------------------------------------
  // Membership Levels
  // ---------------------------------------------------------------------------

  describe('getMembershipLevels', () => {
    it('should fetch levels for a site', async () => {
      const levelRow = {
        id: TEST_IDS.membershipLevelId,
        site_id: TEST_IDS.siteId,
        name: 'Gold',
        code: 'GOLD',
        display_order: 2,
        benefits: { discount: 10 },
        min_lifetime_value: 500,
        min_visit_count: 20,
        is_active: true,
        created_at: '2025-01-01T00:00:00Z',
      };
      resolvableChain({ data: [levelRow], error: null });
      const result = await getMembershipLevels(TEST_IDS.siteId);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Gold');
    });
  });

  describe('getMembershipLevelById', () => {
    it('should return null for not found', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      const result = await getMembershipLevelById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('createMembershipLevel', () => {
    it('should create a membership level', async () => {
      const levelRow = {
        id: TEST_IDS.membershipLevelId,
        site_id: TEST_IDS.siteId,
        name: 'Platinum',
        code: 'PLAT',
        display_order: 3,
        benefits: {},
        min_lifetime_value: null,
        min_visit_count: null,
        is_active: true,
        created_at: '2025-01-01T00:00:00Z',
      };
      mockSingle.mockResolvedValue({ data: levelRow, error: null });
      const result = await createMembershipLevel({
        siteId: TEST_IDS.siteId,
        name: 'Platinum',
        code: 'PLAT',
      });
      expect(result.name).toBe('Platinum');
    });
  });

  describe('deleteMembershipLevel', () => {
    it('should soft delete', async () => {
      resolvableChain({ data: null, error: null });
      await deleteMembershipLevel(TEST_IDS.membershipLevelId);
      expect(mockQueryChain.update).toHaveBeenCalledWith({ is_active: false });
    });
  });
});
