
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SegmentOverlapDialog } from '../SegmentOverlapDialog';
import type { AudienceSegment } from '@/services/segments';

// =============================================================================
// Mocks
// =============================================================================

const { mockRpc } = vi.hoisted(() => {
  const mockRpc = vi.fn();
  return { mockRpc };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
  },
}));

// =============================================================================
// Helpers
// =============================================================================

const segmentA: AudienceSegment = {
  id: 'seg-a',
  name: 'Active Users',
  description: 'Users active in last 30 days',
  userId: 'user-1',
  rules: { logic: 'AND', conditions: [] },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const segmentB: AudienceSegment = {
  id: 'seg-b',
  name: 'High LTV',
  description: 'Members with high lifetime value',
  userId: 'user-1',
  rules: { logic: 'AND', conditions: [] },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function renderWithProviders(
  isOpen: boolean,
  segA: AudienceSegment | null = segmentA,
  segB: AudienceSegment | null = segmentB,
  onClose = vi.fn(),
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    onClose,
    ...render(
      <QueryClientProvider client={queryClient}>
        <SegmentOverlapDialog
          isOpen={isOpen}
          onClose={onClose}
          segmentA={segA}
          segmentB={segB}
        />
      </QueryClientProvider>
    ),
  };
}

function mockOverlapResponse(data: {
  overlap_count: number;
  a_only_count: number;
  b_only_count: number;
  a_total: number;
  b_total: number;
}) {
  mockRpc.mockResolvedValue({ data: [data], error: null });
}

function mockOverlapError(message: string) {
  mockRpc.mockResolvedValue({ data: null, error: { message } });
}

// =============================================================================
// Tests
// =============================================================================

describe('SegmentOverlapDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Closed state
  // ---------------------------------------------------------------------------

  it('should render nothing when isOpen is false', () => {
    // Mock RPC to avoid error when query might fire
    mockOverlapResponse({ overlap_count: 0, a_only_count: 0, b_only_count: 0, a_total: 0, b_total: 0 });
    renderWithProviders(false);
    expect(screen.queryByText('Segment Overlap Analysis')).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  it('should show skeletons while loading', () => {
    // Don't resolve RPC yet - keep it pending
    mockRpc.mockReturnValue(new Promise(() => {}));
    renderWithProviders(true);
    // The modal title should be visible even during loading
    expect(screen.getByText('Segment Overlap Analysis')).toBeInTheDocument();
    // Skeleton renders divs with role="presentation" (Modal uses portal to document.body)
    const skeletons = document.body.querySelectorAll('[role="presentation"]');
    expect(skeletons.length).toBeGreaterThan(0);
    // Data content should NOT be visible
    expect(screen.queryByText('shared members')).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Segment names
  // ---------------------------------------------------------------------------

  it('should show segment names in badges', async () => {
    mockOverlapResponse({ overlap_count: 50, a_only_count: 100, b_only_count: 75, a_total: 150, b_total: 125 });
    renderWithProviders(true);

    expect(await screen.findByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('High LTV')).toBeInTheDocument();
    expect(screen.getByText('vs')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Null segments fallback
  // ---------------------------------------------------------------------------

  it('should show fallback names when segments are null', async () => {
    mockOverlapResponse({ overlap_count: 0, a_only_count: 0, b_only_count: 0, a_total: 0, b_total: 0 });
    renderWithProviders(true, null, null);

    expect(await screen.findByText('Segment A')).toBeInTheDocument();
    expect(screen.getByText('Segment B')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Overlap data display
  // ---------------------------------------------------------------------------

  it('should display overlap percentage and shared count', async () => {
    // union = 200 + 150 - 50 = 300, pct = 50/300 = 17%
    mockOverlapResponse({ overlap_count: 50, a_only_count: 150, b_only_count: 100, a_total: 200, b_total: 150 });
    renderWithProviders(true);

    expect(await screen.findByText('17%')).toBeInTheDocument();
    expect(screen.getByText('50 shared members')).toBeInTheDocument();
  });

  it('should display bar labels with counts', async () => {
    mockOverlapResponse({ overlap_count: 50, a_only_count: 150, b_only_count: 100, a_total: 200, b_total: 150 });
    renderWithProviders(true);

    expect(await screen.findByText('Shared (Overlap)')).toBeInTheDocument();
    expect(screen.getByText(/Only in Active Users/)).toBeInTheDocument();
    expect(screen.getByText(/Only in High LTV/)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Totals grid
  // ---------------------------------------------------------------------------

  it('should show segment totals in footer grid', async () => {
    mockOverlapResponse({ overlap_count: 25, a_only_count: 75, b_only_count: 175, a_total: 100, b_total: 200 });
    renderWithProviders(true);

    // Wait for data
    await screen.findByText('25 shared members');
    // totals should show formatted numbers
    const totalElements = screen.getAllByText('total members');
    expect(totalElements).toHaveLength(2);
  });

  // ---------------------------------------------------------------------------
  // Zero division (both empty)
  // ---------------------------------------------------------------------------

  it('should show 0% when both segments are empty', async () => {
    mockOverlapResponse({ overlap_count: 0, a_only_count: 0, b_only_count: 0, a_total: 0, b_total: 0 });
    renderWithProviders(true);

    expect(await screen.findByText('0%')).toBeInTheDocument();
    expect(screen.getByText('0 shared members')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Full overlap
  // ---------------------------------------------------------------------------

  it('should show 100% when all members are shared', async () => {
    // union = 100 + 100 - 100 = 100, pct = 100/100 = 100%
    mockOverlapResponse({ overlap_count: 100, a_only_count: 0, b_only_count: 0, a_total: 100, b_total: 100 });
    renderWithProviders(true);

    expect(await screen.findByText('100%')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  it('should show error message when RPC call fails', async () => {
    mockOverlapError('Database error');
    renderWithProviders(true);

    expect(await screen.findByText('Failed to calculate overlap. Please try again.')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Close button
  // ---------------------------------------------------------------------------

  it('should call onClose when close is clicked', async () => {
    const user = userEvent.setup();
    mockOverlapResponse({ overlap_count: 10, a_only_count: 90, b_only_count: 90, a_total: 100, b_total: 100 });
    const { onClose } = renderWithProviders(true);

    // Modal has an X button for close
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
