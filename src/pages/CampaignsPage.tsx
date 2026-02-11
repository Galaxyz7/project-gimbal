/**
 * Campaigns Page
 * List view of all campaigns with create button and calendar toggle
 */

import { memo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout';
import { CampaignList } from '../components/campaigns';
import { CampaignCalendar } from '../components/campaigns/CampaignCalendar';
import { Button } from '../components/common/Button';
import { PageHeader } from '../components/common/PageHeader';
import { PlusIcon } from '../components/common/icons';
import { useNavigation } from '../hooks/useNavigation';
import { useHotkey } from '../hooks/useHotkey';

// =============================================================================
// Icons
// =============================================================================

function ListIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

export const CampaignsPage = memo(function CampaignsPage() {
  const navigate = useNavigate();
  const { navItems } = useNavigation();
  const [view, setView] = useState<'list' | 'calendar'>('list');

  const handleCreateCampaign = useCallback(() => {
    navigate('/campaigns/new');
  }, [navigate]);

  const handleSelectCampaign = useCallback(
    (campaignId: string) => {
      navigate(`/campaigns/${campaignId}`);
    },
    [navigate]
  );

  const focusSearch = useCallback(() => {
    const input = document.querySelector<HTMLInputElement>('input[type="search"], input[placeholder*="Search"]');
    input?.focus();
  }, []);

  // Keyboard shortcuts
  useHotkey('n', handleCreateCampaign);
  useHotkey('/', focusSearch);

  return (
    <AppLayout navItems={navItems}>
      <PageHeader
        title="Campaigns"
        description="Create and manage SMS and email marketing campaigns"
        actions={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-lg border border-[#e0e0e0] overflow-hidden">
              <button
                type="button"
                onClick={() => setView('list')}
                className={[
                  'px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors',
                  view === 'list'
                    ? 'bg-[#0353a4] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50',
                ].join(' ')}
                aria-label="List view"
              >
                <ListIcon />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                type="button"
                onClick={() => setView('calendar')}
                className={[
                  'px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors',
                  view === 'calendar'
                    ? 'bg-[#0353a4] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50',
                ].join(' ')}
                aria-label="Calendar view"
              >
                <CalendarIcon />
                <span className="hidden sm:inline">Calendar</span>
              </button>
            </div>

            <Button onClick={handleCreateCampaign} leftIcon={<PlusIcon />}>
              Create Campaign
            </Button>
          </div>
        }
      />

      {view === 'list' ? (
        <CampaignList
          onSelect={handleSelectCampaign}
          onCreate={handleCreateCampaign}
        />
      ) : (
        <CampaignCalendar />
      )}
    </AppLayout>
  );
});

export default CampaignsPage;
