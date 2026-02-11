/**
 * CampaignCalendar - Monthly grid view of campaigns
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Skeleton } from '../Skeleton';
import { CampaignStatusBadge } from './CampaignStatusBadge';
import { CampaignTypeIcon } from './CampaignTypeIcon';
import { useCampaigns } from '@/services/campaigns';
import type { Campaign, CampaignStatus } from '@/types/campaign';

// =============================================================================
// Types
// =============================================================================

export interface CampaignCalendarProps {
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: 'bg-gray-100 border-gray-300 text-gray-700',
  scheduled: 'bg-blue-50 border-[#0353a4] text-[#0353a4]',
  sending: 'bg-amber-50 border-[#b45309] text-[#b45309]',
  sent: 'bg-green-50 border-[#2e7d32] text-[#2e7d32]',
  failed: 'bg-red-50 border-[#d32f2f] text-[#d32f2f]',
  cancelled: 'bg-gray-50 border-gray-400 text-gray-500',
};

// =============================================================================
// Helpers
// =============================================================================

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: Array<{ date: number; isCurrentMonth: boolean }> = [];

  // Previous month padding
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ date: prevMonthDays - i, isCurrentMonth: false });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ date: d, isCurrentMonth: true });
  }

  // Next month padding (fill to complete rows)
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: i, isCurrentMonth: false });
    }
  }

  return days;
}

function getCampaignDate(campaign: Campaign): string | null {
  return campaign.scheduledAt || campaign.createdAt;
}

// =============================================================================
// Sub-components
// =============================================================================

function CalendarEvent({ campaign, onClick }: { campaign: Campaign; onClick: (id: string) => void }) {
  const colorClass = STATUS_COLORS[campaign.status];

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(campaign.id); }}
      className={`w-full text-left px-1.5 py-0.5 rounded border text-xs truncate ${colorClass} hover:opacity-80 transition-opacity`}
      title={`${campaign.name} (${campaign.status})`}
    >
      <span className="inline-flex items-center gap-1">
        <CampaignTypeIcon type={campaign.campaignType} size="sm" />
        <span className="truncate">{campaign.name}</span>
      </span>
    </button>
  );
}

// =============================================================================
// Component
// =============================================================================

export function CampaignCalendar({ className = '' }: CampaignCalendarProps) {
  const navigate = useNavigate();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  // Compute date range for the displayed month
  const dateFrom = useMemo(() => {
    const d = new Date(year, month, 1);
    return d.toISOString();
  }, [year, month]);

  const dateTo = useMemo(() => {
    const d = new Date(year, month + 1, 0, 23, 59, 59);
    return d.toISOString();
  }, [year, month]);

  // Fetch campaigns for this month (no pagination limit for calendar)
  const { data, isLoading } = useCampaigns({
    dateFrom,
    dateTo,
    limit: 200,
  });

  const campaigns = data?.campaigns ?? [];

  // Also fetch draft campaigns (no scheduled_at) for the current month
  const { data: draftData } = useCampaigns({
    status: 'draft',
    limit: 200,
  });

  const draftCampaigns = draftData?.campaigns ?? [];

  // Group campaigns by day
  const campaignsByDay = useMemo(() => {
    const map = new Map<number, Campaign[]>();

    // Scheduled campaigns in this month
    for (const c of campaigns) {
      const dateStr = getCampaignDate(c);
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        const existing = map.get(day) ?? [];
        existing.push(c);
        map.set(day, existing);
      }
    }

    // Draft campaigns placed on their creation date (if in this month)
    for (const c of draftCampaigns) {
      const d = new Date(c.createdAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        const existing = map.get(day) ?? [];
        // Avoid duplicates
        if (!existing.some(e => e.id === c.id)) {
          existing.push(c);
          map.set(day, existing);
        }
      }
    }

    return map;
  }, [campaigns, draftCampaigns, year, month]);

  const days = useMemo(() => getMonthDays(year, month), [year, month]);

  const monthLabel = useMemo(() => {
    return new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [year, month]);

  const handlePrevMonth = useCallback(() => {
    if (month === 0) {
      setYear(y => y - 1);
      setMonth(11);
    } else {
      setMonth(m => m - 1);
    }
  }, [month]);

  const handleNextMonth = useCallback(() => {
    if (month === 11) {
      setYear(y => y + 1);
      setMonth(0);
    } else {
      setMonth(m => m + 1);
    }
  }, [month]);

  const handleToday = useCallback(() => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }, [today]);

  const handleCampaignClick = useCallback((id: string) => {
    navigate(`/campaigns/${id}`);
  }, [navigate]);

  const isToday = (day: number, isCurrentMonth: boolean) =>
    isCurrentMonth &&
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  return (
    <Card className={className} padding="none">
      {/* Header */}
      <div className="p-4 border-b border-[#e0e0e0] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevMonth}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <h2 className="text-lg font-semibold text-[#003559] min-w-[180px] text-center">
            {monthLabel}
          </h2>
          <Button variant="outline" size="sm" onClick={handleNextMonth}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToday}
            disabled={month === today.getMonth() && year === today.getFullYear()}
          >
            Today
          </Button>
        </div>

        {/* Legend */}
        <div className="hidden md:flex items-center gap-3 text-xs">
          <CampaignStatusBadge status="draft" />
          <CampaignStatusBadge status="scheduled" />
          <CampaignStatusBadge status="sent" />
        </div>
      </div>

      {/* Calendar Grid */}
      {isLoading ? (
        <div className="p-4">
          <Skeleton height={400} />
        </div>
      ) : (
        <div className="overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-[#e0e0e0]">
            {DAY_NAMES.map(day => (
              <div key={day} className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase">
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const dayCampaigns = day.isCurrentMonth ? (campaignsByDay.get(day.date) ?? []) : [];
              const todayClass = isToday(day.date, day.isCurrentMonth);

              return (
                <div
                  key={i}
                  className={[
                    'min-h-[100px] border-b border-r border-[#e0e0e0] p-1',
                    day.isCurrentMonth ? 'bg-white' : 'bg-gray-50',
                  ].join(' ')}
                >
                  <div className={[
                    'text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full',
                    todayClass ? 'bg-[#0353a4] text-white' : '',
                    day.isCurrentMonth ? 'text-[#003559]' : 'text-gray-300',
                  ].join(' ')}>
                    {day.date}
                  </div>

                  <div className="space-y-0.5">
                    {dayCampaigns.slice(0, 3).map(campaign => (
                      <CalendarEvent
                        key={campaign.id}
                        campaign={campaign}
                        onClick={handleCampaignClick}
                      />
                    ))}
                    {dayCampaigns.length > 3 && (
                      <div className="text-xs text-gray-500 pl-1">
                        +{dayCampaigns.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

export default CampaignCalendar;
