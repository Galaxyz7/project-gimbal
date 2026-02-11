import { useState, useEffect, useMemo } from 'react';
import type { MemberWithDetails, MemberTransaction, MemberVisit, VisitStats, LtvBreakdown, NoteType } from '@/types/member';
import type { MemberCampaignActivity } from '@/types/campaign';
import {
  getMemberWithDetails,
  getMemberTransactions,
  getMemberVisits,
  getVisitStats,
  getLtvBreakdown,
} from '@/services/members/memberService';
import { getMemberMessages } from '@/services/campaigns/messageService';
import { useMemberNotes, useCreateNote, useUpdateNote, useDeleteNote } from '@/services/members/useMemberNotes';
import { Card, CardHeader } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Tabs } from '../common/Tabs';
import type { Tab } from '../common/Tabs';
import { buildMemberTimeline } from '@/utils/memberTimeline';
import type { TimelineEvent } from '@/utils/memberTimeline';

// =============================================================================
// Types
// =============================================================================

export interface MemberDetailProps {
  /** Member ID to display */
  memberId: string;
  /** Called when edit button is clicked */
  onEdit?: () => void;
  /** Called when back button is clicked */
  onBack?: () => void;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Icons
// =============================================================================

function UserIcon() {
  return (
    <svg className="w-20 h-20 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  color?: 'default' | 'success' | 'warning' | 'error';
}

function StatCard({ label, value, subValue, color = 'default' }: StatCardProps) {
  const colorClasses = {
    default: 'text-[#003559]',
    success: 'text-[#2e7d32]',
    warning: 'text-[#b45309]',
    error: 'text-[#d32f2f]',
  };

  return (
    <div className="text-center p-4 bg-[#f5f5f5] rounded-lg">
      <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
      {subValue && <div className="text-xs text-gray-400 mt-1">{subValue}</div>}
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex justify-between py-2 border-b border-[#e0e0e0] last:border-b-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-[#003559]">{value || '—'}</span>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Member detail view with full profile, transactions, and visits.
 *
 * @example
 * <MemberDetail
 *   memberId={selectedMemberId}
 *   onEdit={() => openEditModal()}
 *   onBack={() => navigate('/audience')}
 * />
 */
export function MemberDetail({
  memberId,
  onEdit,
  onBack,
  className = '',
}: MemberDetailProps) {
  const [member, setMember] = useState<MemberWithDetails | null>(null);
  const [transactions, setTransactions] = useState<MemberTransaction[]>([]);
  const [visits, setVisits] = useState<MemberVisit[]>([]);
  const [visitStats, setVisitStats] = useState<VisitStats | null>(null);
  const [ltvBreakdown, setLtvBreakdown] = useState<LtvBreakdown[]>([]);
  const [campaignActivity, setCampaignActivity] = useState<MemberCampaignActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [memberData, transData, visitData, statsData, ltvData, campaignData] = await Promise.all([
          getMemberWithDetails(memberId),
          getMemberTransactions(memberId),
          getMemberVisits(memberId),
          getVisitStats(memberId),
          getLtvBreakdown(memberId),
          getMemberMessages(memberId),
        ]);

        setMember(memberData);
        setTransactions(transData);
        setVisits(visitData);
        setVisitStats(statsData);
        setLtvBreakdown(ltvData);
        setCampaignActivity(campaignData);
      } catch (err) {
        console.error('Failed to fetch member:', err);
        setError('Failed to load member details');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [memberId]);

  // Loading state
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <div className="animate-pulse flex items-center gap-6">
            <div className="w-20 h-20 bg-gray-200 rounded-full" />
            <div className="flex-1">
              <div className="h-6 w-48 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-32 bg-gray-100 rounded" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !member) {
    return (
      <Card className={className}>
        <div className="text-center py-8">
          <p className="text-[#d32f2f] mb-4">{error || 'Member not found'}</p>
          {onBack && (
            <Button onClick={onBack} variant="ghost" leftIcon={<ArrowLeftIcon />}>
              Go Back
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const fullName = [member.firstName, member.lastName].filter(Boolean).join(' ') || 'Unnamed Member';
  const fullAddress = [
    member.addressLine1,
    member.addressLine2,
    member.city && member.state ? `${member.city}, ${member.state}` : member.city || member.state,
    member.postalCode,
  ].filter(Boolean).join(', ');

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} leftIcon={<ArrowLeftIcon />}>
                Back
              </Button>
            )}
            <div className="w-20 h-20 bg-[#f5f5f5] rounded-full flex items-center justify-center">
              <UserIcon />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#003559]">{fullName}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={member.membershipStatus === 'active' ? 'success' : 'warning'}
                >
                  {member.membershipStatus}
                </Badge>
                {member.membershipLevel && (
                  <Badge variant="secondary">{member.membershipLevel.name}</Badge>
                )}
              </div>
            </div>
          </div>
          {onEdit && (
            <Button onClick={onEdit} variant="outline" leftIcon={<PencilIcon />}>
              Edit
            </Button>
          )}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Lifetime Value"
          value={`$${member.lifetimeValue.toLocaleString()}`}
          color="success"
        />
        <StatCard
          label="Total Visits"
          value={member.totalVisits}
          subValue={visitStats ? `${visitStats.avgVisitsPerMonth.toFixed(1)}/month avg` : undefined}
        />
        <StatCard
          label="Avg Transaction"
          value={`$${member.averageTransaction.toFixed(0)}`}
        />
        <StatCard
          label="Days Since Visit"
          value={
            member.lastVisitAt
              ? Math.floor((Date.now() - new Date(member.lastVisitAt).getTime()) / (1000 * 60 * 60 * 24))
              : 'N/A'
          }
          color={
            member.lastVisitAt &&
            (Date.now() - new Date(member.lastVisitAt).getTime()) / (1000 * 60 * 60 * 24) > 30
              ? 'warning'
              : 'default'
          }
        />
      </div>

      {/* Tabs */}
      <MemberTabs
        member={member}
        fullAddress={fullAddress}
        transactions={transactions}
        visits={visits}
        ltvBreakdown={ltvBreakdown}
        campaignActivity={campaignActivity}
      />
    </div>
  );
}

// =============================================================================
// MemberTabs
// =============================================================================

function MemberTabs({
  member,
  fullAddress,
  transactions,
  visits,
  ltvBreakdown,
  campaignActivity,
}: {
  member: MemberWithDetails;
  fullAddress: string;
  transactions: MemberTransaction[];
  visits: MemberVisit[];
  ltvBreakdown: LtvBreakdown[];
  campaignActivity: MemberCampaignActivity[];
}) {
  const tabs: Tab[] = useMemo(() => [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Info */}
          <Card className="border-[#b9d6f2]">
            <CardHeader>Contact Information</CardHeader>
            <div className="p-4 space-y-1">
              <InfoRow label="Email" value={member.email ? <a href={`mailto:${member.email}`} className="text-[#0353a4] hover:underline">{member.email}</a> : null} />
              <InfoRow label="Phone" value={member.phone ? <a href={`tel:${member.phone}`} className="text-[#0353a4] hover:underline">{member.phone}</a> : null} />
              <InfoRow label="Address" value={fullAddress} />
              <InfoRow
                label="Date of Birth"
                value={member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString() : null}
              />
            </div>
          </Card>

          {/* Membership Info */}
          <Card className="border-[#b9d6f2]">
            <CardHeader>Membership</CardHeader>
            <div className="p-4 space-y-1">
              <InfoRow label="Site" value={member.site?.name} />
              <InfoRow label="Level" value={member.membershipLevel?.name} />
              <InfoRow label="Status" value={<Badge variant={member.membershipStatus === 'active' ? 'success' : 'warning'}>{member.membershipStatus}</Badge>} />
              <InfoRow
                label="Start Date"
                value={member.membershipStartDate ? new Date(member.membershipStartDate).toLocaleDateString() : null}
              />
              <InfoRow
                label="Expiry Date"
                value={member.membershipExpiryDate ? new Date(member.membershipExpiryDate).toLocaleDateString() : null}
              />
            </div>
          </Card>

          {/* Engagement Summary */}
          <Card>
            <CardHeader>Engagement Summary</CardHeader>
            <div className="p-4">
              {campaignActivity.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">No campaign activity yet</p>
              ) : (
                (() => {
                  const emails = campaignActivity.filter(c => c.campaignType === 'email');
                  const sms = campaignActivity.filter(c => c.campaignType === 'sms');
                  const emailsDelivered = emails.filter(c => c.deliveredAt).length;
                  const emailsOpened = emails.filter(c => c.openedAt).length;
                  const emailsClicked = emails.filter(c => c.clickedAt).length;
                  const smsDelivered = sms.filter(c => c.deliveredAt).length;
                  const openRate = emailsDelivered > 0 ? Math.round((emailsOpened / emailsDelivered) * 100) : null;
                  const clickRate = emailsDelivered > 0 ? Math.round((emailsClicked / emailsDelivered) * 100) : null;
                  const lastCampaign = campaignActivity
                    .filter(c => c.sentAt)
                    .sort((a, b) => new Date(b.sentAt!).getTime() - new Date(a.sentAt!).getTime())[0];

                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-3 bg-[#f5f5f5] rounded-lg">
                          <div className="text-lg font-bold text-[#003559]">{campaignActivity.length}</div>
                          <div className="text-xs text-gray-500">Total Campaigns</div>
                        </div>
                        <div className="text-center p-3 bg-[#f5f5f5] rounded-lg">
                          <div className="text-lg font-bold text-[#003559]">{openRate !== null ? `${openRate}%` : '--'}</div>
                          <div className="text-xs text-gray-500">Open Rate</div>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm">
                        <InfoRow label="Emails Sent" value={emails.length} />
                        <InfoRow label="Emails Opened" value={emailsOpened} />
                        <InfoRow label="Email Click Rate" value={clickRate !== null ? `${clickRate}%` : '--'} />
                        <InfoRow label="SMS Sent" value={sms.length} />
                        <InfoRow label="SMS Delivered" value={smsDelivered} />
                        {lastCampaign && (
                          <InfoRow label="Last Campaign" value={new Date(lastCampaign.sentAt!).toLocaleDateString()} />
                        )}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </Card>

          {/* Acquisition */}
          <Card>
            <CardHeader>Acquisition</CardHeader>
            <div className="p-4 space-y-1">
              <InfoRow label="Source" value={member.acquisitionSource} />
              <InfoRow label="Promo Code" value={member.acquisitionPromoCode} />
              <InfoRow label="CAC" value={member.acquisitionCost ? `$${member.acquisitionCost.toFixed(2)}` : null} />
              <InfoRow
                label="Acquisition Date"
                value={member.acquisitionDate ? new Date(member.acquisitionDate).toLocaleDateString() : null}
              />
            </div>
          </Card>

          {/* LTV Breakdown */}
          {ltvBreakdown.length > 0 && (
            <Card>
              <CardHeader>LTV Breakdown</CardHeader>
              <div className="p-4 space-y-1">
                {ltvBreakdown.map((item) => (
                  <InfoRow
                    key={item.transactionType}
                    label={item.transactionType.replace('_', ' ')}
                    value={`$${item.totalAmount.toLocaleString()} (${item.transactionCount} txns)`}
                  />
                ))}
              </div>
            </Card>
          )}

          {/* Tags */}
          {member.tags.length > 0 && (
            <Card>
              <CardHeader>Tags</CardHeader>
              <div className="p-4 flex flex-wrap gap-2">
                {member.tags.map((tag) => (
                  <Badge key={tag} variant="default">{tag}</Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Consent */}
          {member.consent && (
            <Card>
              <CardHeader>Consent</CardHeader>
              <div className="p-4 space-y-1">
                <InfoRow
                  label="SMS"
                  value={
                    <Badge variant={member.consent.smsConsent ? 'success' : 'default'}>
                      {member.consent.smsConsent ? 'Opted In' : 'Not Opted In'}
                    </Badge>
                  }
                />
                <InfoRow
                  label="Email"
                  value={
                    <Badge variant={member.consent.emailConsent ? 'success' : 'default'}>
                      {member.consent.emailConsent ? 'Subscribed' : 'Unsubscribed'}
                    </Badge>
                  }
                />
                <InfoRow label="Preferred Channel" value={member.consent.preferredChannel} />
              </div>
            </Card>
          )}
        </div>
      ),
    },
    {
      id: 'transactions',
      label: `Transactions (${transactions.length})`,
      content: (
        <Card padding="none">
          <CardHeader>Transaction History</CardHeader>
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No transactions yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f5f5f5] border-b border-[#e0e0e0]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#003559] uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {transactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-[#f5f5f5]">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(txn.transactionDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={txn.transactionType === 'refund' ? 'danger' : 'default'} size="sm">
                          {txn.transactionType.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{txn.description || '—'}</td>
                      <td className={`px-4 py-3 text-sm font-medium text-right ${txn.transactionType === 'refund' ? 'text-[#d32f2f]' : 'text-[#2e7d32]'}`}>
                        {txn.transactionType === 'refund' ? '-' : ''}${Math.abs(txn.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ),
    },
    {
      id: 'visits',
      label: `Visits (${visits.length})`,
      content: (
        <Card padding="none">
          <CardHeader>Visit History</CardHeader>
          {visits.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No visits recorded</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f5f5f5] border-b border-[#e0e0e0]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {visits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-[#f5f5f5]">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(visit.visitDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {visit.checkInTime
                          ? new Date(visit.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="default" size="sm">{visit.visitType}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{visit.serviceName || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-[200px]">{visit.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ),
    },
    {
      id: 'campaigns',
      label: `Campaign Activity (${campaignActivity.length})`,
      content: (
        <Card padding="none">
          <CardHeader>Campaign Activity</CardHeader>
          {campaignActivity.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No campaigns sent to this member</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f5f5f5] border-b border-[#e0e0e0]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase">Campaign</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase">Sent</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase">Delivered</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase">Opened</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase">Clicked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {campaignActivity.map((msg) => {
                    const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'default' | 'secondary'> = {
                      delivered: 'success',
                      opened: 'success',
                      clicked: 'success',
                      sent: 'secondary',
                      queued: 'default',
                      bounced: 'danger',
                      failed: 'danger',
                    };

                    return (
                      <tr key={msg.id} className="hover:bg-[#f5f5f5]">
                        <td className="px-4 py-3 text-sm font-medium text-[#003559]">
                          {msg.campaignName}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" size="sm">
                            {msg.campaignType.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusVariant[msg.status] ?? 'default'} size="sm">
                            {msg.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {msg.sentAt ? new Date(msg.sentAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {msg.deliveredAt ? new Date(msg.deliveredAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {msg.openedAt ? new Date(msg.openedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {msg.clickedAt ? new Date(msg.clickedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ),
    },
    {
      id: 'timeline',
      label: 'Timeline',
      content: (
        <TimelineTab
          memberId={member.id}
          visits={visits}
          transactions={transactions}
          campaignActivity={campaignActivity}
        />
      ),
    },
    {
      id: 'notes',
      label: 'Notes',
      content: <NotesTab memberId={member.id} />,
    },
  ], [member, fullAddress, transactions, visits, ltvBreakdown, campaignActivity]);

  return <Tabs tabs={tabs} defaultTab="overview" />;
}

// =============================================================================
// TimelineTab
// =============================================================================

const EVENT_COLORS: Record<TimelineEvent['type'], string> = {
  note: '#0353a4',
  visit: '#2e7d32',
  transaction: '#006daa',
  campaign: '#b45309',
};

const EVENT_LABELS: Record<TimelineEvent['type'], string> = {
  note: 'Note',
  visit: 'Visit',
  transaction: 'Transaction',
  campaign: 'Campaign',
};

function TimelineTab({
  memberId,
  visits,
  transactions,
  campaignActivity,
}: {
  memberId: string;
  visits: MemberVisit[];
  transactions: MemberTransaction[];
  campaignActivity: MemberCampaignActivity[];
}) {
  const { data: notes } = useMemberNotes(memberId);

  const events = useMemo(
    () => buildMemberTimeline(notes ?? [], visits, transactions, campaignActivity),
    [notes, visits, transactions, campaignActivity]
  );

  if (events.length === 0) {
    return (
      <Card>
        <div className="p-8 text-center text-gray-500">No activity recorded yet</div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>Activity Timeline</CardHeader>
      <div className="p-4">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-3 top-2 bottom-2 w-px bg-[#e0e0e0]" />

          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="relative pl-9">
                {/* Colored dot */}
                <div
                  className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-white"
                  style={{ backgroundColor: EVENT_COLORS[event.type] }}
                />

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          event.type === 'note' ? 'default'
                            : event.type === 'visit' ? 'success'
                            : event.type === 'transaction' ? 'info'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {EVENT_LABELS[event.type]}
                      </Badge>
                      <span className="text-sm font-medium text-[#003559] truncate">
                        {event.title}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-sm text-gray-500 mt-0.5 truncate">{event.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(event.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// NotesTab
// =============================================================================

const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  note: 'Note',
  call: 'Call',
  meeting: 'Meeting',
  email_log: 'Email',
  follow_up: 'Follow-Up',
};

const NOTE_TYPE_VARIANTS: Record<NoteType, 'default' | 'secondary' | 'success' | 'info' | 'warning'> = {
  note: 'default',
  call: 'secondary',
  meeting: 'success',
  email_log: 'info',
  follow_up: 'warning',
};

function NotesTab({ memberId }: { memberId: string }) {
  const { data: notes, isLoading } = useMemberNotes(memberId);
  const createNote = useCreateNote();
  const updateNote = useUpdateNote(memberId);
  const deleteNote = useDeleteNote(memberId);

  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('note');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    createNote.mutate(
      { memberId, content: content.trim(), noteType },
      {
        onSuccess: () => {
          setContent('');
          setNoteType('note');
        },
      }
    );
  };

  const handlePin = (noteId: string, isPinned: boolean) => {
    updateNote.mutate({ noteId, input: { isPinned: !isPinned } });
  };

  const handleDelete = (noteId: string) => {
    deleteNote.mutate(noteId);
  };

  return (
    <Card>
      <CardHeader>Notes</CardHeader>
      <div className="p-4 space-y-4">
        {/* Add note form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center gap-2">
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value as NoteType)}
              className="text-sm border border-[#e0e0e0] rounded-lg px-3 py-2 bg-white text-[#003559] focus:outline-none focus:ring-2 focus:ring-[#0353a4]"
              aria-label="Note type"
            >
              {Object.entries(NOTE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a note..."
            rows={3}
            className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 text-sm text-[#003559] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0353a4] resize-none"
            aria-label="Note content"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={!content.trim() || createNote.isPending}
            >
              {createNote.isPending ? 'Saving...' : 'Add Note'}
            </Button>
          </div>
        </form>

        {/* Notes list */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-[#f5f5f5] rounded-lg h-20" />
            ))}
          </div>
        ) : !notes || notes.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-500">No notes yet</div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`p-3 rounded-lg border ${note.isPinned ? 'border-[#b9d6f2] bg-[#f0f7ff]' : 'border-[#e0e0e0] bg-white'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={NOTE_TYPE_VARIANTS[note.noteType]} size="sm">
                      {NOTE_TYPE_LABELS[note.noteType]}
                    </Badge>
                    {note.isPinned && (
                      <span className="text-xs text-[#0353a4] font-medium">Pinned</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handlePin(note.id, note.isPinned)}
                      className="p-1 text-gray-400 hover:text-[#0353a4] transition-colors"
                      title={note.isPinned ? 'Unpin' : 'Pin'}
                      aria-label={note.isPinned ? 'Unpin note' : 'Pin note'}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5 5a2 2 0 012-2h6a2 2 0 012 2v2a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" />
                        <path d="M8 12v5l2-2 2 2v-5" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(note.id)}
                      className="p-1 text-gray-400 hover:text-[#d32f2f] transition-colors"
                      title="Delete note"
                      aria-label="Delete note"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-[#003559] whitespace-pre-wrap">{note.content}</p>
                <p className="mt-2 text-xs text-gray-400">
                  {new Date(note.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

export default MemberDetail;
