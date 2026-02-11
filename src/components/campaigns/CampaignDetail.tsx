/**
 * Campaign Detail
 * Full campaign view with metrics, content preview, and message tracking
 */

import { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Tabs } from '../common/Tabs';
import { Modal } from '../common/Modal';
import { CampaignStatusBadge } from './CampaignStatusBadge';
import { CampaignTypeIcon } from './CampaignTypeIcon';
import { CampaignMetrics } from './CampaignMetrics';
import { CampaignReportDashboard } from './CampaignReportDashboard';
import { MessageList } from './MessageList';
import { Input } from '../common/Input';
import { useCampaign, useCampaignMetrics, useScheduleCampaign, useCancelCampaign, smsService, emailService } from '@/services/campaigns';
import type { Campaign, CampaignType } from '@/types/campaign';
import type { Tab } from '../common/Tabs';

// =============================================================================
// Types
// =============================================================================

export interface CampaignDetailProps {
  campaignId: string;
  onEdit?: (campaign: Campaign) => void;
  onBack?: () => void;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function CampaignDetail({
  campaignId,
  onEdit,
  onBack,
  className = '',
}: CampaignDetailProps) {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSendTest, setShowSendTest] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'send' | null>(null);

  // Data fetching
  const { data: campaign, isLoading, error } = useCampaign(campaignId);
  const { data: metrics } = useCampaignMetrics(campaignId);

  // Mutations
  const scheduleMutation = useScheduleCampaign();
  const cancelMutation = useCancelCampaign();

  // Handlers
  const handleSchedule = async (scheduledAt: string) => {
    await scheduleMutation.mutateAsync({ id: campaignId, scheduledAt });
    setShowScheduleModal(false);
  };

  const handleConfirmAction = async () => {
    if (confirmAction === 'cancel') {
      await cancelMutation.mutateAsync(campaignId);
    } else if (confirmAction === 'send') {
      await scheduleMutation.mutateAsync({ id: campaignId, scheduledAt: new Date().toISOString() });
    }
    setConfirmAction(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={className} padding="lg">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </Card>
    );
  }

