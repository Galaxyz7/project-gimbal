/**
 * useSearchMembers - React Query hook for member search with pagination
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchMembers, updateMember } from '@/services/members/memberService';
import { memberKeys } from '@/lib/queryKeys';
import type { MemberSearchParams, MemberSearchResult, UpdateMemberInput } from '@/types/member';

export interface UseSearchMembersParams {
  siteId?: string;
  searchTerm?: string;
  membershipStatus?: MemberSearchParams['membershipStatus'];
  membershipLevelId?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface UseSearchMembersResult {
  members: MemberSearchResult[];
  totalCount: number;
}

export function useSearchMembers(params: UseSearchMembersParams = {}) {
  return useQuery({
    queryKey: memberKeys.list({
      siteId: params.siteId,
      status: params.membershipStatus,
      levelId: params.membershipLevelId,
      search: params.searchTerm,
    }),
    queryFn: () => searchMembers({
      siteId: params.siteId,
      searchTerm: params.searchTerm,
      membershipStatus: params.membershipStatus,
      membershipLevelId: params.membershipLevelId,
      tags: params.tags,
      limit: params.limit,
      offset: params.offset,
    }),
    staleTime: 30_000,
  });
}

/**
 * Mutation hook for updating a single member field inline
 */
export function useUpdateMemberField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, input }: { memberId: string; input: UpdateMemberInput }) =>
      updateMember(memberId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}

export default useSearchMembers;
