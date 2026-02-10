
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TemplateLibrary } from '../TemplateLibrary';

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

const { mockUseTemplates, mockUseDuplicateTemplate, mockUseAllTemplateStats, mockMutate } = vi.hoisted(() => {
  const mockMutate = vi.fn();
  const mockUseTemplates = vi.fn().mockReturnValue({ data: [], isLoading: false });
  const mockUseDuplicateTemplate = vi.fn().mockReturnValue({
    mutate: mockMutate,
    isPending: false,
  });
  const mockUseAllTemplateStats = vi.fn().mockReturnValue({ data: [] });
  return { mockUseTemplates, mockUseDuplicateTemplate, mockUseAllTemplateStats, mockMutate };
});

vi.mock('@/services/campaigns', () => ({
  useTemplates: mockUseTemplates,
  useDuplicateTemplate: mockUseDuplicateTemplate,
  useAllTemplateStats: mockUseAllTemplateStats,
}));

vi.mock('../EmailPreviewModal', () => ({
  EmailPreviewModal: () => null,
}));

// =============================================================================
// Helpers
// =============================================================================

const systemTemplate = {
  id: 'system-1',
  userId: '00000000-0000-0000-0000-000000000000',
  name: 'Welcome Message',
  description: 'Greet new members',
  templateType: 'sms' as const,
  subject: null,
  content: 'Hi {{firstName}}, welcome!',
  preheader: null,
  tags: [] as string[],
  isActive: true,
  isSystem: true,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

const userTemplate = {
  id: 'user-1',
  userId: '00000000-0000-0000-0000-000000000001',
  name: 'My Custom Template',
  description: 'A custom template',
  templateType: 'email' as const,
  subject: 'Hello!',
  content: 'Hi {{firstName}}, check this out!',
  preheader: 'Preview text',
  tags: [] as string[],
  isActive: true,
  isSystem: false,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

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

describe('TemplateLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTemplates.mockReturnValue({ data: [], isLoading: false });
  });

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  it('should show skeleton loading state', () => {
    mockUseTemplates.mockReturnValue({ data: undefined, isLoading: true });
    renderWithProviders(<TemplateLibrary />);
    // Skeletons render divs with Skeleton class
    const skeletons = document.querySelectorAll('.h-48');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  it('should show empty state when no templates', () => {
    mockUseTemplates.mockReturnValue({ data: [], isLoading: false });
    renderWithProviders(<TemplateLibrary />);
    expect(screen.getByText('No templates yet')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Template display
  // ---------------------------------------------------------------------------

  it('should display starter templates section', () => {
    mockUseTemplates.mockReturnValue({
      data: [systemTemplate],
      isLoading: false,
    });
    renderWithProviders(<TemplateLibrary />);
    expect(screen.getByText('Starter Templates')).toBeInTheDocument();
    expect(screen.getByText('Welcome Message')).toBeInTheDocument();
  });

  it('should display user templates section', () => {
    mockUseTemplates.mockReturnValue({
      data: [userTemplate],
      isLoading: false,
    });
    renderWithProviders(<TemplateLibrary />);
    expect(screen.getByText('My Templates')).toBeInTheDocument();
    expect(screen.getByText('My Custom Template')).toBeInTheDocument();
  });

  it('should display both sections when mixed', () => {
    mockUseTemplates.mockReturnValue({
      data: [systemTemplate, userTemplate],
      isLoading: false,
    });
    renderWithProviders(<TemplateLibrary />);
    expect(screen.getByText('Starter Templates')).toBeInTheDocument();
    expect(screen.getByText('My Templates')).toBeInTheDocument();
  });

  it('should show type badge on template cards', () => {
    mockUseTemplates.mockReturnValue({
      data: [systemTemplate, userTemplate],
      isLoading: false,
    });
    renderWithProviders(<TemplateLibrary />);
    // "SMS" appears in both the filter dropdown option and the badge,
    // so use getAllByText to confirm at least one badge is present
    expect(screen.getAllByText('SMS').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Email').length).toBeGreaterThanOrEqual(1);
  });

  it('should show subject for email templates', () => {
    mockUseTemplates.mockReturnValue({
      data: [userTemplate],
      isLoading: false,
    });
    renderWithProviders(<TemplateLibrary />);
    expect(screen.getByText('Subject: Hello!')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  it('should navigate to new campaign with template on "Use Template"', async () => {
    const user = userEvent.setup();
    mockUseTemplates.mockReturnValue({
      data: [systemTemplate],
      isLoading: false,
    });
    renderWithProviders(<TemplateLibrary />);

    await user.click(screen.getByText('Use Template'));
    expect(mockNavigate).toHaveBeenCalledWith('/campaigns/new?templateId=system-1');
  });

  it('should show "Customize" button only for system templates', () => {
    mockUseTemplates.mockReturnValue({
      data: [systemTemplate, userTemplate],
      isLoading: false,
    });
    renderWithProviders(<TemplateLibrary />);

    const customizeButtons = screen.getAllByText('Customize');
    expect(customizeButtons).toHaveLength(1);
  });

  it('should call duplicate mutation on "Customize"', async () => {
    const user = userEvent.setup();
    mockUseTemplates.mockReturnValue({
      data: [systemTemplate],
      isLoading: false,
    });
    renderWithProviders(<TemplateLibrary />);

    await user.click(screen.getByText('Customize'));
    expect(mockMutate).toHaveBeenCalledWith(
      { templateId: 'system-1' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  it('should navigate to "Create from Scratch"', async () => {
    const user = userEvent.setup();
    mockUseTemplates.mockReturnValue({ data: [], isLoading: false });
    renderWithProviders(<TemplateLibrary />);

    await user.click(screen.getByText('Create from Scratch'));
    expect(mockNavigate).toHaveBeenCalledWith('/campaigns/new');
  });

  // ---------------------------------------------------------------------------
  // Content preview
  // ---------------------------------------------------------------------------

  it('should truncate long content', () => {
    const longTemplate = {
      ...systemTemplate,
      content: 'A'.repeat(200),
    };
    mockUseTemplates.mockReturnValue({
      data: [longTemplate],
      isLoading: false,
    });
    renderWithProviders(<TemplateLibrary />);

    const previewText = screen.getByText(/A{120}\.\.\./);
    expect(previewText).toBeInTheDocument();
  });
});
