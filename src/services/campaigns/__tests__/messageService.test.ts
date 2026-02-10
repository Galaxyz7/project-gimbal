
import {
  getCampaignMessages,
  getMessageById,
  getMessageByExternalId,
  getMessageCountsByStatus,
  updateMessageStatus,
  updateMessageByExternalId,
  markMessageOpened,
  markMessageClicked,
} from '../messageService';

// =============================================================================
// Mock Supabase
// =============================================================================

const { mockSingle, mockQueryChain } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockQueryChain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
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
  return { mockSingle, mockQueryChain };
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
  },
}));

// =============================================================================
// Mock Data
// =============================================================================

const mockMessageRow = {
  id: 'msg-1',
  campaign_id: 'camp-1',
  member_id: 'member-1',
  channel: 'email',
  recipient_address: 'test@example.com',
  status: 'queued',
  queued_at: '2025-01-01T00:00:00Z',
  sent_at: null,
  delivered_at: null,
  opened_at: null,
  clicked_at: null,
  failed_at: null,
  external_id: null,
  provider_status: null,
  error_message: null,
  device_type: null,
  user_agent: null,
  metadata: {},
  members: {
    id: 'member-1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'test@example.com',
    phone: '+15551234567',
  },
};

const mockMessageRowWithoutMembers = {
  ...mockMessageRow,
  members: undefined,
};

// =============================================================================
// Tests
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(mockQueryChain)) {
    if (key !== 'single' && key !== 'then') {
      mockQueryChain[key].mockReturnValue(mockQueryChain);
    }
  }
});

// -----------------------------------------------------------------------------
// getCampaignMessages
// -----------------------------------------------------------------------------

describe('getCampaignMessages', () => {
  it('should fetch messages for a campaign', async () => {
    resolvableChain({ data: [mockMessageRow], error: null });

    const result = await getCampaignMessages('camp-1');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('msg-1');
    expect(result[0].campaignId).toBe('camp-1');
    expect(result[0].member.firstName).toBe('John');
    expect(result[0].member.lastName).toBe('Doe');
  });

  it('should filter by status when provided', async () => {
    resolvableChain({ data: [mockMessageRow], error: null });

    await getCampaignMessages('camp-1', { status: 'queued' });

    // eq is called twice: once for campaign_id, once for status
    expect(mockQueryChain.eq).toHaveBeenCalledWith('campaign_id', 'camp-1');
    expect(mockQueryChain.eq).toHaveBeenCalledWith('status', 'queued');
  });

  it('should apply limit when provided', async () => {
    resolvableChain({ data: [], error: null });

    await getCampaignMessages('camp-1', { limit: 10 });

    expect(mockQueryChain.limit).toHaveBeenCalledWith(10);
  });

  it('should apply pagination with offset and limit', async () => {
    resolvableChain({ data: [], error: null });

    await getCampaignMessages('camp-1', { offset: 20, limit: 10 });

    expect(mockQueryChain.range).toHaveBeenCalledWith(20, 29);
  });

  it('should throw on error', async () => {
    resolvableChain({ data: null, error: { message: 'DB error' } });

    await expect(getCampaignMessages('camp-1')).rejects.toThrow('Failed to fetch campaign messages');
  });
});

// -----------------------------------------------------------------------------
// getMessageById
// -----------------------------------------------------------------------------

describe('getMessageById', () => {
  it('should return a message when found', async () => {
    mockSingle.mockResolvedValue({ data: mockMessageRow, error: null });

    const result = await getMessageById('msg-1');

    expect(result).not.toBeNull();
    expect(result!.id).toBe('msg-1');
    expect(result!.member.firstName).toBe('John');
    expect(result!.member.phone).toBe('+15551234567');
  });

  it('should return null when not found (PGRST116)', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'not found' } });

    const result = await getMessageById('nonexistent');

    expect(result).toBeNull();
  });

  it('should throw on other errors', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { code: 'OTHER', message: 'Server error' } });

    await expect(getMessageById('msg-1')).rejects.toThrow('Failed to fetch message');
  });
});

// -----------------------------------------------------------------------------
// getMessageByExternalId
// -----------------------------------------------------------------------------

describe('getMessageByExternalId', () => {
  it('should return a message when found by external ID', async () => {
    const rowWithExternalId = { ...mockMessageRow, external_id: 'ext-123', members: undefined };
    mockSingle.mockResolvedValue({ data: rowWithExternalId, error: null });

    const result = await getMessageByExternalId('ext-123');

    expect(result).not.toBeNull();
    expect(result!.id).toBe('msg-1');
    expect(result!.externalId).toBe('ext-123');
    // getMessageByExternalId uses transformMessage (no member join)
    expect(result).not.toHaveProperty('member');
  });

  it('should return null when not found (PGRST116)', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'not found' } });

    const result = await getMessageByExternalId('nonexistent');

    expect(result).toBeNull();
  });
});

