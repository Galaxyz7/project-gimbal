/**
 * memberTimeline tests
 * Pure function tests for buildMemberTimeline
 */

import { buildMemberTimeline } from '../memberTimeline';
import type { MemberNote } from '@/types/member';
import type { MemberCampaignActivity } from '@/types/campaign';

// =============================================================================
// Fixtures
// =============================================================================

const mockNotes: MemberNote[] = [
  {
    id: 'note-1',
    userId: 'user-1',
    memberId: 'member-1',
    noteType: 'note',
    content: 'Called about renewal',
    isPinned: false,
    createdAt: '2025-03-10T10:00:00Z',
    updatedAt: '2025-03-10T10:00:00Z',
  },
  {
    id: 'note-2',
    userId: 'user-1',
    memberId: 'member-1',
    noteType: 'follow_up',
    content: 'Needs follow-up on membership upgrade',
    isPinned: true,
    createdAt: '2025-03-15T14:00:00Z',
    updatedAt: '2025-03-15T14:00:00Z',
  },
];

const mockVisits = [
  {
    id: 'visit-1',
    visitDate: '2025-03-12',
    checkInTime: '2025-03-12T09:30:00Z',
    checkOutTime: '2025-03-12T10:30:00Z',
    siteName: 'Downtown Location',
  },
  {
    id: 'visit-2',
    visitDate: '2025-03-05',
    checkInTime: null,
    checkOutTime: null,
  },
];

const mockTransactions = [
  {
    id: 'tx-1',
    transactionDate: '2025-03-08T12:00:00Z',
    amount: 150.0,
    transactionType: 'purchase',
    description: 'Monthly membership',
    siteName: 'Downtown Location',
  },
  {
    id: 'tx-2',
    transactionDate: '2025-03-01T08:00:00Z',
    amount: 25.5,
    transactionType: 'refund',
    description: null,
  },
];

const mockCampaigns: MemberCampaignActivity[] = [
  {
    id: 'msg-1',
    campaignId: 'camp-1',
    campaignName: 'March Promo',
    campaignType: 'email',
    status: 'delivered',
    sentAt: '2025-03-07T16:00:00Z',
    deliveredAt: '2025-03-07T16:01:00Z',
    openedAt: '2025-03-07T18:00:00Z',
    clickedAt: null,
    bouncedAt: null,
    queuedAt: '2025-03-07T15:55:00Z',
  },
  {
    id: 'msg-2',
    campaignId: 'camp-2',
    campaignName: 'Reminder SMS',
    campaignType: 'sms',
    status: 'sent',
    sentAt: '2025-03-14T10:00:00Z',
    deliveredAt: null,
    openedAt: null,
    clickedAt: null,
    bouncedAt: null,
    queuedAt: '2025-03-14T09:55:00Z',
  },
];

// =============================================================================
// Tests
// =============================================================================

