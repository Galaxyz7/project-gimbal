
import {
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  hardDeleteMember,
  searchMembers,
  findMemberByContact,
  getMemberTransactions,
  createTransaction,
  getLtvBreakdown,
  getMemberVisits,
  getVisitStats,
  getMemberConsent,
  canSendSms,
  canSendEmail,
  getAllTags,
} from '../memberService';
import { mockMemberRow, TEST_IDS } from '@/test/mocks/fixtures';

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
    upsert: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    range: vi.fn(),
    single: mockSingle,
    then: vi.fn(),
  };
  // Make chainable
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

describe('memberService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: resolve with empty result
    resolvableChain({ data: [], error: null });
  });

  // ---------------------------------------------------------------------------
  // getMembers
  // ---------------------------------------------------------------------------

  describe('getMembers', () => {
    it('should fetch members with default params', async () => {
      resolvableChain({ data: [mockMemberRow], error: null });
      const result = await getMembers();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(TEST_IDS.memberId);
      expect(result[0].firstName).toBe('John');
    });

    it('should filter by siteId', async () => {
      resolvableChain({ data: [], error: null });
      await getMembers({ siteId: TEST_IDS.siteId });
      expect(mockQueryChain.eq).toHaveBeenCalledWith('site_id', TEST_IDS.siteId);
    });

    it('should apply limit', async () => {
      resolvableChain({ data: [], error: null });
      await getMembers({ limit: 10 });
      expect(mockQueryChain.limit).toHaveBeenCalledWith(10);
    });

    it('should apply offset with range', async () => {
      resolvableChain({ data: [], error: null });
      await getMembers({ offset: 20, limit: 10 });
      expect(mockQueryChain.range).toHaveBeenCalledWith(20, 29);
    });

    it('should throw on error', async () => {
      resolvableChain({ data: null, error: { message: 'DB error', code: '500' } });
      await expect(getMembers()).rejects.toThrow('Failed to fetch members');
    });
  });

  // ---------------------------------------------------------------------------
  // getMemberById
  // ---------------------------------------------------------------------------

  describe('getMemberById', () => {
    it('should return member by id', async () => {
      mockSingle.mockResolvedValue({ data: mockMemberRow, error: null });
      const result = await getMemberById(TEST_IDS.memberId);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(TEST_IDS.memberId);
    });

    it('should return null for not found', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
      const result = await getMemberById('nonexistent');
      expect(result).toBeNull();
    });

    it('should throw on unexpected error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: '500', message: 'Server error' } });
      await expect(getMemberById('test')).rejects.toThrow('Failed to fetch member');
    });
  });

  // ---------------------------------------------------------------------------
  // createMember
  // ---------------------------------------------------------------------------

  describe('createMember', () => {
    it('should create a member', async () => {
      mockSingle.mockResolvedValue({ data: mockMemberRow, error: null });
      const result = await createMember({
        siteId: TEST_IDS.siteId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'John.Doe@Example.COM',
      });
      expect(result.id).toBe(TEST_IDS.memberId);
      // Check email is lowercased
      expect(mockQueryChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john.doe@example.com',
        })
      );
    });

    it('should throw if not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });
      await expect(createMember({ siteId: TEST_IDS.siteId })).rejects.toThrow('Not authenticated');
    });

    it('should throw on insert error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Insert failed' } });
      await expect(createMember({ siteId: TEST_IDS.siteId })).rejects.toThrow('Failed to create member');
    });
  });

  // ---------------------------------------------------------------------------
  // updateMember
  // ---------------------------------------------------------------------------

  describe('updateMember', () => {
    it('should update specified fields', async () => {
      mockSingle.mockResolvedValue({ data: { ...mockMemberRow, first_name: 'Jane' }, error: null });
      const result = await updateMember(TEST_IDS.memberId, { firstName: 'Jane' });
      expect(result.firstName).toBe('Jane');
    });

    it('should lowercase email on update', async () => {
      mockSingle.mockResolvedValue({ data: mockMemberRow, error: null });
      await updateMember(TEST_IDS.memberId, { email: '  TEST@EXAMPLE.COM  ' });
      expect(mockQueryChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // deleteMember / hardDeleteMember
  // ---------------------------------------------------------------------------

  describe('deleteMember', () => {
    it('should soft delete by setting is_active to false', async () => {
      resolvableChain({ data: null, error: null });
      await deleteMember(TEST_IDS.memberId);
      expect(mockQueryChain.update).toHaveBeenCalledWith({ is_active: false });
      expect(mockQueryChain.eq).toHaveBeenCalledWith('id', TEST_IDS.memberId);
    });
  });

  describe('hardDeleteMember', () => {
    it('should permanently delete', async () => {
      resolvableChain({ data: null, error: null });
      await hardDeleteMember(TEST_IDS.memberId);
      expect(mockQueryChain.delete).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // searchMembers
  // ---------------------------------------------------------------------------

  describe('searchMembers', () => {
    it('should call RPC with search params and return members with count', async () => {
      // Count query resolves via resolvableChain (supabase.from())
      resolvableChain({ data: null, error: null, count: 1 });
      // Data query resolves via mockRpc (supabase.rpc())
      mockRpc.mockResolvedValue({
        data: [{ id: TEST_IDS.memberId, first_name: 'John', last_name: 'Doe', email: 'john@example.com', phone: null, membership_status: 'active', membership_level_name: 'Gold', lifetime_value: 750, total_visits: 15, last_visit_at: null, site_name: 'Test Gym', created_at: '2025-01-01' }],
        error: null,
      });
      const result = await searchMembers({ searchTerm: 'John' });
      expect(result.members).toHaveLength(1);
      expect(result.members[0].firstName).toBe('John');
      expect(result.totalCount).toBe(1);
      expect(mockRpc).toHaveBeenCalledWith('search_members', expect.objectContaining({
        p_search_term: 'John',
      }));
    });

    it('should throw on RPC error', async () => {
      resolvableChain({ data: null, error: null, count: 0 });
      mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC error' } });
      await expect(searchMembers({})).rejects.toThrow('Failed to search members');
    });
  });

  // ---------------------------------------------------------------------------
  // findMemberByContact
  // ---------------------------------------------------------------------------

  describe('findMemberByContact', () => {
    it('should return null if no contact info provided', async () => {
      const result = await findMemberByContact(TEST_IDS.siteId);
      expect(result).toBeNull();
    });

    it('should search by email', async () => {
      mockSingle.mockResolvedValue({ data: mockMemberRow, error: null });
      const result = await findMemberByContact(TEST_IDS.siteId, 'test@example.com');
      expect(result).not.toBeNull();
      expect(mockQueryChain.eq).toHaveBeenCalledWith('email', 'test@example.com');
    });

    it('should use OR for multiple criteria', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      await findMemberByContact(TEST_IDS.siteId, 'test@example.com', '+12125551234');
      expect(mockQueryChain.or).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Transactions
  // ---------------------------------------------------------------------------

  describe('getMemberTransactions', () => {
    it('should fetch transactions for a member', async () => {
      const txRow = {
        id: TEST_IDS.transactionId,
        member_id: TEST_IDS.memberId,
        site_id: TEST_IDS.siteId,
        external_transaction_id: null,
        transaction_date: '2025-05-15',
        amount: 150,
        transaction_type: 'purchase',
        promo_code: null,
        campaign_id: null,
        description: 'Test',
        line_items: [],
        metadata: {},
        source_import_id: null,
        created_at: '2025-05-15T00:00:00Z',
        updated_at: '2025-05-15T00:00:00Z',
      };
      resolvableChain({ data: [txRow], error: null });
      const result = await getMemberTransactions(TEST_IDS.memberId);
      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(150);
    });
  });

  describe('createTransaction', () => {
    it('should create a transaction', async () => {
      const txRow = {
        id: TEST_IDS.transactionId,
        member_id: TEST_IDS.memberId,
        site_id: TEST_IDS.siteId,
        external_transaction_id: null,
        transaction_date: '2025-05-15',
        amount: 200,
        transaction_type: 'purchase',
        promo_code: null,
        campaign_id: null,
        description: null,
        line_items: [],
        metadata: {},
        source_import_id: null,
        created_at: '2025-05-15T00:00:00Z',
        updated_at: '2025-05-15T00:00:00Z',
      };
      mockSingle.mockResolvedValue({ data: txRow, error: null });
      const result = await createTransaction({
        memberId: TEST_IDS.memberId,
        siteId: TEST_IDS.siteId,
        transactionDate: '2025-05-15',
        amount: 200,
      });
      expect(result.amount).toBe(200);
    });
  });

  describe('getLtvBreakdown', () => {
    it('should call RPC and map results', async () => {
      mockRpc.mockResolvedValue({
        data: [{ transaction_type: 'purchase', total_amount: 750, transaction_count: 5, first_transaction: '2025-01-01', last_transaction: '2025-06-01' }],
        error: null,
      });
      const result = await getLtvBreakdown(TEST_IDS.memberId);
      expect(result).toHaveLength(1);
      expect(result[0].totalAmount).toBe(750);
    });
  });

  // ---------------------------------------------------------------------------
  // Visits
  // ---------------------------------------------------------------------------

  describe('getMemberVisits', () => {
    it('should fetch visits for a member', async () => {
      const visitRow = {
        id: TEST_IDS.visitId,
        member_id: TEST_IDS.memberId,
        site_id: TEST_IDS.siteId,
        visit_date: '2025-06-01',
        check_in_time: '10:00',
        check_out_time: '11:00',
        visit_type: 'regular',
        service_name: null,
        staff_member: null,
        notes: null,
        metadata: {},
        source_import_id: null,
        created_at: '2025-06-01T10:00:00Z',
      };
      resolvableChain({ data: [visitRow], error: null });
      const result = await getMemberVisits(TEST_IDS.memberId);
      expect(result).toHaveLength(1);
      expect(result[0].visitDate).toBe('2025-06-01');
    });
  });

  describe('getVisitStats', () => {
    it('should call RPC and map results', async () => {
      mockRpc.mockResolvedValue({
        data: [{ total_visits: 15, visits_this_month: 3, visits_last_month: 4, visits_this_year: 30, avg_visits_per_month: 5, first_visit: '2025-01-01', last_visit: '2025-06-01', most_common_visit_type: 'regular' }],
        error: null,
      });
      const result = await getVisitStats(TEST_IDS.memberId);
      expect(result).not.toBeNull();
      expect(result!.totalVisits).toBe(15);
    });

    it('should return null if no data', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });
      const result = await getVisitStats(TEST_IDS.memberId);
      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Consent
  // ---------------------------------------------------------------------------

  describe('getMemberConsent', () => {
    it('should return consent data', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: TEST_IDS.consentId,
          member_id: TEST_IDS.memberId,
          sms_consent: true,
          sms_consent_source: 'web_form',
          sms_consented_at: '2025-01-01T00:00:00Z',
          sms_consent_ip: null,
          sms_opt_out_at: null,
          sms_opt_out_reason: null,
          email_consent: true,
          email_consent_source: 'web_form',
          email_consented_at: '2025-01-01T00:00:00Z',
          email_unsubscribed_at: null,
          email_unsubscribe_reason: null,
          do_not_contact: false,
          preferred_channel: 'email',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
        error: null,
      });
      const result = await getMemberConsent(TEST_IDS.memberId);
      expect(result).not.toBeNull();
      expect(result!.smsConsent).toBe(true);
    });

    it('should return null for not found', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      const result = await getMemberConsent('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('canSendSms', () => {
    it('should return consent check result', async () => {
      mockRpc.mockResolvedValue({
        data: [{ can_send: true, reason: 'Consent granted' }],
        error: null,
      });
      const result = await canSendSms(TEST_IDS.memberId);
      expect(result.canSend).toBe(true);
    });
  });

  describe('canSendEmail', () => {
    it('should return consent check result', async () => {
      mockRpc.mockResolvedValue({
        data: [{ can_send: false, reason: 'Unsubscribed' }],
        error: null,
      });
      const result = await canSendEmail(TEST_IDS.memberId);
      expect(result.canSend).toBe(false);
      expect(result.reason).toBe('Unsubscribed');
    });
  });

  // ---------------------------------------------------------------------------
  // Tags
  // ---------------------------------------------------------------------------

  describe('getAllTags', () => {
    it('should collect unique tags from all members', async () => {
      resolvableChain({
        data: [
          { tags: ['vip', 'morning'] },
          { tags: ['vip', 'evening'] },
          { tags: ['new'] },
        ],
        error: null,
      });
      const result = await getAllTags();
      expect(result).toEqual(['evening', 'morning', 'new', 'vip']);
    });

    it('should return empty array on error', async () => {
      resolvableChain({ data: null, error: { message: 'Error' } });
      await expect(getAllTags()).rejects.toThrow('Failed to fetch tags');
    });
  });
});