// -----------------------------------------------------------------------------
// getMessageCountsByStatus
// -----------------------------------------------------------------------------

describe('getMessageCountsByStatus', () => {
  it('should count messages by status', async () => {
    const statusData = [
      { status: 'queued' },
      { status: 'queued' },
      { status: 'sent' },
      { status: 'delivered' },
      { status: 'delivered' },
      { status: 'delivered' },
      { status: 'opened' },
      { status: 'failed' },
    ];
    resolvableChain({ data: statusData, error: null });

    const result = await getMessageCountsByStatus('camp-1');

    expect(result.queued).toBe(2);
    expect(result.sent).toBe(1);
    expect(result.delivered).toBe(3);
    expect(result.opened).toBe(1);
    expect(result.clicked).toBe(0);
    expect(result.bounced).toBe(0);
    expect(result.failed).toBe(1);
  });

  it('should return all zeros for empty data', async () => {
    resolvableChain({ data: [], error: null });

    const result = await getMessageCountsByStatus('camp-1');

    expect(result.queued).toBe(0);
    expect(result.sent).toBe(0);
    expect(result.delivered).toBe(0);
    expect(result.opened).toBe(0);
    expect(result.clicked).toBe(0);
    expect(result.bounced).toBe(0);
    expect(result.failed).toBe(0);
  });
});

// -----------------------------------------------------------------------------
// updateMessageStatus
// -----------------------------------------------------------------------------

describe('updateMessageStatus', () => {
  it('should update status to sent with sent_at timestamp', async () => {
    const updatedRow = { ...mockMessageRow, status: 'sent', sent_at: '2025-01-01T01:00:00Z' };
    mockSingle.mockResolvedValue({ data: updatedRow, error: null });

    const result = await updateMessageStatus('msg-1', 'sent');

    expect(result.status).toBe('sent');
    expect(mockQueryChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'sent', sent_at: expect.any(String) }),
    );
  });

  it('should update status to delivered with delivered_at timestamp', async () => {
    const updatedRow = { ...mockMessageRow, status: 'delivered', delivered_at: '2025-01-01T01:00:00Z' };
    mockSingle.mockResolvedValue({ data: updatedRow, error: null });

    const result = await updateMessageStatus('msg-1', 'delivered');

    expect(result.status).toBe('delivered');
    expect(mockQueryChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'delivered', delivered_at: expect.any(String) }),
    );
  });

  it('should update status to opened with opened_at timestamp', async () => {
    const updatedRow = { ...mockMessageRow, status: 'opened', opened_at: '2025-01-01T01:00:00Z' };
    mockSingle.mockResolvedValue({ data: updatedRow, error: null });

    const result = await updateMessageStatus('msg-1', 'opened');

    expect(result.status).toBe('opened');
    expect(mockQueryChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'opened', opened_at: expect.any(String) }),
    );
  });

  it('should update status to clicked with clicked_at timestamp', async () => {
    const updatedRow = { ...mockMessageRow, status: 'clicked', clicked_at: '2025-01-01T01:00:00Z' };
    mockSingle.mockResolvedValue({ data: updatedRow, error: null });

    const result = await updateMessageStatus('msg-1', 'clicked');

    expect(result.status).toBe('clicked');
    expect(mockQueryChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'clicked', clicked_at: expect.any(String) }),
    );
  });

  it('should update status to failed with failed_at timestamp', async () => {
    const updatedRow = { ...mockMessageRow, status: 'failed', failed_at: '2025-01-01T01:00:00Z' };
    mockSingle.mockResolvedValue({ data: updatedRow, error: null });

    const result = await updateMessageStatus('msg-1', 'failed');

    expect(result.status).toBe('failed');
    expect(mockQueryChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', failed_at: expect.any(String) }),
    );
  });

  it('should update status to bounced with failed_at timestamp', async () => {
    const updatedRow = { ...mockMessageRow, status: 'bounced', failed_at: '2025-01-01T01:00:00Z' };
    mockSingle.mockResolvedValue({ data: updatedRow, error: null });

    const result = await updateMessageStatus('msg-1', 'bounced');

    expect(result.status).toBe('bounced');
    expect(mockQueryChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'bounced', failed_at: expect.any(String) }),
    );
  });

  it('should include metadata fields when provided', async () => {
    const updatedRow = {
      ...mockMessageRow,
      status: 'sent',
      sent_at: '2025-01-01T01:00:00Z',
      external_id: 'ext-456',
      provider_status: 'accepted',
    };
    mockSingle.mockResolvedValue({ data: updatedRow, error: null });

    const result = await updateMessageStatus('msg-1', 'sent', {
      externalId: 'ext-456',
      providerStatus: 'accepted',
      errorMessage: 'some error',
    });

    expect(result.externalId).toBe('ext-456');
    expect(mockQueryChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'sent',
        external_id: 'ext-456',
        provider_status: 'accepted',
        error_message: 'some error',
      }),
    );
  });

  it('should throw on update error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Update failed' } });

    await expect(updateMessageStatus('msg-1', 'sent')).rejects.toThrow('Failed to update message status');
  });
});