describe('buildMemberTimeline', () => {
  it('should return empty array for no data', () => {
    const result = buildMemberTimeline([], [], [], []);
    expect(result).toEqual([]);
  });

  it('should combine all event types', () => {
    const result = buildMemberTimeline(mockNotes, mockVisits, mockTransactions, mockCampaigns);
    expect(result).toHaveLength(8); // 2 notes + 2 visits + 2 transactions + 2 campaigns
  });

  it('should sort by timestamp descending (newest first)', () => {
    const result = buildMemberTimeline(mockNotes, mockVisits, mockTransactions, mockCampaigns);
    for (let i = 1; i < result.length; i++) {
      const prev = new Date(result[i - 1].timestamp).getTime();
      const curr = new Date(result[i].timestamp).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it('should assign correct event types', () => {
    const result = buildMemberTimeline(mockNotes, mockVisits, mockTransactions, mockCampaigns);
    const types = result.map(e => e.type);
    expect(types).toContain('note');
    expect(types).toContain('visit');
    expect(types).toContain('transaction');
    expect(types).toContain('campaign');
  });

  it('should prefix event ids with type', () => {
    const result = buildMemberTimeline(mockNotes, mockVisits, mockTransactions, mockCampaigns);
    const noteEvents = result.filter(e => e.type === 'note');
    const visitEvents = result.filter(e => e.type === 'visit');
    const txEvents = result.filter(e => e.type === 'transaction');
    const campaignEvents = result.filter(e => e.type === 'campaign');

    noteEvents.forEach(e => expect(e.id).toMatch(/^note-/));
    visitEvents.forEach(e => expect(e.id).toMatch(/^visit-/));
    txEvents.forEach(e => expect(e.id).toMatch(/^tx-/));
    campaignEvents.forEach(e => expect(e.id).toMatch(/^campaign-/));
  });

  describe('note events', () => {
    it('should capitalize note type in title', () => {
      const result = buildMemberTimeline(mockNotes, [], [], []);
      expect(result[0].title).toContain('Follow');
      expect(result[1].title).toContain('Note');
    });

    it('should truncate long note content', () => {
      const longNote: MemberNote = {
        ...mockNotes[0],
        content: 'A'.repeat(200),
      };
      const result = buildMemberTimeline([longNote], [], [], []);
      expect(result[0].description!.length).toBeLessThanOrEqual(124); // 120 + '...'
      expect(result[0].description).toMatch(/\.\.\.$/);
    });

    it('should include pinned metadata', () => {
      const result = buildMemberTimeline(mockNotes, [], [], []);
      const pinnedNote = result.find(e => e.id === 'note-note-2');
      expect(pinnedNote?.metadata?.isPinned).toBe(true);
    });
  });

  describe('visit events', () => {
    it('should include site name in title', () => {
      const result = buildMemberTimeline([], mockVisits, [], []);
      const withSite = result.find(e => e.id === 'visit-visit-1');
      expect(withSite?.title).toBe('Visited Downtown Location');
    });

    it('should handle visits without site name', () => {
      const result = buildMemberTimeline([], mockVisits, [], []);
      const withoutSite = result.find(e => e.id === 'visit-visit-2');
      expect(withoutSite?.title).toBe('Site visit');
    });

    it('should show check-in time as description when available', () => {
      const result = buildMemberTimeline([], mockVisits, [], []);
      const withCheckIn = result.find(e => e.id === 'visit-visit-1');
      expect(withCheckIn?.description).toMatch(/Check-in:/);
    });

    it('should have null description when no check-in time', () => {
      const result = buildMemberTimeline([], mockVisits, [], []);
      const noCheckIn = result.find(e => e.id === 'visit-visit-2');
      expect(noCheckIn?.description).toBeNull();
    });
  });

  describe('transaction events', () => {
    it('should show amount in title', () => {
      const result = buildMemberTimeline([], [], mockTransactions, []);
      const purchase = result.find(e => e.id === 'tx-tx-1');
      expect(purchase?.title).toContain('$150.00');
      expect(purchase?.title).toContain('Purchase');
    });

    it('should include transaction metadata', () => {
      const result = buildMemberTimeline([], [], mockTransactions, []);
      const tx = result.find(e => e.id === 'tx-tx-1');
      expect(tx?.metadata?.amount).toBe(150.0);
      expect(tx?.metadata?.transactionType).toBe('purchase');
    });

    it('should use description when available', () => {
      const result = buildMemberTimeline([], [], mockTransactions, []);
      const withDesc = result.find(e => e.id === 'tx-tx-1');
      expect(withDesc?.description).toBe('Monthly membership');
    });
  });

  describe('campaign events', () => {
    it('should show campaign type and name in title', () => {
      const result = buildMemberTimeline([], [], [], mockCampaigns);
      const email = result.find(e => e.id === 'campaign-msg-1');
      expect(email?.title).toBe('EMAIL: March Promo');
    });

    it('should determine status from delivery chain', () => {
      const result = buildMemberTimeline([], [], [], mockCampaigns);
      const opened = result.find(e => e.id === 'campaign-msg-1');
      expect(opened?.description).toBe('Opened');

      const sent = result.find(e => e.id === 'campaign-msg-2');
      expect(sent?.description).toBe('Sent');
    });

    it('should include campaign metadata', () => {
      const result = buildMemberTimeline([], [], [], mockCampaigns);
      const event = result.find(e => e.id === 'campaign-msg-1');
      expect(event?.metadata?.campaignType).toBe('email');
    });
  });

  it('should handle only one event type', () => {
    const notesOnly = buildMemberTimeline(mockNotes, [], [], []);
    expect(notesOnly).toHaveLength(2);
    notesOnly.forEach(e => expect(e.type).toBe('note'));

    const visitsOnly = buildMemberTimeline([], mockVisits, [], []);
    expect(visitsOnly).toHaveLength(2);
    visitsOnly.forEach(e => expect(e.type).toBe('visit'));
  });
});
