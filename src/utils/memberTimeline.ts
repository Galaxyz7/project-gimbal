/**
 * memberTimeline - Builds a unified chronological timeline from member activity
 */

import type { MemberNote } from '@/types/member';
import type { MemberCampaignActivity } from '@/types/campaign';

// =============================================================================
// Types
// =============================================================================

export type TimelineEventType = 'note' | 'visit' | 'transaction' | 'campaign';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  timestamp: string;
  title: string;
  description: string | null;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Builder
// =============================================================================

interface MemberVisit {
  id: string;
  visitDate: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  siteName?: string;
}

interface MemberTransaction {
  id: string;
  transactionDate: string;
  amount: number;
  transactionType: string;
  description?: string | null;
  siteName?: string;
}

export function buildMemberTimeline(
  notes: MemberNote[],
  visits: MemberVisit[],
  transactions: MemberTransaction[],
  campaigns: MemberCampaignActivity[]
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Notes
  for (const note of notes) {
    events.push({
      id: `note-${note.id}`,
      type: 'note',
      timestamp: note.createdAt,
      title: `${note.noteType.charAt(0).toUpperCase() + note.noteType.slice(1).replace('_', ' ')} note`,
      description: note.content.length > 120 ? note.content.slice(0, 120) + '...' : note.content,
      metadata: { noteType: note.noteType, isPinned: note.isPinned },
    });
  }

  // Visits
  for (const visit of visits) {
    events.push({
      id: `visit-${visit.id}`,
      type: 'visit',
      timestamp: visit.visitDate,
      title: visit.siteName ? `Visited ${visit.siteName}` : 'Site visit',
      description: visit.checkInTime
        ? `Check-in: ${new Date(visit.checkInTime).toLocaleTimeString()}`
        : null,
    });
  }

  // Transactions
  for (const tx of transactions) {
    events.push({
      id: `tx-${tx.id}`,
      type: 'transaction',
      timestamp: tx.transactionDate,
      title: `${tx.transactionType.charAt(0).toUpperCase() + tx.transactionType.slice(1)}: $${tx.amount.toFixed(2)}`,
      description: tx.description || (tx.siteName ? `at ${tx.siteName}` : null),
      metadata: { amount: tx.amount, transactionType: tx.transactionType },
    });
  }

  // Campaigns
  for (const c of campaigns) {
    const status = c.openedAt ? 'Opened' : c.deliveredAt ? 'Delivered' : c.sentAt ? 'Sent' : 'Queued';
    events.push({
      id: `campaign-${c.id}`,
      type: 'campaign',
      timestamp: c.sentAt || c.queuedAt,
      title: `${c.campaignType.toUpperCase()}: ${c.campaignName}`,
      description: status,
      metadata: { campaignType: c.campaignType, status: c.status },
    });
  }

  // Sort by timestamp descending (newest first)
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return events;
}
