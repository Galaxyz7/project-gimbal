
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useSearchMembers, useUpdateMemberField } from '../useSearchMembers';

// =============================================================================
// Mocks
// =============================================================================

const { mockSearchMembers, mockUpdateMember } = vi.hoisted(() => {
  const mockSearchMembers = vi.fn();
  const mockUpdateMember = vi.fn();
  return { mockSearchMembers, mockUpdateMember };
});

vi.mock('@/services/members/memberService', () => ({
  searchMembers: mockSearchMembers,
  updateMember: mockUpdateMember,
}));

// =============================================================================
// Helpers
// =============================================================================

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

const mockMemberResult = {
  members: [
    {
      id: 'mem-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+11234567890',
      membershipStatus: 'active',
      lifetimeValue: 500,
      lastVisitAt: '2026-01-15T00:00:00Z',
      siteName: 'Main Site',
    },
    {
      id: 'mem-2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      phone: '+10987654321',
      membershipStatus: 'active',
      lifetimeValue: 300,
      lastVisitAt: '2026-01-10T00:00:00Z',
      siteName: 'Branch',
    },
  ],
  totalCount: 2,
};

// =============================================================================
// Tests: useSearchMembers
// =============================================================================

describe('useSearchMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchMembers.mockResolvedValue(mockMemberResult);
  });

  it('should call searchMembers with defaults when no params', async () => {
    const { result } = renderHook(() => useSearchMembers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSearchMembers).toHaveBeenCalledWith({
      siteId: undefined,
      searchTerm: undefined,
      membershipStatus: undefined,
      membershipLevelId: undefined,
      tags: undefined,
      limit: undefined,
      offset: undefined,
    });
  });

  it('should return members and totalCount', async () => {
    const { result } = renderHook(() => useSearchMembers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.members).toHaveLength(2);
    expect(result.current.data?.totalCount).toBe(2);
    expect(result.current.data?.members[0].firstName).toBe('John');
  });

  it('should pass all filter params to service', async () => {
    const params = {
      siteId: 'site-1',
      searchTerm: 'john',
      membershipStatus: 'active' as const,
      membershipLevelId: 'level-1',
      tags: ['vip'],
      limit: 10,
      offset: 20,
    };

    const { result } = renderHook(() => useSearchMembers(params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSearchMembers).toHaveBeenCalledWith({
      siteId: 'site-1',
      searchTerm: 'john',
      membershipStatus: 'active',
      membershipLevelId: 'level-1',
      tags: ['vip'],
      limit: 10,
      offset: 20,
    });
  });

  it('should be in loading state initially', () => {
    mockSearchMembers.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useSearchMembers(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should return error when searchMembers rejects', async () => {
    mockSearchMembers.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSearchMembers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
  });

  it('should return empty results when service returns empty', async () => {
    mockSearchMembers.mockResolvedValue({ members: [], totalCount: 0 });

    const { result } = renderHook(() => useSearchMembers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.members).toHaveLength(0);
    expect(result.current.data?.totalCount).toBe(0);
  });
});

// =============================================================================
// Tests: useUpdateMemberField
// =============================================================================

describe('useUpdateMemberField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateMember.mockResolvedValue({
      id: 'mem-1',
      firstName: 'Updated',
    });
  });

  it('should call updateMember with memberId and input', async () => {
    const { result } = renderHook(() => useUpdateMemberField(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ memberId: 'mem-1', input: { firstName: 'Updated' } });
    });

    expect(mockUpdateMember).toHaveBeenCalledWith('mem-1', { firstName: 'Updated' });
  });

  it('should return error when updateMember rejects', async () => {
    mockUpdateMember.mockRejectedValue(new Error('Update failed'));

    const { result } = renderHook(() => useUpdateMemberField(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ memberId: 'mem-1', input: { firstName: 'Bad' } });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Update failed');
  });

  it('should accept partial member input for field updates', async () => {
    const { result } = renderHook(() => useUpdateMemberField(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ memberId: 'mem-2', input: { phone: '+11112223333' } });
    });

    expect(mockUpdateMember).toHaveBeenCalledWith('mem-2', { phone: '+11112223333' });
  });
});
