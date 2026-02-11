
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CampaignCalendar } from '../CampaignCalendar';
import type { Campaign } from '@/types/campaign';

// =============================================================================
// Mocks
// =============================================================================

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const { mockUseCampaigns } = vi.hoisted(() => {
  const mockUseCampaigns = vi.fn();
  return { mockUseCampaigns };
});

vi.mock('@/services/campaigns', () => ({
  useCampaigns: mockUseCampaigns,
}));

vi.mock('../CampaignStatusBadge', () => ({
  CampaignStatusBadge: ({ status }: { status: string }) => (
    <span data-testid={`status-badge-${status}`}>{status}</span>
  ),
}));

vi.mock('../CampaignTypeIcon', () => ({
  CampaignTypeIcon: ({ type }: { type: string }) => (
    <span data-testid={`type-icon-${type}`}>{type}</span>
  ),
}));

// =============================================================================
// Helpers
// =============================================================================

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'camp-1',
    userId: 'user-1',
    name: 'Test Campaign',
    campaignType: 'email',
    status: 'scheduled',
    content: 'Hello',
    subject: 'Subject',
    fromName: 'Test',
    fromEmail: 'test@test.com',
    scheduledAt: '2026-02-15T10:00:00Z',
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-02-01T10:00:00Z',
    totalSent: 0,
    totalDelivered: 0,
    totalOpened: 0,
    totalClicked: 0,
    totalBounced: 0,
    totalFailed: 0,
    ...overrides,
  } as Campaign;
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// =============================================================================
// Tests
// =============================================================================

