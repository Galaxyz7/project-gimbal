
import {
  getCampaignTimeline,
  getCampaignFunnel,
  getTopEngagedRecipients,
  getCampaignErrorSummary,
  getCampaignMessagesForExport,
} from '../campaignReportService';

// =============================================================================
// Mock Supabase
// =============================================================================

const { mockRpc, mockSingle, mockQueryChain } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockRpc = vi.fn();
  const mockQueryChain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
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
  return { mockRpc, mockSingle, mockQueryChain };
});

const resolvableChain = (result: { data: unknown; error: unknown }) => {
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

describe('campaignReportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolvableChain({ data: [], error: null });
  });

  // ---------------------------------------------------------------------------
  // getCampaignTimeline
  // ---------------------------------------------------------------------------

  describe('getCampaignTimeline', () => {
    it('should fetch timeline data via RPC', async () => {
      const mockRows = [
        {
          time_bucket: '2025-01-15T10:00:00Z',
          sent: 50,
          delivered: 45,
          opened: 20,
          clicked: 5,
          failed: 3,
          bounced: 2,
        },
        {
          time_bucket: '2025-01-15T11:00:00Z',
          sent: 30,
          delivered: 28,
          opened: 10,
          clicked: 2,
          failed: 1,
          bounced: 1,
        },
      ];
      mockRpc.mockResolvedValue({ data: mockRows, error: null });

      const result = await getCampaignTimeline('campaign-1');

      expect(mockRpc).toHaveBeenCalledWith('get_campaign_timeline', {
        p_campaign_id: 'campaign-1',
        p_interval: 'hour',
      });
      expect(result).toHaveLength(2);
      expect(result[0].timeBucket).toBe('2025-01-15T10:00:00Z');
      expect(result[0].delivered).toBe(45);
      expect(result[0].failed).toBe(3);
    });

    it('should accept day interval', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      await getCampaignTimeline('campaign-1', 'day');

      expect(mockRpc).toHaveBeenCalledWith('get_campaign_timeline', {
        p_campaign_id: 'campaign-1',
        p_interval: 'day',
      });
    });

    it('should return empty array when no data', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      const result = await getCampaignTimeline('campaign-1');
      expect(result).toEqual([]);
    });

    it('should throw on error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });

      await expect(getCampaignTimeline('campaign-1')).rejects.toThrow(
        'Failed to fetch campaign timeline',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getCampaignFunnel
  // ---------------------------------------------------------------------------

  describe('getCampaignFunnel', () => {
    it('should fetch funnel data via RPC', async () => {
      const mockRows = [
        { stage: 'queued', count: 100, rate: 100.0 },
        { stage: 'sent', count: 95, rate: 95.0 },
        { stage: 'delivered', count: 90, rate: 90.0 },
        { stage: 'opened', count: 40, rate: 40.0 },
        { stage: 'clicked', count: 10, rate: 10.0 },
      ];
      mockRpc.mockResolvedValue({ data: mockRows, error: null });

      const result = await getCampaignFunnel('campaign-1');

      expect(mockRpc).toHaveBeenCalledWith('get_campaign_funnel', {
        p_campaign_id: 'campaign-1',
      });
      expect(result).toHaveLength(5);
      expect(result[0].stage).toBe('queued');
      expect(result[0].count).toBe(100);
      expect(result[0].rate).toBe(100.0);
      expect(result[4].stage).toBe('clicked');
      expect(result[4].rate).toBe(10.0);
    });

    it('should return empty array when no data', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      const result = await getCampaignFunnel('campaign-1');
      expect(result).toEqual([]);
    });

    it('should throw on error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });

      await expect(getCampaignFunnel('campaign-1')).rejects.toThrow(
        'Failed to fetch campaign funnel',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getTopEngagedRecipients
  // ---------------------------------------------------------------------------

  describe('getTopEngagedRecipients', () => {
    it('should fetch engaged recipients', async () => {
      const mockRows = [
        {
          member_id: 'member-1',
          status: 'clicked',
          opened_at: '2025-01-15T10:00:00Z',
          clicked_at: '2025-01-15T10:01:00Z',
          members: { id: 'member-1', first_name: 'John', last_name: 'Doe', email: 'john@test.com', phone: null },
        },
        {
          member_id: 'member-2',
          status: 'opened',
          opened_at: '2025-01-15T10:05:00Z',
          clicked_at: null,
          members: { id: 'member-2', first_name: 'Jane', last_name: 'Smith', email: 'jane@test.com', phone: null },
        },
      ];
      resolvableChain({ data: mockRows, error: null });

      const result = await getTopEngagedRecipients('campaign-1', 10);

      expect(result).toHaveLength(2);
      expect(result[0].memberId).toBe('member-1');
      expect(result[0].firstName).toBe('John');
      expect(result[0].status).toBe('clicked');
      expect(result[0].clickedAt).toBe('2025-01-15T10:01:00Z');
      expect(result[1].memberId).toBe('member-2');
      expect(result[1].status).toBe('opened');
    });

    it('should handle array member join format', async () => {
      const mockRows = [
        {
          member_id: 'member-1',
          status: 'opened',
          opened_at: '2025-01-15T10:00:00Z',
          clicked_at: null,
          members: [{ id: 'member-1', first_name: 'Alice', last_name: 'Wong', email: 'alice@test.com', phone: null }],
        },
      ];
      resolvableChain({ data: mockRows, error: null });

      const result = await getTopEngagedRecipients('campaign-1');
      expect(result[0].firstName).toBe('Alice');
    });

    it('should return empty array when no data', async () => {
      resolvableChain({ data: [], error: null });

      const result = await getTopEngagedRecipients('campaign-1');
      expect(result).toEqual([]);
    });

    it('should throw on error', async () => {
      resolvableChain({ data: null, error: { message: 'DB error' } });

      await expect(getTopEngagedRecipients('campaign-1')).rejects.toThrow(
        'Failed to fetch top engaged recipients',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getCampaignErrorSummary
  // ---------------------------------------------------------------------------

  describe('getCampaignErrorSummary', () => {
    it('should group errors by message', async () => {
      const mockRows = [
        { error_message: 'Invalid phone number', failed_at: '2025-01-15T10:00:00Z', status: 'failed' },
        { error_message: 'Invalid phone number', failed_at: '2025-01-15T10:01:00Z', status: 'failed' },
        { error_message: 'Rate limit exceeded', failed_at: '2025-01-15T10:02:00Z', status: 'failed' },
      ];
      resolvableChain({ data: mockRows, error: null });

      const result = await getCampaignErrorSummary('campaign-1');

      expect(result).toHaveLength(2);
      expect(result[0].errorMessage).toBe('Invalid phone number');
      expect(result[0].count).toBe(2);
      expect(result[0].lastOccurred).toBe('2025-01-15T10:01:00Z');
      expect(result[1].errorMessage).toBe('Rate limit exceeded');
      expect(result[1].count).toBe(1);
    });

    it('should handle null error messages', async () => {
      const mockRows = [
        { error_message: null, failed_at: '2025-01-15T10:00:00Z', status: 'failed' },
      ];
      resolvableChain({ data: mockRows, error: null });

      const result = await getCampaignErrorSummary('campaign-1');
      expect(result[0].errorMessage).toBe('Unknown error');
    });

    it('should return empty array when no errors', async () => {
      resolvableChain({ data: [], error: null });

      const result = await getCampaignErrorSummary('campaign-1');
      expect(result).toEqual([]);
    });

    it('should sort by count descending', async () => {
      const mockRows = [
        { error_message: 'Error A', failed_at: '2025-01-15T10:00:00Z', status: 'failed' },
        { error_message: 'Error B', failed_at: '2025-01-15T10:01:00Z', status: 'failed' },
        { error_message: 'Error B', failed_at: '2025-01-15T10:02:00Z', status: 'failed' },
        { error_message: 'Error B', failed_at: '2025-01-15T10:03:00Z', status: 'failed' },
      ];
      resolvableChain({ data: mockRows, error: null });

      const result = await getCampaignErrorSummary('campaign-1');
      expect(result[0].errorMessage).toBe('Error B');
      expect(result[0].count).toBe(3);
      expect(result[1].errorMessage).toBe('Error A');
      expect(result[1].count).toBe(1);
    });

    it('should throw on error', async () => {
      resolvableChain({ data: null, error: { message: 'DB error' } });

      await expect(getCampaignErrorSummary('campaign-1')).rejects.toThrow(
        'Failed to fetch campaign error summary',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getCampaignMessagesForExport
  // ---------------------------------------------------------------------------

  describe('getCampaignMessagesForExport', () => {
    it('should fetch and transform messages for export', async () => {
      const mockRows = [
        {
          status: 'delivered',
          recipient_address: 'john@test.com',
          queued_at: '2025-01-15T09:00:00Z',
          sent_at: '2025-01-15T09:01:00Z',
          delivered_at: '2025-01-15T09:02:00Z',
          opened_at: null,
          clicked_at: null,
          failed_at: null,
          error_message: null,
          members: { first_name: 'John', last_name: 'Doe' },
        },
      ];
      resolvableChain({ data: mockRows, error: null });

      const result = await getCampaignMessagesForExport('campaign-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        first_name: 'John',
        last_name: 'Doe',
        recipient: 'john@test.com',
        status: 'delivered',
        queued_at: '2025-01-15T09:00:00Z',
        sent_at: '2025-01-15T09:01:00Z',
        delivered_at: '2025-01-15T09:02:00Z',
        opened_at: '',
        clicked_at: '',
        failed_at: '',
        error_message: '',
      });
    });

    it('should return empty array when no data', async () => {
      resolvableChain({ data: [], error: null });

      const result = await getCampaignMessagesForExport('campaign-1');
      expect(result).toEqual([]);
    });

    it('should throw on error', async () => {
      resolvableChain({ data: null, error: { message: 'DB error' } });

      await expect(getCampaignMessagesForExport('campaign-1')).rejects.toThrow(
        'Failed to fetch messages for export',
      );
    });
  });
});
