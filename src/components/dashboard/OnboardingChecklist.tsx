/**
 * Onboarding Checklist
 * Shows a guided checklist for new users, persists dismissal in localStorage
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../common/Card';
import { Button } from '../common/Button';

// =============================================================================
// Types
// =============================================================================

export interface OnboardingChecklistProps {
  /** Whether any members exist */
  hasMembers: boolean;
  /** Whether messaging settings (Twilio/SendGrid) are configured */
  hasMessagingConfig: boolean;
  /** Whether any campaign exists */
  hasCampaigns: boolean;
  /** Whether any campaign has been sent */
  hasSentCampaign: boolean;
  /** Additional class names */
  className?: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  href: string;
}

// =============================================================================
// Constants
// =============================================================================

const DISMISSED_KEY = 'gimbal-onboarding-dismissed';

// =============================================================================
// Component
// =============================================================================

export function OnboardingChecklist({
  hasMembers,
  hasMessagingConfig,
  hasCampaigns,
  hasSentCampaign,
  className = '',
}: OnboardingChecklistProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === 'true'
  );

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  }, []);

  if (dismissed) return null;

  const items: ChecklistItem[] = [
    {
      id: 'members',
      label: 'Import your first members',
      description: 'Bring your audience data into Gimbal',
      completed: hasMembers,
      href: '/import/new',
    },
    {
      id: 'messaging',
      label: 'Configure messaging settings',
      description: 'Set up Twilio (SMS) and SendGrid (Email)',
      completed: hasMessagingConfig,
      href: '/admin/settings',
    },
    {
      id: 'campaign',
      label: 'Create your first campaign',
      description: 'Build an SMS or Email campaign',
      completed: hasCampaigns,
      href: '/campaigns/new',
    },
    {
      id: 'send',
      label: 'Send your first campaign',
      description: 'Reach your audience with a live campaign',
      completed: hasSentCampaign,
      href: '/campaigns',
    },
  ];

  const completedCount = items.filter((i) => i.completed).length;
  const allComplete = completedCount === items.length;

  return (
    <Card padding="lg" className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[#003559]">Getting Started</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {allComplete
              ? 'All set! You\'ve completed the onboarding steps.'
              : `${completedCount} of ${items.length} steps completed`}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleDismiss}>
          Dismiss
        </Button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-100 rounded-full mb-4">
        <div
          className="h-2 bg-[#0353a4] rounded-full transition-all duration-500"
          style={{ width: `${(completedCount / items.length) * 100}%` }}
        />
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate(item.href)}
            className={[
              'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
              item.completed
                ? 'bg-[#2e7d32]/5'
                : 'bg-[#f5f5f5] hover:bg-[#b9d6f2]/20',
            ].join(' ')}
          >
            {/* Checkbox */}
            <div
              className={[
                'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center',
                item.completed
                  ? 'bg-[#2e7d32] text-white'
                  : 'border-2 border-gray-300',
              ].join(' ')}
            >
              {item.completed && (
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p
                className={[
                  'text-sm font-medium',
                  item.completed ? 'text-[#2e7d32] line-through' : 'text-[#003559]',
                ].join(' ')}
              >
                {item.label}
              </p>
              <p className="text-xs text-gray-500">{item.description}</p>
            </div>

            {/* Arrow */}
            {!item.completed && (
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </Card>
  );
}

export default OnboardingChecklist;