describe('CampaignCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no campaigns, not loading
    mockUseCampaigns.mockReturnValue({
      data: { campaigns: [], totalCount: 0 },
      isLoading: false,
    });
  });

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  it('should show skeleton when loading', () => {
    mockUseCampaigns.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    const { container } = renderWithProviders(<CampaignCalendar />);
    // Skeleton renders when isLoading; day headers should NOT appear
    expect(container.querySelector('.grid.grid-cols-7')).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  it('should render calendar grid with day headers when empty', () => {
    renderWithProviders(<CampaignCalendar />);
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Month display
  // ---------------------------------------------------------------------------

  it('should show current month and year in header', () => {
    renderWithProviders(<CampaignCalendar />);
    const now = new Date();
    const expectedLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Campaign placement
  // ---------------------------------------------------------------------------

  it('should display scheduled campaign on correct day', () => {
    const campaign = makeCampaign({
      id: 'camp-placed',
      name: 'Feb Campaign',
      scheduledAt: '2026-02-15T10:00:00Z',
    });
    // First call is scheduled campaigns, second is drafts
    mockUseCampaigns
      .mockReturnValueOnce({
        data: { campaigns: [campaign], totalCount: 1 },
        isLoading: false,
      })
      .mockReturnValueOnce({
        data: { campaigns: [], totalCount: 0 },
        isLoading: false,
      });

    renderWithProviders(<CampaignCalendar />);
    // Campaign name should appear as a button with title
    const button = screen.getByTitle('Feb Campaign (scheduled)');
    expect(button).toBeInTheDocument();
    expect(screen.getByText('Feb Campaign')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Status color coding
  // ---------------------------------------------------------------------------

  it('should apply correct status color class to campaign event', () => {
    const sentCampaign = makeCampaign({
      id: 'camp-sent',
      name: 'Sent One',
      status: 'sent',
      scheduledAt: '2026-02-10T10:00:00Z',
    });
    mockUseCampaigns
      .mockReturnValueOnce({
        data: { campaigns: [sentCampaign], totalCount: 1 },
        isLoading: false,
      })
      .mockReturnValueOnce({
        data: { campaigns: [], totalCount: 0 },
        isLoading: false,
      });

    renderWithProviders(<CampaignCalendar />);
    const button = screen.getByTitle('Sent One (sent)');
    expect(button.className).toContain('bg-green-50');
    expect(button.className).toContain('border-[#2e7d32]');
  });

  // ---------------------------------------------------------------------------
  // Max 3 per day
  // ---------------------------------------------------------------------------

  it('should show "+X more" when more than 3 campaigns on a day', () => {
    const campaigns = Array.from({ length: 5 }, (_, i) =>
      makeCampaign({
        id: `camp-${i}`,
        name: `Campaign ${i}`,
        scheduledAt: '2026-02-20T10:00:00Z',
      })
    );
    mockUseCampaigns
      .mockReturnValueOnce({
        data: { campaigns, totalCount: 5 },
        isLoading: false,
      })
      .mockReturnValueOnce({
        data: { campaigns: [], totalCount: 0 },
        isLoading: false,
      });

    renderWithProviders(<CampaignCalendar />);
    expect(screen.getByText('+2 more')).toBeInTheDocument();
    // Only 3 campaign buttons rendered
    expect(screen.getByText('Campaign 0')).toBeInTheDocument();
    expect(screen.getByText('Campaign 1')).toBeInTheDocument();
    expect(screen.getByText('Campaign 2')).toBeInTheDocument();
    expect(screen.queryByText('Campaign 3')).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Click navigates
  // ---------------------------------------------------------------------------

  it('should navigate to campaign detail on click', async () => {
    const user = userEvent.setup();
    const campaign = makeCampaign({
      id: 'camp-nav',
      name: 'Navigate Me',
      scheduledAt: '2026-02-15T10:00:00Z',
    });
    mockUseCampaigns
      .mockReturnValueOnce({
        data: { campaigns: [campaign], totalCount: 1 },
        isLoading: false,
      })
      .mockReturnValueOnce({
        data: { campaigns: [], totalCount: 0 },
        isLoading: false,
      });

    renderWithProviders(<CampaignCalendar />);
    await user.click(screen.getByTitle('Navigate Me (scheduled)'));
    expect(mockNavigate).toHaveBeenCalledWith('/campaigns/camp-nav');
  });

  // ---------------------------------------------------------------------------
  // Month navigation
  // ---------------------------------------------------------------------------

  it('should navigate to previous month', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CampaignCalendar />);

    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1);
    const expectedLabel = prevMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Click the left arrow (first outline button)
    const buttons = screen.getAllByRole('button');
    const prevButton = buttons.find(b => b.querySelector('path[d="M15 19l-7-7 7-7"]'));
    expect(prevButton).toBeDefined();
    await user.click(prevButton!);

    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
  });

  it('should navigate to next month', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CampaignCalendar />);

    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1);
    const expectedLabel = nextMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const buttons = screen.getAllByRole('button');
    const nextButton = buttons.find(b => b.querySelector('path[d="M9 5l7 7-7 7"]'));
    expect(nextButton).toBeDefined();
    await user.click(nextButton!);

    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
  });

  it('should return to current month on Today click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CampaignCalendar />);

    const now = new Date();
    const currentLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Navigate away first
    const buttons = screen.getAllByRole('button');
    const nextButton = buttons.find(b => b.querySelector('path[d="M9 5l7 7-7 7"]'));
    await user.click(nextButton!);

    // Click Today
    await user.click(screen.getByText('Today'));
    expect(screen.getByText(currentLabel)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Year boundary
  // ---------------------------------------------------------------------------

  it('should wrap from January to December on prev', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CampaignCalendar />);

    const now = new Date();
    // Navigate back enough months to get to January
    const monthsBack = now.getMonth(); // 0-indexed, so this is exact months to January

    const buttons = screen.getAllByRole('button');
    const prevButton = buttons.find(b => b.querySelector('path[d="M15 19l-7-7 7-7"]'));

    // Navigate to January
    for (let i = 0; i < monthsBack; i++) {
      await user.click(prevButton!);
    }

    // Verify we're at January
    const janLabel = new Date(now.getFullYear(), 0).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    expect(screen.getByText(janLabel)).toBeInTheDocument();

    // One more click should go to December of previous year
    await user.click(prevButton!);
    const decLabel = new Date(now.getFullYear() - 1, 11).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    expect(screen.getByText(decLabel)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Draft campaigns
  // ---------------------------------------------------------------------------

  it('should place draft campaigns using createdAt date', () => {
    const draftCampaign = makeCampaign({
      id: 'draft-1',
      name: 'Draft Campaign',
      status: 'draft',
      scheduledAt: null as unknown as string,
      createdAt: '2026-02-18T10:00:00Z',
    });
    mockUseCampaigns
      .mockReturnValueOnce({
        data: { campaigns: [], totalCount: 0 },
        isLoading: false,
      })
      .mockReturnValueOnce({
        data: { campaigns: [draftCampaign], totalCount: 1 },
        isLoading: false,
      });

    renderWithProviders(<CampaignCalendar />);
    expect(screen.getByTitle('Draft Campaign (draft)')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Legend
  // ---------------------------------------------------------------------------

  it('should show status legend badges in header', () => {
    renderWithProviders(<CampaignCalendar />);
    expect(screen.getByTestId('status-badge-draft')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-scheduled')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-sent')).toBeInTheDocument();
  });
});
