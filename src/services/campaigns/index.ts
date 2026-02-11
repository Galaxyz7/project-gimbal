/**
 * Campaign Services
 * Exports for campaign management functionality
 */

// Services
export { campaignService } from './campaignService';
export { campaignReportService } from './campaignReportService';
export { templateService } from './templateService';
export { messageService } from './messageService';
export { smsService } from './smsService';
export { emailService } from './emailService';

// React Query Hooks
export {
  // Campaign hooks
  useCampaigns,
  useCampaign,
  useCampaignMetrics,
  useCampaignRecipients,
  useCampaignMessages,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
  useDuplicateCampaign,
  useScheduleCampaign,
  useCancelCampaign,
  useQueueCampaignMessages,
  // Report hooks
  useCampaignTimeline,
  useCampaignFunnel,
  useTopEngaged,
  useCampaignErrorSummary,
  useCampaignDeviceBreakdown,
  // Template hooks
  useTemplates,
  useStarterTemplates,
  useTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useDuplicateTemplate,
  useAllTemplateStats,
  // Message hooks
  useUpdateMessageStatus,
  // Audience estimation
  useEstimateRecipients,
} from './useCampaigns';

// Re-export types for convenience
export type {
  Campaign,
  CampaignWithDetails,
  CreateCampaignInput,
  UpdateCampaignInput,
  CampaignSearchParams,
  CampaignType,
  CampaignStatus,
  CampaignMetrics,
  CampaignTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  CampaignMessage,
  CampaignMessageWithMember,
  MessageStatus,
  CampaignRecipient,
  SmsValidationResult,
  CampaignTimelinePoint,
  CampaignFunnelStage,
  CampaignErrorSummary,
  TopEngagedRecipient,
  TemplateStats,
  CampaignDeviceBreakdown,
  MemberCampaignActivity,
} from '@/types/campaign';