// -----------------------------------------------------------------------------
// updateMessageByExternalId
// -----------------------------------------------------------------------------

describe('updateMessageByExternalId', () => {
  it('should update a message found by external ID', async () => {
    const rowWithExternalId = { ...mockMessageRow, external_id: 'ext-123' };
    // First call: getMessageByExternalId -> single()
    // Second call: updateMessageStatus -> single()
    const updatedRow = { ...rowWithExternalId, status: 'delivered', delivered_at: '2025-01-01T02:00:00Z' };
    mockSingle
      .mockResolvedValueOnce({ data: rowWithExternalId, error: null })
      .mockResolvedValueOnce({ data: updatedRow, error: null });

    const result = await updateMessageByExternalId('ext-123', 'delivered');

    expect(result).not.toBeNull();
    expect(result!.status).toBe('delivered');
  });

  it('should return null when external ID is not found', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116', message: 'not found' } });

    const result = await updateMessageByExternalId('nonexistent', 'delivered');

    expect(result).toBeNull();
  });
});

// -----------------------------------------------------------------------------
// markMessageOpened
// -----------------------------------------------------------------------------

describe('markMessageOpened', () => {
  it('should mark a message as opened', async () => {
    // First call: getMessageById -> single() returns queued message
    mockSingle.mockResolvedValueOnce({ data: mockMessageRow, error: null });
    // Second call: updateMessageStatus -> single() returns updated message
    const openedRow = { ...mockMessageRow, status: 'opened', opened_at: '2025-01-01T02:00:00Z' };
    mockSingle.mockResolvedValueOnce({ data: openedRow, error: null });

    const result = await markMessageOpened('msg-1');

    expect(result.status).toBe('opened');
  });

  it('should return existing message if already opened', async () => {
    const alreadyOpenedRow = { ...mockMessageRow, status: 'opened', opened_at: '2025-01-01T01:00:00Z' };
    mockSingle.mockResolvedValueOnce({ data: alreadyOpenedRow, error: null });

    const result = await markMessageOpened('msg-1');

    // Should return the transformed message without calling updateMessageStatus
    expect(result.openedAt).toBe('2025-01-01T01:00:00Z');
    // single() should only have been called once (for getMessageById)
    expect(mockSingle).toHaveBeenCalledTimes(1);
  });

  it('should throw when message is not found', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116', message: 'not found' } });

    await expect(markMessageOpened('nonexistent')).rejects.toThrow('Message not found');
  });
});

// -----------------------------------------------------------------------------
// markMessageClicked
// -----------------------------------------------------------------------------

describe('markMessageClicked', () => {
  it('should mark a message as clicked and set opened_at if not already opened', async () => {
    // getMessageById returns a delivered (not yet opened) message
    const deliveredRow = { ...mockMessageRow, status: 'delivered', delivered_at: '2025-01-01T01:00:00Z' };
    mockSingle.mockResolvedValueOnce({ data: deliveredRow, error: null });

    // update call returns clicked message
    const clickedRow = {
      ...mockMessageRow,
      status: 'clicked',
      clicked_at: '2025-01-01T02:00:00Z',
      opened_at: '2025-01-01T02:00:00Z',
    };
    mockSingle.mockResolvedValueOnce({ data: clickedRow, error: null });

    const result = await markMessageClicked('msg-1');

    expect(result.status).toBe('clicked');
    // The update should include both clicked_at and opened_at
    expect(mockQueryChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'clicked',
        clicked_at: expect.any(String),
        opened_at: expect.any(String),
      }),
    );
  });

  it('should mark as clicked without setting opened_at if already opened', async () => {
    const openedRow = {
      ...mockMessageRow,
      status: 'opened',
      opened_at: '2025-01-01T01:00:00Z',
    };
    mockSingle.mockResolvedValueOnce({ data: openedRow, error: null });

    const clickedRow = {
      ...mockMessageRow,
      status: 'clicked',
      clicked_at: '2025-01-01T02:00:00Z',
      opened_at: '2025-01-01T01:00:00Z',
    };
    mockSingle.mockResolvedValueOnce({ data: clickedRow, error: null });

    const result = await markMessageClicked('msg-1');

    expect(result.status).toBe('clicked');
    // The update should NOT include opened_at since already opened
    expect(mockQueryChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'clicked',
        clicked_at: expect.any(String),
      }),
    );
    expect(mockQueryChain.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        opened_at: expect.any(String),
      }),
    );
  });

  it('should throw when message is not found', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116', message: 'not found' } });

    await expect(markMessageClicked('nonexistent')).rejects.toThrow('Message not found');
  });
});
