/**
 * useCampaigns Hook Tests
 *
 * Tests for all React Query hooks in useCampaigns.ts.
 * Mocks the service modules (not Supabase directly).
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test/helpers';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockCampaignService = vi.hoisted(() => ({
  getCampaigns: vi.fn(),
  getCampaignWithDetails: vi.fn(),
  getCampaignMetrics: vi.fn(),
  getCampaignRecipients: vi.fn(),
  createCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  deleteCampaign: vi.fn(),
  scheduleCampaign: vi.fn(),
  cancelCampaign: vi.fn(),
  queueCampaignMessages: vi.fn(),
}));

const mockTemplateService = vi.hoisted(() => ({
  getTemplates: vi.fn(),
  getAllTemplateStats: vi.fn(),
  getStarterTemplates: vi.fn(),
  duplicateTemplate: vi.fn(),
  getTemplateById: vi.fn(),
  createTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
}));

const mockMessageService = vi.hoisted(() => ({
  getCampaignMessages: vi.fn(),
  updateMessageStatus: vi.fn(),
}));

const mockCampaignReportService = vi.hoisted(() => ({
  getCampaignTimeline: vi.fn(),
  getCampaignFunnel: vi.fn(),
  getTopEngagedRecipients: vi.fn(),
  getCampaignErrorSummary: vi.fn(),
  getCampaignDeviceBreakdown: vi.fn(),
}));

vi.mock('../campaignService', () => ({ campaignService: mockCampaignService }));
vi.mock('../templateService', () => ({ templateService: mockTemplateService }));
vi.mock('../messageService', () => ({ messageService: mockMessageService }));
vi.mock('../campaignReportService', () => ({ campaignReportService: mockCampaignReportService }));

// ---------------------------------------------------------------------------
// Imports (after mocks are registered)
// ---------------------------------------------------------------------------

import {
  useCampaigns,
  useCampaign,
  useCampaignMetrics,
  useCampaignRecipients,
  useCampaignMessages,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
  useScheduleCampaign,
  useCancelCampaign,
  useQueueCampaignMessages,
  useCampaignTimeline,
  useCampaignFunnel,
  useTopEngaged,
  useCampaignErrorSummary,
  useCampaignDeviceBreakdown,
  useTemplates,
  useAllTemplateStats,
  useStarterTemplates,
  useDuplicateTemplate,
  useTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useUpdateMessageStatus,
} from '../useCampaigns';

// ---------------------------------------------------------------------------
// Wrapper helper
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Reset mocks between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// Campaign Query Hooks
// =============================================================================

describe('Campaign Query Hooks', () => {
  it('useCampaigns calls getCampaigns with filters', async () => {
    const campaigns = [{ id: 'c-1', name: 'Welcome' }, { id: 'c-2', name: 'Promo' }];
    mockCampaignService.getCampaigns.mockResolvedValue(campaigns);

    const filters = { status: 'draft', campaignType: 'email' };
    const { result } = renderHook(() => useCampaigns(filters), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCampaignService.getCampaigns).toHaveBeenCalledWith(filters);
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].id).toBe('c-1');
  });

  it('useCampaign calls getCampaignWithDetails with id', async () => {
    const detail = { id: 'c-1', name: 'Welcome', template: { id: 't-1' } };
    mockCampaignService.getCampaignWithDetails.mockResolvedValue(detail);

    const { result } = renderHook(() => useCampaign('c-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCampaignService.getCampaignWithDetails).toHaveBeenCalledWith('c-1');
    expect(result.current.data).toEqual(detail);
  });

  it('useCampaignMetrics calls getCampaignMetrics', async () => {
    const metrics = {
      totalRecipients: 100,
      totalSent: 95,
      totalDelivered: 90,
      deliveryRate: 94.7,
    };
    mockCampaignService.getCampaignMetrics.mockResolvedValue(metrics);

    const { result } = renderHook(() => useCampaignMetrics('c-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCampaignService.getCampaignMetrics).toHaveBeenCalledWith('c-1');
    expect(result.current.data!.totalRecipients).toBe(100);
  });

  it('useCampaignRecipients calls getCampaignRecipients', async () => {
    const recipients = [
      { memberId: 'm-1', firstName: 'Alice', email: 'alice@test.com' },
      { memberId: 'm-2', firstName: 'Bob', email: 'bob@test.com' },
    ];
    mockCampaignService.getCampaignRecipients.mockResolvedValue(recipients);

    const { result } = renderHook(() => useCampaignRecipients('c-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCampaignService.getCampaignRecipients).toHaveBeenCalledWith('c-1');
    expect(result.current.data).toHaveLength(2);
  });

  it('useCampaignMessages calls messageService.getCampaignMessages', async () => {
    const messages = [
      { id: 'msg-1', campaignId: 'c-1', status: 'delivered' },
    ];
    mockMessageService.getCampaignMessages.mockResolvedValue(messages);

    const params = { status: 'delivered' as const, limit: 10 };
    const { result } = renderHook(() => useCampaignMessages('c-1', params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockMessageService.getCampaignMessages).toHaveBeenCalledWith('c-1', params);
    expect(result.current.data).toHaveLength(1);
  });
});

// =============================================================================
// Campaign Mutation Hooks
// =============================================================================

describe('Campaign Mutation Hooks', () => {
  it('useCreateCampaign calls createCampaign', async () => {
    const created = { id: 'c-new', name: 'New Campaign', campaignType: 'email' };
    mockCampaignService.createCampaign.mockResolvedValue(created);

    const { result } = renderHook(() => useCreateCampaign(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        name: 'New Campaign',
        campaignType: 'email',
        content: '<p>Hello</p>',
      });
    });

    expect(mockCampaignService.createCampaign).toHaveBeenCalledWith({
      name: 'New Campaign',
      campaignType: 'email',
      content: '<p>Hello</p>',
    });
  });

  it('useUpdateCampaign calls updateCampaign with id and input', async () => {
    const updated = { id: 'c-1', name: 'Updated Name' };
    mockCampaignService.updateCampaign.mockResolvedValue(updated);

    const { result } = renderHook(() => useUpdateCampaign(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ id: 'c-1', input: { name: 'Updated Name' } });
    });

    expect(mockCampaignService.updateCampaign).toHaveBeenCalledWith('c-1', { name: 'Updated Name' });
  });

  it('useDeleteCampaign calls deleteCampaign with id', async () => {
    mockCampaignService.deleteCampaign.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteCampaign(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync('c-1');
    });

    expect(mockCampaignService.deleteCampaign).toHaveBeenCalledWith('c-1');
  });

  it('useScheduleCampaign calls scheduleCampaign with id and scheduledAt', async () => {
    const scheduled = { id: 'c-1', status: 'scheduled', scheduledAt: '2026-03-01T10:00:00Z' };
    mockCampaignService.scheduleCampaign.mockResolvedValue(scheduled);

    const { result } = renderHook(() => useScheduleCampaign(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ id: 'c-1', scheduledAt: '2026-03-01T10:00:00Z' });
    });

    expect(mockCampaignService.scheduleCampaign).toHaveBeenCalledWith('c-1', '2026-03-01T10:00:00Z');
  });

  it('useCancelCampaign calls cancelCampaign with id', async () => {
    const cancelled = { id: 'c-1', status: 'cancelled' };
    mockCampaignService.cancelCampaign.mockResolvedValue(cancelled);

    const { result } = renderHook(() => useCancelCampaign(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync('c-1');
    });

    expect(mockCampaignService.cancelCampaign).toHaveBeenCalledWith('c-1');
  });

  it('useQueueCampaignMessages calls queueCampaignMessages with campaignId', async () => {
    mockCampaignService.queueCampaignMessages.mockResolvedValue(50);

    const { result } = renderHook(() => useQueueCampaignMessages(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync('c-1');
    });

    expect(mockCampaignService.queueCampaignMessages).toHaveBeenCalledWith('c-1');
  });
});

// =============================================================================
// Report Hooks
// =============================================================================

describe('Report Hooks', () => {
  it('useCampaignTimeline calls getCampaignTimeline', async () => {
    const timeline = [
      { timeBucket: '2026-02-10T10:00:00Z', sent: 20, delivered: 18, opened: 5, clicked: 2, failed: 1, bounced: 0 },
    ];
    mockCampaignReportService.getCampaignTimeline.mockResolvedValue(timeline);

    const { result } = renderHook(() => useCampaignTimeline('c-1', 'hour'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCampaignReportService.getCampaignTimeline).toHaveBeenCalledWith('c-1', 'hour');
    expect(result.current.data).toHaveLength(1);
  });

  it('useCampaignFunnel calls getCampaignFunnel', async () => {
    const funnel = [
      { stage: 'Sent', count: 100, rate: 100 },
      { stage: 'Delivered', count: 95, rate: 95 },
      { stage: 'Opened', count: 40, rate: 42.1 },
    ];
    mockCampaignReportService.getCampaignFunnel.mockResolvedValue(funnel);

    const { result } = renderHook(() => useCampaignFunnel('c-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCampaignReportService.getCampaignFunnel).toHaveBeenCalledWith('c-1');
    expect(result.current.data).toHaveLength(3);
  });

  it('useTopEngaged calls getTopEngagedRecipients', async () => {
    const engaged = [
      { memberId: 'm-1', firstName: 'Alice', status: 'clicked', openedAt: '2026-02-10T11:00:00Z', clickedAt: '2026-02-10T11:05:00Z' },
    ];
    mockCampaignReportService.getTopEngagedRecipients.mockResolvedValue(engaged);

    const { result } = renderHook(() => useTopEngaged('c-1', 5), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCampaignReportService.getTopEngagedRecipients).toHaveBeenCalledWith('c-1', 5);
    expect(result.current.data![0].memberId).toBe('m-1');
  });

  it('useCampaignErrorSummary calls getCampaignErrorSummary', async () => {
    const errors = [
      { errorMessage: 'Invalid phone number', count: 3, lastOccurred: '2026-02-10T12:00:00Z' },
    ];
    mockCampaignReportService.getCampaignErrorSummary.mockResolvedValue(errors);

    const { result } = renderHook(() => useCampaignErrorSummary('c-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCampaignReportService.getCampaignErrorSummary).toHaveBeenCalledWith('c-1');
    expect(result.current.data![0].count).toBe(3);
  });

  it('useCampaignDeviceBreakdown calls getCampaignDeviceBreakdown', async () => {
    const breakdown = [
      { deviceType: 'mobile', count: 60, rate: 60 },
      { deviceType: 'desktop', count: 40, rate: 40 },
    ];
    mockCampaignReportService.getCampaignDeviceBreakdown.mockResolvedValue(breakdown);

    const { result } = renderHook(() => useCampaignDeviceBreakdown('c-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCampaignReportService.getCampaignDeviceBreakdown).toHaveBeenCalledWith('c-1');
    expect(result.current.data).toHaveLength(2);
  });
});

// =============================================================================
// Template Query Hooks
// =============================================================================

describe('Template Query Hooks', () => {
  it('useTemplates calls getTemplates with params', async () => {
    const templates = [
      { id: 't-1', name: 'Welcome Email', templateType: 'email' },
      { id: 't-2', name: 'Flash Sale', templateType: 'email' },
    ];
    mockTemplateService.getTemplates.mockResolvedValue(templates);

    const params = { type: 'email' as const, search: 'welcome' };
    const { result } = renderHook(() => useTemplates(params), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockTemplateService.getTemplates).toHaveBeenCalledWith(params);
    expect(result.current.data).toHaveLength(2);
  });

  it('useAllTemplateStats calls getAllTemplateStats', async () => {
    const stats = [
      { templateId: 't-1', timesUsed: 5, avgOpenRate: 42.3, avgClickRate: 12.1, lastUsedAt: '2026-02-09T10:00:00Z' },
    ];
    mockTemplateService.getAllTemplateStats.mockResolvedValue(stats);

    const { result } = renderHook(() => useAllTemplateStats(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockTemplateService.getAllTemplateStats).toHaveBeenCalled();
    expect(result.current.data![0].timesUsed).toBe(5);
  });

  it('useStarterTemplates calls getStarterTemplates with optional type', async () => {
    const starters = [
      { id: 't-s1', name: 'System Welcome', isSystem: true, templateType: 'sms' },
    ];
    mockTemplateService.getStarterTemplates.mockResolvedValue(starters);

    const { result } = renderHook(() => useStarterTemplates('sms'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockTemplateService.getStarterTemplates).toHaveBeenCalledWith('sms');
    expect(result.current.data).toHaveLength(1);
  });

  it('useTemplate calls getTemplateById with id', async () => {
    const template = { id: 't-1', name: 'Welcome Email', content: '<p>Hi</p>' };
    mockTemplateService.getTemplateById.mockResolvedValue(template);

    const { result } = renderHook(() => useTemplate('t-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockTemplateService.getTemplateById).toHaveBeenCalledWith('t-1');
    expect(result.current.data!.name).toBe('Welcome Email');
  });
});

// =============================================================================
// Template Mutation Hooks
// =============================================================================

describe('Template Mutation Hooks', () => {
  it('useDuplicateTemplate calls duplicateTemplate with templateId and newName', async () => {
    const duplicated = { id: 't-dup', name: 'Welcome Email (Copy)' };
    mockTemplateService.duplicateTemplate.mockResolvedValue(duplicated);

    const { result } = renderHook(() => useDuplicateTemplate(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ templateId: 't-1', newName: 'My Custom Welcome' });
    });

    expect(mockTemplateService.duplicateTemplate).toHaveBeenCalledWith('t-1', 'My Custom Welcome');
  });

  it('useCreateTemplate calls createTemplate with input', async () => {
    const created = { id: 't-new', name: 'New Template', templateType: 'email' };
    mockTemplateService.createTemplate.mockResolvedValue(created);

    const input = {
      name: 'New Template',
      templateType: 'email' as const,
      content: '<p>Body</p>',
      subject: 'Hello',
    };

    const { result } = renderHook(() => useCreateTemplate(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync(input);
    });

    expect(mockTemplateService.createTemplate).toHaveBeenCalledWith(input);
  });

  it('useUpdateTemplate calls updateTemplate with id and input', async () => {
    const updated = { id: 't-1', name: 'Renamed Template' };
    mockTemplateService.updateTemplate.mockResolvedValue(updated);

    const { result } = renderHook(() => useUpdateTemplate(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ id: 't-1', input: { name: 'Renamed Template' } });
    });

    expect(mockTemplateService.updateTemplate).toHaveBeenCalledWith('t-1', { name: 'Renamed Template' });
  });

  it('useDeleteTemplate calls deleteTemplate with id', async () => {
    mockTemplateService.deleteTemplate.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteTemplate(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync('t-1');
    });

    expect(mockTemplateService.deleteTemplate).toHaveBeenCalledWith('t-1');
  });
});

// =============================================================================
// Message Hooks
// =============================================================================

describe('Message Hooks', () => {
  it('useUpdateMessageStatus calls updateMessageStatus with messageId, status, and metadata', async () => {
    const updatedMessage = { id: 'msg-1', campaignId: 'c-1', status: 'delivered' };
    mockMessageService.updateMessageStatus.mockResolvedValue(updatedMessage);

    const { result } = renderHook(() => useUpdateMessageStatus(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        messageId: 'msg-1',
        status: 'delivered',
        metadata: { externalId: 'ext-123', providerStatus: 'delivered' },
      });
    });

    expect(mockMessageService.updateMessageStatus).toHaveBeenCalledWith(
      'msg-1',
      'delivered',
      { externalId: 'ext-123', providerStatus: 'delivered' },
    );
  });
});
