/**
 * Global Search Service
 *
 * Parallel search across members, campaigns, and segments.
 */

import { searchMembers } from '@/services/members/memberService';
import { getCampaigns } from '@/services/campaigns/campaignService';
import { getSegments } from '@/services/segments/segmentService';

// =============================================================================
// Types
// =============================================================================

export interface SearchResult {
  entityType: 'member' | 'campaign' | 'segment';
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

export interface SearchResults {
  members: SearchResult[];
  campaigns: SearchResult[];
  segments: SearchResult[];
}

// =============================================================================
// Service
// =============================================================================

export async function searchAll(query: string): Promise<SearchResults> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return { members: [], campaigns: [], segments: [] };
  }

  const [membersResult, campaignsResult, segmentsResult] = await Promise.all([
    searchMembers({ searchTerm: trimmed, limit: 5 }).catch(() => ({ members: [], totalCount: 0 })),
    getCampaigns({ searchTerm: trimmed, limit: 5 }).catch(() => ({ campaigns: [], totalCount: 0 })),
    getSegments().catch(() => []),
  ]);

  const members: SearchResult[] = membersResult.members.map((m) => ({
    entityType: 'member',
    id: m.id,
    title: [m.firstName, m.lastName].filter(Boolean).join(' ') || m.email || 'Unknown',
    subtitle: m.email || m.phone || m.siteName,
    url: `/members/${m.id}`,
  }));

  const campaigns: SearchResult[] = campaignsResult.campaigns
    .filter((c) => c.name.toLowerCase().includes(trimmed))
    .slice(0, 5)
    .map((c) => ({
      entityType: 'campaign',
      id: c.id,
      title: c.name,
      subtitle: `${c.campaignType.toUpperCase()} - ${c.status}`,
      url: `/campaigns/${c.id}`,
    }));

  const segments: SearchResult[] = segmentsResult
    .filter((s) => s.name.toLowerCase().includes(trimmed) ||
      (s.description && s.description.toLowerCase().includes(trimmed)))
    .slice(0, 5)
    .map((s) => ({
      entityType: 'segment',
      id: s.id,
      title: s.name,
      subtitle: s.description || `${s.estimatedSize} members`,
      url: `/segments`,
    }));

  return { members, campaigns, segments };
}
