/**
 * Follow-Up Widget
 * Shows high-value members who haven't visited recently and need outreach.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Skeleton } from '../Skeleton';
import { useFollowUpMembers } from '@/services/analytics';
import { useCreateNote } from '@/services/members/useMemberNotes';

// =============================================================================
// Component
// =============================================================================

export interface FollowUpWidgetProps {
  className?: string;
}

export function FollowUpWidget({ className = '' }: FollowUpWidgetProps) {
  const navigate = useNavigate();
  const { data: members, isLoading } = useFollowUpMembers(5);
  const createNote = useCreateNote();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const handleContacted = useCallback((memberId: string) => {
    setDismissedIds((prev) => new Set(prev).add(memberId));
    createNote.mutate(
      { memberId, noteType: 'call', content: 'Contacted from dashboard follow-up widget' },
      {
        onError: () => {
          setDismissedIds((prev) => {
            const next = new Set(prev);
            next.delete(memberId);
            return next;
          });
        },
      }
    );
  }, [createNote]);

  if (isLoading) {
    return (
      <Card padding="lg" className={className}>
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded" />
          ))}
        </div>
      </Card>
    );
  }

  const visibleMembers = members?.filter((m) => !dismissedIds.has(m.id)) ?? [];

  if (visibleMembers.length === 0) {
    return (
      <Card padding="lg" className={className}>
        <h3 className="text-lg font-medium text-[#003559] mb-3">Follow-Ups</h3>
        <div className="text-center py-6">
          <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-gray-500">No follow-ups needed</p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg" className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-[#003559]">Follow-Ups</h3>
        <Button variant="ghost" size="sm" onClick={() => navigate('/members')}>
          View All
        </Button>
      </div>

      <div className="space-y-3">
        {visibleMembers.map((member) => {
          const name = member.firstName || member.lastName
            ? `${member.firstName || ''} ${member.lastName || ''}`.trim()
            : 'Unknown';

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#f5f5f5] transition-colors"
            >
              {/* Name + LTV (clickable) */}
              <button
                type="button"
                onClick={() => navigate(`/members/${member.id}`)}
                className="flex-1 min-w-0 text-left"
              >
                <p className="text-sm font-medium text-[#003559] truncate">{name}</p>
                <p className="text-xs text-gray-500">
                  ${member.lifetimeValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} LTV
                </p>
              </button>

              {/* Engagement badge */}
              <Badge
                variant={member.engagement === 'warning' ? 'warning' : 'danger'}
                size="sm"
              >
                {member.daysSinceVisit}d ago
              </Badge>

              {/* Contact actions */}
              <div className="flex items-center gap-1">
                {member.email && (
                  <a
                    href={`mailto:${member.email}`}
                    className="p-1 text-gray-400 hover:text-[#0353a4] transition-colors"
                    title={`Email ${member.email}`}
                    aria-label={`Email ${name}`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </a>
                )}
                {member.phone && (
                  <a
                    href={`tel:${member.phone}`}
                    className="p-1 text-gray-400 hover:text-[#0353a4] transition-colors"
                    title={`Call ${member.phone}`}
                    aria-label={`Call ${name}`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleContacted(member.id)}
                  className="p-1 text-gray-400 hover:text-[#2e7d32] transition-colors"
                  title="Mark as contacted"
                  aria-label={`Mark ${name} as contacted`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default FollowUpWidget;