  // Error state
  if (error || !campaign) {
    return (
      <Card className={className} padding="lg">
        <div className="text-center py-8">
          <p className="text-[#d32f2f]">Failed to load campaign</p>
          {onBack && (
            <Button variant="outline" onClick={onBack} className="mt-4">
              Go Back
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const canEdit = campaign.status === 'draft';
  const canSchedule = campaign.status === 'draft';
  const canCancel = campaign.status === 'scheduled';
  const canSendNow = campaign.status === 'draft';
  const showReport = campaign.status === 'sent' || campaign.status === 'sending';

  // Build tabs array
  const tabs: Tab[] = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="space-y-6">
          {metrics && <CampaignMetrics metrics={metrics} campaignType={campaign.campaignType} />}

          <Card padding="lg">
            <h3 className="text-lg font-medium text-[#003559] mb-4">Campaign Details</h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Type</dt>
                <dd className="text-sm font-medium capitalize">{campaign.campaignType}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Target Audience</dt>
                <dd className="text-sm font-medium">
                  {campaign.targetAllMembers
                    ? 'All Members'
                    : `Members with status: ${campaign.membershipStatuses.join(', ')}`}
                </dd>
              </div>
              {campaign.campaignType === 'email' && campaign.subject && (
                <div className="col-span-2">
                  <dt className="text-sm text-gray-500">Subject Line</dt>
                  <dd className="text-sm font-medium">{campaign.subject}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-gray-500">Total Recipients</dt>
                <dd className="text-sm font-medium">{campaign.totalRecipients.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Messages Sent</dt>
                <dd className="text-sm font-medium">{campaign.totalSent.toLocaleString()}</dd>
              </div>
            </dl>
          </Card>

          {campaign.abTestEnabled && (
            <Card padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-[#003559]">A/B Test</h3>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>Metric: {campaign.abTestMetric === 'click_rate' ? 'Click Rate' : 'Open Rate'}</span>
                  <span className="text-gray-300">|</span>
                  <span>Sample: {campaign.abTestSamplePct}%</span>
                  <span className="text-gray-300">|</span>
                  <span>Duration: {campaign.abTestDurationHours}h</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Variant A */}
                <div className={`p-4 rounded-lg border-2 ${campaign.abTestWinner === 'a' ? 'border-[#2e7d32] bg-[#2e7d32]/5' : 'border-[#e0e0e0]'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant={campaign.abTestWinner === 'a' ? 'success' : 'default'}>
                      Variant A
                    </Badge>
                    {campaign.abTestWinner === 'a' && (
                      <Badge variant="success">Winner</Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <dt className="text-xs text-gray-500">Subject</dt>
                      <dd className="text-sm font-medium">{campaign.subject}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Content Preview</dt>
                      <dd className="text-xs text-gray-600 mt-1 p-2 bg-[#f5f5f5] rounded font-mono line-clamp-3">
                        {campaign.content.slice(0, 200)}
                        {campaign.content.length > 200 ? '...' : ''}
                      </dd>
                    </div>
                  </div>
                </div>

                {/* Variant B */}
                <div className={`p-4 rounded-lg border-2 ${campaign.abTestWinner === 'b' ? 'border-[#2e7d32] bg-[#2e7d32]/5' : 'border-[#e0e0e0]'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant={campaign.abTestWinner === 'b' ? 'success' : 'default'}>
                      Variant B
                    </Badge>
                    {campaign.abTestWinner === 'b' && (
                      <Badge variant="success">Winner</Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <dt className="text-xs text-gray-500">Subject</dt>
                      <dd className="text-sm font-medium">{campaign.abVariantBSubject}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Content Preview</dt>
                      <dd className="text-xs text-gray-600 mt-1 p-2 bg-[#f5f5f5] rounded font-mono line-clamp-3">
                        {(campaign.abVariantBContent || campaign.content).slice(0, 200)}
                        {(campaign.abVariantBContent || campaign.content).length > 200 ? '...' : ''}
                      </dd>
                    </div>
                  </div>
                </div>
              </div>

              {!campaign.abTestWinner && (campaign.status === 'sending' || campaign.status === 'sent') && (
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Winner will be determined after the {campaign.abTestDurationHours}-hour test period.
                </p>
              )}
            </Card>
          )}

          <Card padding="lg">
            <h3 className="text-lg font-medium text-[#003559] mb-4">Timeline</h3>
            <div className="space-y-3">
              <TimelineItem label="Created" date={campaign.createdAt} completed />
              {campaign.scheduledAt && (
                <TimelineItem label="Scheduled" date={campaign.scheduledAt} completed={!!campaign.startedAt} />
              )}
              {campaign.startedAt && (
                <TimelineItem label="Started Sending" date={campaign.startedAt} completed />
              )}
              {campaign.completedAt && (
                <TimelineItem label="Completed" date={campaign.completedAt} completed />
              )}
            </div>
          </Card>
        </div>
      ),
    },
    {
      id: 'messages',
      label: 'Messages',
      content: <MessageList campaignId={campaignId} />,
    },
    {
      id: 'content',
      label: 'Content',
      content: (
        <Card padding="lg">
          <h3 className="text-lg font-medium text-[#003559] mb-4">Message Content</h3>
          {campaign.campaignType === 'email' && campaign.subject && (
            <div className="mb-4">
              <label className="text-sm text-gray-500">Subject</label>
              <p className="text-sm font-medium">{campaign.subject}</p>
            </div>
          )}
          <div>
            <label className="text-sm text-gray-500">Body</label>
            <div className="mt-2 p-4 bg-[#f5f5f5] rounded-lg font-mono text-sm whitespace-pre-wrap">
              {campaign.content}
            </div>
          </div>
        </Card>
      ),
    },
    ...(showReport
      ? [
          {
            id: 'report',
            label: 'Report',
            content: (
              <CampaignReportDashboard campaignId={campaignId} campaignType={campaign.campaignType} />
            ),
          },
        ]
      : []),
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card padding="lg">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Button>
            )}
            <div>
              <div className="flex items-center gap-3">
                <CampaignTypeIcon type={campaign.campaignType} size="lg" />
                <h1 className="text-2xl font-semibold text-[#003559]">{campaign.name}</h1>
                <CampaignStatusBadge status={campaign.status} />
              </div>
              {campaign.description && (
                <p className="text-gray-600 mt-2">{campaign.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <span>Created {new Date(campaign.createdAt).toLocaleDateString()}</span>
                {campaign.scheduledAt && (
                  <span>Scheduled for {new Date(campaign.scheduledAt).toLocaleString()}</span>
                )}
                {campaign.site && (
                  <Badge variant="default">{campaign.site.name}</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {canEdit && onEdit && (
              <Button variant="outline" onClick={() => onEdit(campaign)}>
                Edit
              </Button>
            )}
            {canSchedule && (
              <Button variant="outline" onClick={() => setShowScheduleModal(true)}>
                Schedule
              </Button>
            )}
            {(canSendNow || canSchedule) && (
              <Button variant="outline" onClick={() => setShowSendTest(true)}>
                Send Test
              </Button>
            )}
            {canSendNow && (
              <Button onClick={() => setConfirmAction('send')} loading={scheduleMutation.isPending}>
                Send Now
              </Button>
            )}
            {canCancel && (
              <Button variant="danger" onClick={() => setConfirmAction('cancel')} loading={cancelMutation.isPending}>
                Cancel Campaign
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs tabs={tabs} defaultTab="overview" />

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onSchedule={handleSchedule}
        onClose={() => setShowScheduleModal(false)}
        loading={scheduleMutation.isPending}
      />

      {/* Send Test Modal */}
      {campaign && (
        <SendTestModal
          isOpen={showSendTest}
          campaignType={campaign.campaignType}
          subject={campaign.subject || ''}
          content={campaign.content}
          onClose={() => setShowSendTest(false)}
        />
      )}

      {/* Confirm Action Dialog */}
      <ConfirmDialog
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={confirmAction === 'cancel' ? 'Cancel Campaign' : 'Send Campaign Now'}
        message={
          confirmAction === 'cancel'
            ? 'Are you sure you want to cancel this campaign? This action cannot be undone.'
            : 'Are you sure you want to send this campaign immediately to all recipients?'
        }
        confirmLabel={confirmAction === 'cancel' ? 'Cancel Campaign' : 'Send Now'}
        confirmVariant={confirmAction === 'cancel' ? 'danger' : 'primary'}
        loading={cancelMutation.isPending || scheduleMutation.isPending}
      />
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function TimelineItem({
  label,
  date,
  completed,
}: {
  label: string;
  date: string;
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-3 h-3 rounded-full ${
          completed ? 'bg-[#2e7d32]' : 'bg-gray-300'
        }`}
      />
      <div className="flex-1">
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-sm text-gray-500">
        {new Date(date).toLocaleString()}
      </span>
    </div>
  );
}

function ScheduleModal({
  isOpen,
  onSchedule,
  onClose,
  loading,
}: {
  isOpen: boolean;
  onSchedule: (scheduledAt: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [dateTime, setDateTime] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (dateTime) {
      onSchedule(new Date(dateTime).toISOString());
    }
  };

  // Get minimum date (now + 5 minutes)
  const minDateTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule Campaign"
      size="sm"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="schedule-form" loading={loading}>
            Schedule
          </Button>
        </>
      }
    >
      <form id="schedule-form" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="schedule-datetime" className="block text-sm font-medium text-gray-700 mb-1">
            Send Date & Time
          </label>
          <input
            type="datetime-local"
            id="schedule-datetime"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            min={minDateTime}
            className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0353a4]"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Note: SMS campaigns will respect quiet hours (8 AM - 9 PM recipient timezone)
          </p>
        </div>
      </form>
    </Modal>
  );
}

function SendTestModal({
  isOpen,
  campaignType,
  subject,
  content,
  onClose,
}: {
  isOpen: boolean;
  campaignType: CampaignType;
  subject: string;
  content: string;
  onClose: () => void;
}) {
  const [recipient, setRecipient] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const isEmail = campaignType === 'email';
  const placeholder = isEmail ? 'test@example.com' : '+15551234567';
  const label = isEmail ? 'Recipient Email' : 'Recipient Phone';

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim()) return;

    setSending(true);
    setResult(null);

    try {
      const testMessageId = crypto.randomUUID();

      if (isEmail) {
        const res = await emailService.sendSingle({
          messageId: testMessageId,
          to: recipient.trim(),
          subject: `[TEST] ${subject}`,
          html: content,
        });
        setResult({
          success: res.success,
          message: res.success ? 'Test email sent successfully!' : (res.error || 'Failed to send test email'),
        });
      } else {
        const formatted = smsService.formatPhoneNumber(recipient.trim());
        if (!formatted) {
          setResult({ success: false, message: 'Invalid phone number. Use E.164 format (e.g., +15551234567).' });
          setSending(false);
          return;
        }
        const res = await smsService.sendSingle({
          messageId: testMessageId,
          to: formatted,
          body: content,
        });
        setResult({
          success: res.success,
          message: res.success ? 'Test SMS sent successfully!' : (res.error || 'Failed to send test SMS'),
        });
      }
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to send test message',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send Test Message"
      size="sm"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={sending}>
            {result?.success ? 'Done' : 'Cancel'}
          </Button>
          <Button type="submit" form="send-test-form" loading={sending}>
            Send Test
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-500 mb-4">
        Send a test {isEmail ? 'email' : 'SMS'} to verify the content before sending to your audience.
      </p>

      <form id="send-test-form" onSubmit={handleSend}>
        <div className="mb-4">
          <Input
            label={label}
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder={placeholder}
            type={isEmail ? 'email' : 'tel'}
            required
          />
        </div>

        {result && (
          <div
            className={`p-3 rounded-lg text-sm ${
              result.success
                ? 'bg-[#2e7d32]/10 text-[#2e7d32] border border-[#2e7d32]/20'
                : 'bg-[#d32f2f]/10 text-[#d32f2f] border border-[#d32f2f]/20'
            }`}
            role="alert"
          >
            {result.message}
          </div>
        )}
      </form>
    </Modal>
  );
}

export default CampaignDetail;
