/**
 * Campaign Management Type Definitions
 * Types for campaigns, templates, and messages
 */

// =============================================================================
// Enums / Status Types
// =============================================================================

export type CampaignType = 'sms' | 'email';

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';

export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';

// =============================================================================
// Campaign Types
// =============================================================================

export interface Campaign {
  id: string;
  userId: string;
  siteId: string | null;
  name: string;
  description: string | null;
  campaignType: CampaignType;
  status: CampaignStatus;
  templateId: string | null;
  segmentId: string | null;
  subject: string | null;
  content: string;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  targetAllMembers: boolean;
  membershipLevelIds: string[] | null;
  membershipStatuses: string[];
  requiredTags: string[] | null;
  excludedTags: string[] | null;
  totalRecipients: number;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalUnsubscribed: number;
  metadata: Record<string, unknown>;
  abTestEnabled: boolean;
  abVariantBSubject: string | null;
  abVariantBContent: string | null;
  abTestMetric: 'open_rate' | 'click_rate' | null;
  abTestSamplePct: number;
  abTestDurationHours: number;
  abTestWinner: 'a' | 'b' | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignWithDetails extends Campaign {
  template?: CampaignTemplate;
  site?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface CreateCampaignInput {
  name: string;
  siteId?: string | null;
  description?: string | null;
  campaignType: CampaignType;
  templateId?: string | null;
  segmentId?: string | null;
  subject?: string | null;
  content: string;
  scheduledAt?: string | null;
  targetAllMembers?: boolean;
  membershipLevelIds?: string[] | null;
  membershipStatuses?: string[];
  requiredTags?: string[] | null;
  excludedTags?: string[] | null;
  metadata?: Record<string, unknown>;
  abTestEnabled?: boolean;
  abVariantBSubject?: string | null;
  abVariantBContent?: string | null;
  abTestMetric?: 'open_rate' | 'click_rate' | null;
  abTestSamplePct?: number;
  abTestDurationHours?: number;
}

export interface UpdateCampaignInput extends Partial<Omit<CreateCampaignInput, 'campaignType'>> {
  status?: CampaignStatus;
}

export interface CampaignSearchParams {
  siteId?: string;
  status?: CampaignStatus;
  campaignType?: CampaignType;
  searchTerm?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

// =============================================================================
// Template Categories
// =============================================================================

export type TemplateCategory = 'promotional' | 'transactional' | 'onboarding' | 'retention' | 'event' | 'newsletter' | 'general';

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  promotional: 'Promotional',
  transactional: 'Transactional',
  onboarding: 'Onboarding',
  retention: 'Retention',
  event: 'Event',
  newsletter: 'Newsletter',
  general: 'General',
};

// =============================================================================
// Campaign Metrics Types
// =============================================================================

export interface CampaignMetrics {
  totalRecipients: number;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalUnsubscribed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
}

// =============================================================================
// Template Types
// =============================================================================

export interface CampaignTemplate {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  templateType: CampaignType;
  category: TemplateCategory | null;
  subject: string | null;
  content: string;
  preheader: string | null;
  tags: string[];
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string | null;
  templateType: CampaignType;
  category?: TemplateCategory | null;
  subject?: string | null;
  content: string;
  preheader?: string | null;
  tags?: string[];
}

export interface TemplateStats {
  templateId: string;
  timesUsed: number;
  avgOpenRate: number;
  avgClickRate: number;
  lastUsedAt: string | null;
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  isActive?: boolean;
}

// =============================================================================
// Message Types
// =============================================================================

export interface CampaignMessage {
  id: string;
  campaignId: string;
  memberId: string;
  channel: CampaignType;
  recipientAddress: string;
  status: MessageStatus;
  queuedAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  failedAt: string | null;
  externalId: string | null;
  providerStatus: string | null;
  errorMessage: string | null;
  deviceType: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
}

export interface CampaignMessageWithMember extends CampaignMessage {
  member: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  };
}

export interface MemberCampaignActivity {
  id: string;
  campaignId: string;
  campaignName: string;
  campaignType: CampaignType;
  status: MessageStatus;
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  failedAt: string | null;
  queuedAt: string;
}

// =============================================================================
// Recipient Types
// =============================================================================

export interface CampaignRecipient {
  memberId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  siteId: string;
  siteTimezone: string;
}

// =============================================================================
// Campaign Reporting Types
// =============================================================================

export interface CampaignTimelinePoint {
  timeBucket: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  bounced: number;
}

export interface CampaignFunnelStage {
  stage: string;
  count: number;
  rate: number;
}

export interface CampaignErrorSummary {
  errorMessage: string;
  count: number;
  lastOccurred: string;
}

export interface TopEngagedRecipient {
  memberId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  status: MessageStatus;
  openedAt: string | null;
  clickedAt: string | null;
}

export interface CampaignDeviceBreakdown {
  deviceType: string;
  count: number;
  rate: number;
}

// =============================================================================
// SMS-specific Types (TCPA Compliance)
// =============================================================================

export interface SmsValidationResult {
  isValid: boolean;
  characterCount: number;
  segmentCount: number;
  issues: string[];
}

export const SMS_SEGMENT_SIZE = 160;
export const SMS_UNICODE_SEGMENT_SIZE = 70;

// =============================================================================
// Template Variables
// =============================================================================

export type TemplateVariable =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'siteName'
  | 'membershipLevel'
  | 'unsubscribeUrl';

export const TEMPLATE_VARIABLES: Record<TemplateVariable, { placeholder: string; label: string }> = {
  firstName: { placeholder: '{{firstName}}', label: 'First Name' },
  lastName: { placeholder: '{{lastName}}', label: 'Last Name' },
  email: { placeholder: '{{email}}', label: 'Email' },
  phone: { placeholder: '{{phone}}', label: 'Phone' },
  siteName: { placeholder: '{{siteName}}', label: 'Site Name' },
  membershipLevel: { placeholder: '{{membershipLevel}}', label: 'Membership Level' },
  unsubscribeUrl: { placeholder: '{{unsubscribeUrl}}', label: 'Unsubscribe URL' },
};

// =============================================================================
// Status Display Helpers
// =============================================================================

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  sending: 'Sending',
  sent: 'Sent',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export const CAMPAIGN_STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: 'default',
  scheduled: 'info',
  sending: 'warning',
  sent: 'success',
  failed: 'danger',
  cancelled: 'default',
};

export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = {
  queued: 'Queued',
  sent: 'Sent',
  delivered: 'Delivered',
  opened: 'Opened',
  clicked: 'Clicked',
  bounced: 'Bounced',
  failed: 'Failed',
};

export const MESSAGE_STATUS_COLORS: Record<MessageStatus, string> = {
  queued: 'default',
  sent: 'info',
  delivered: 'success',
  opened: 'success',
  clicked: 'success',
  bounced: 'warning',
  failed: 'danger',
};

export const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  sms: 'SMS',
  email: 'Email',
};
