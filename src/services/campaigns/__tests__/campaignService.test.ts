
import {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignRecipients,
  getCampaignMetrics,
  scheduleCampaign,
  cancelCampaign,
  queueCampaignMessages,
} from '../campaignService';
import { mockCampaignRow, TEST_IDS } from '@/test/mocks/fixtures';

// =============================================================================
// Mock Supabase
// =============================================================================

const { mockSingle, mockQueryChain, mockRpc } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockQueryChain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    ilike: vi.fn(),
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
  return { mockSingle, mockQueryChain, mockRpc };
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
  },
}));

// =============================================================================
// Tests
// =============================================================================

describe('campaignService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolvableChain({ data: [], error: null, count: 0 });
  });

  describe('getCampaigns', () => {
    it('should fetch campaigns with total count', async () => {
      resolvableChain({ data: [mockCampaignRow], error: null, count: 1 });
      const result = await getCampaigns();
      expect(result.campaigns).toHaveLength(1);
      expect(result.campaigns[0].name).toBe('Summer Sale');
      expect(result.totalCount).toBe(1);
    });

    it('should filter by status', async () => {
      resolvableChain({ data: [], error: null, count: 0 });
      await getCampaigns({ status: 'draft' });
      expect(mockQueryChain.eq).toHaveBeenCalledWith('status', 'draft');
    });

    it('should filter by campaign type', async () => {
      resolvableChain({ data: [], error: null, count: 0 });
      await getCampaigns({ campaignType: 'email' });
      expect(mockQueryChain.eq).toHaveBeenCalledWith('campaign_type', 'email');
    });

    it('should search by name', async () => {
      resolvableChain({ data: [], error: null, count: 0 });
      await getCampaigns({ searchTerm: 'summer' });
      expect(mockQueryChain.ilike).toHaveBeenCalledWith('name', '%summer%');
    });

    it('should throw on error', async () => {
      resolvableChain({ data: null, error: { message: 'DB error' } });
      await expect(getCampaigns()).rejects.toThrow('Failed to fetch campaigns');
    });
  });

  describe('getCampaignById', () => {
    it('should return campaign', async () => {
      mockSingle.mockResolvedValue({ data: mockCampaignRow, error: null });
      const result = await getCampaignById(TEST_IDS.campaignId);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Summer Sale');
    });

    it('should return null for not found', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      const result = await getCampaignById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('createCampaign', () => {
    it('should create a campaign', async () => {
      mockSingle.mockResolvedValue({ data: mockCampaignRow, error: null });
      const result = await createCampaign({
        name: 'Summer Sale',
        campaignType: 'email',
        content: '<h1>Sale</h1>',
      });
      expect(result.name).toBe('Summer Sale');
    });

    it('should throw on error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Insert failed' } });
      await expect(createCampaign({
        name: 'Test',
        campaignType: 'sms',
        content: 'Hello',
      })).rejects.toThrow('Failed to create campaign');
    });
  });

  describe('updateCampaign', () => {
    it('should update campaign fields', async () => {
      mockSingle.mockResolvedValue({ data: { ...mockCampaignRow, name: 'Winter Sale' }, error: null });
      const result = await updateCampaign(TEST_IDS.campaignId, { name: 'Winter Sale' });
      expect(result.name).toBe('Winter Sale');
    });
  });

  describe('deleteCampaign', () => {
    it('should delete a campaign', async () => {
      resolvableChain({ data: null, error: null });
      await deleteCampaign(TEST_IDS.campaignId);
      expect(mockQueryChain.delete).toHaveBeenCalled();
      expect(mockQueryChain.eq).toHaveBeenCalledWith('id', TEST_IDS.campaignId);
    });
  });

  describe('getCampaignRecipients', () => {
    it('should call RPC and map results', async () => {
      mockRpc.mockResolvedValue({
        data: [{ member_id: TEST_IDS.memberId, first_name: 'John', last_name: 'Doe', email: 'john@example.com', phone: null, site_id: TEST_IDS.siteId, site_timezone: 'America/New_York' }],
        error: null,
      });
      const result = await getCampaignRecipients(TEST_IDS.campaignId);
      expect(result).toHaveLength(1);
      expect(result[0].memberId).toBe(TEST_IDS.memberId);
    });
  });

  describe('getCampaignMetrics', () => {
    it('should return metrics', async () => {
      mockRpc.mockResolvedValue({
        data: [{ total_recipients: 100, total_sent: 95, total_delivered: 90, total_failed: 5, total_opened: 50, total_clicked: 20, total_bounced: 3, delivery_rate: 0.95, open_rate: 0.55, click_rate: 0.22, bounce_rate: 0.03 }],
        error: null,
      });
      const result = await getCampaignMetrics(TEST_IDS.campaignId);
      expect(result).not.toBeNull();
      expect(result!.totalSent).toBe(95);
      expect(result!.openRate).toBe(0.55);
    });

    it('should return null if no data', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });
      const result = await getCampaignMetrics(TEST_IDS.campaignId);
      expect(result).toBeNull();
    });
  });

  describe('scheduleCampaign', () => {
    it('should set status to scheduled', async () => {
      mockSingle.mockResolvedValue({ data: { ...mockCampaignRow, status: 'scheduled', scheduled_at: '2025-07-01T10:00:00Z' }, error: null });
      const result = await scheduleCampaign(TEST_IDS.campaignId, '2025-07-01T10:00:00Z');
      expect(result.status).toBe('scheduled');
    });
  });

  describe('cancelCampaign', () => {
    it('should set status to cancelled', async () => {
      mockSingle.mockResolvedValue({ data: { ...mockCampaignRow, status: 'cancelled' }, error: null });
      const result = await cancelCampaign(TEST_IDS.campaignId);
      expect(result.status).toBe('cancelled');
    });
  });

  describe('queueCampaignMessages', () => {
    it('should return count of queued messages', async () => {
      mockRpc.mockResolvedValue({ data: 50, error: null });
      const result = await queueCampaignMessages(TEST_IDS.campaignId);
      expect(result).toBe(50);
    });
  });
});
