/**
 * Test Fixtures
 *
 * Reusable test data for consistent, readable tests.
 */

import type { Member, Site, MembershipLevel, MemberTransaction, MemberVisit, MemberConsent } from '@/types/member';
import type { Profile, AppSettings } from '@/types/admin';

// =============================================================================
// IDs
// =============================================================================

export const TEST_IDS = {
  userId: '00000000-0000-0000-0000-000000000001',
  siteId: '00000000-0000-0000-0000-000000000010',
  memberId: '00000000-0000-0000-0000-000000000100',
  membershipLevelId: '00000000-0000-0000-0000-000000001000',
  campaignId: '00000000-0000-0000-0000-000000010000',
  templateId: '00000000-0000-0000-0000-000000100000',
  transactionId: '00000000-0000-0000-0000-000001000000',
  visitId: '00000000-0000-0000-0000-000010000000',
  consentId: '00000000-0000-0000-0000-000100000000',
  profileId: '00000000-0000-0000-0000-001000000000',
} as const;

// =============================================================================
// Sites
// =============================================================================

export const mockSite: Site = {
  id: TEST_IDS.siteId,
  userId: TEST_IDS.userId,
  name: 'Test Gym',
  code: 'TEST-GYM',
  parentSiteId: null,
  siteLevel: 'site',
  addressLine1: '123 Main St',
  addressLine2: null,
  city: 'New York',
  state: 'NY',
  postalCode: '10001',
  country: 'US',
  timezone: 'America/New_York',
  phone: '+12125551234',
  email: 'info@testgym.com',
  defaultAcquisitionCost: 50,
  isActive: true,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

export const mockSiteRow = {
  id: mockSite.id,
  user_id: mockSite.userId,
  name: mockSite.name,
  code: mockSite.code,
  parent_site_id: mockSite.parentSiteId,
  site_level: mockSite.siteLevel,
  address_line1: mockSite.addressLine1,
  address_line2: mockSite.addressLine2,
  city: mockSite.city,
  state: mockSite.state,
  postal_code: mockSite.postalCode,
  country: mockSite.country,
  timezone: mockSite.timezone,
  phone: mockSite.phone,
  email: mockSite.email,
  default_acquisition_cost: mockSite.defaultAcquisitionCost,
  is_active: mockSite.isActive,
  created_at: mockSite.createdAt,
  updated_at: mockSite.updatedAt,
};

// =============================================================================
// Membership Levels
// =============================================================================

export const mockMembershipLevel: MembershipLevel = {
  id: TEST_IDS.membershipLevelId,
  siteId: TEST_IDS.siteId,
  name: 'Gold',
  code: 'GOLD',
  displayOrder: 2,
  benefits: { discount: 10, priorityBooking: true },
  minLifetimeValue: 500,
  minVisitCount: 20,
  isActive: true,
  createdAt: '2025-01-01T00:00:00Z',
};

// =============================================================================
// Members
// =============================================================================

export const mockMember: Member = {
  id: TEST_IDS.memberId,
  userId: TEST_IDS.userId,
  siteId: TEST_IDS.siteId,
  membershipLevelId: TEST_IDS.membershipLevelId,
  externalId: 'EXT-001',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+12125551234',
  dateOfBirth: '1990-01-15',
  gender: 'male',
  addressLine1: '456 Oak Ave',
  addressLine2: 'Apt 2B',
  city: 'Brooklyn',
  state: 'NY',
  postalCode: '11201',
  country: 'US',
  membershipStartDate: '2025-01-01',
  membershipExpiryDate: '2026-01-01',
  membershipStatus: 'active',
  totalVisits: 15,
  lastVisitAt: '2025-06-01T10:00:00Z',
  totalTransactions: 5,
  lifetimeValue: 750,
  averageTransaction: 150,
  acquisitionSource: 'organic',
  acquisitionCampaignId: null,
  acquisitionPromoCode: null,
  acquisitionCost: 0,
  acquisitionDate: '2025-01-01',
  tags: ['vip', 'morning'],
  customFields: {},
  sourceImportId: null,
  isActive: true,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-06-01T00:00:00Z',
};

export const mockMemberRow = {
  id: mockMember.id,
  user_id: mockMember.userId,
  site_id: mockMember.siteId,
  membership_level_id: mockMember.membershipLevelId,
  external_id: mockMember.externalId,
  first_name: mockMember.firstName,
  last_name: mockMember.lastName,
  email: mockMember.email,
  phone: mockMember.phone,
  date_of_birth: mockMember.dateOfBirth,
  gender: mockMember.gender,
  address_line1: mockMember.addressLine1,
  address_line2: mockMember.addressLine2,
  city: mockMember.city,
  state: mockMember.state,
  postal_code: mockMember.postalCode,
  country: mockMember.country,
  membership_start_date: mockMember.membershipStartDate,
  membership_expiry_date: mockMember.membershipExpiryDate,
  membership_status: mockMember.membershipStatus,
  total_visits: mockMember.totalVisits,
  last_visit_at: mockMember.lastVisitAt,
  total_transactions: mockMember.totalTransactions,
  lifetime_value: mockMember.lifetimeValue,
  average_transaction: mockMember.averageTransaction,
  acquisition_source: mockMember.acquisitionSource,
  acquisition_campaign_id: mockMember.acquisitionCampaignId,
  acquisition_promo_code: mockMember.acquisitionPromoCode,
  acquisition_cost: mockMember.acquisitionCost,
  acquisition_date: mockMember.acquisitionDate,
  tags: mockMember.tags,
  custom_fields: mockMember.customFields,
  source_import_id: mockMember.sourceImportId,
  is_active: mockMember.isActive,
  created_at: mockMember.createdAt,
  updated_at: mockMember.updatedAt,
};

// =============================================================================
// Transactions
// =============================================================================

export const mockTransaction: MemberTransaction = {
  id: TEST_IDS.transactionId,
  memberId: TEST_IDS.memberId,
  siteId: TEST_IDS.siteId,
  externalTransactionId: 'TXN-001',
  transactionDate: '2025-05-15',
  amount: 150,
  transactionType: 'purchase',
  promoCode: null,
  campaignId: null,
  description: 'Monthly membership',
  lineItems: [{ name: 'Gold Membership', qty: 1, amount: 150 }],
  metadata: {},
  sourceImportId: null,
  createdAt: '2025-05-15T00:00:00Z',
  updatedAt: '2025-05-15T00:00:00Z',
};

// =============================================================================
// Visits
// =============================================================================

export const mockVisit: MemberVisit = {
  id: TEST_IDS.visitId,
  memberId: TEST_IDS.memberId,
  siteId: TEST_IDS.siteId,
  visitDate: '2025-06-01',
  checkInTime: '10:00:00',
  checkOutTime: '11:30:00',
  visitType: 'regular',
  serviceName: null,
  staffMember: null,
  notes: null,
  metadata: {},
  sourceImportId: null,
  createdAt: '2025-06-01T10:00:00Z',
};

// =============================================================================
// Consent
// =============================================================================

export const mockConsent: MemberConsent = {
  id: TEST_IDS.consentId,
  memberId: TEST_IDS.memberId,
  smsConsent: true,
  smsConsentSource: 'web_form',
  smsConsentedAt: '2025-01-01T00:00:00Z',
  smsConsentIp: '192.168.1.1',
  smsOptOutAt: null,
  smsOptOutReason: null,
  emailConsent: true,
  emailConsentSource: 'web_form',
  emailConsentedAt: '2025-01-01T00:00:00Z',
  emailUnsubscribedAt: null,
  emailUnsubscribeReason: null,
  doNotContact: false,
  preferredChannel: 'email',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

// =============================================================================
// Profiles
// =============================================================================

export const mockProfile: Profile = {
  id: TEST_IDS.profileId,
  email: 'admin@example.com',
  role: 'admin',
  displayName: 'Test Admin',
  avatarUrl: null,
  phone: '+12125559876',
  isActive: true,
  lastLoginAt: '2025-06-01T00:00:00Z',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-06-01T00:00:00Z',
};

export const mockProfileRow = {
  id: mockProfile.id,
  email: mockProfile.email,
  role: mockProfile.role,
  display_name: mockProfile.displayName,
  avatar_url: mockProfile.avatarUrl,
  phone: mockProfile.phone,
  is_active: mockProfile.isActive,
  last_login_at: mockProfile.lastLoginAt,
  created_at: mockProfile.createdAt,
  updated_at: mockProfile.updatedAt,
};

// =============================================================================
// App Settings
// =============================================================================

export const mockAppSettings: AppSettings = {
  id: '00000000-0000-0000-0000-100000000000',
  twilioAccountSid: 'AC_test_sid',
  twilioAuthToken: 'test_auth_token',
  twilioPhoneNumber: '+15551234567',
  sendgridApiKey: 'SG.test_key',
  sendgridFromEmail: 'noreply@testgym.com',
  sendgridFromName: 'Test Gym',
  companyName: 'Test Gym LLC',
  companyAddress: '123 Main St, New York, NY 10001',
  timezone: 'America/New_York',
  monthlySmsLimit: 10000,
  monthlyEmailLimit: 50000,
  dataRetentionDays: 365,
  auditRetentionDays: 30,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

// =============================================================================
// Campaign Fixtures
// =============================================================================

export const mockCampaignRow = {
  id: TEST_IDS.campaignId,
  user_id: TEST_IDS.userId,
  site_id: TEST_IDS.siteId,
  name: 'Summer Sale',
  description: 'Summer promotion campaign',
  campaign_type: 'email',
  status: 'draft',
  template_id: TEST_IDS.templateId,
  subject: 'Summer Sale - 20% Off!',
  content: '<h1>Summer Sale</h1><p>Get 20% off everything!</p>',
  scheduled_at: null,
  started_at: null,
  completed_at: null,
  target_all_members: false,
  membership_level_ids: [TEST_IDS.membershipLevelId],
  membership_statuses: ['active'],
  required_tags: null,
  excluded_tags: null,
  total_recipients: 100,
  total_sent: 0,
  total_delivered: 0,
  total_failed: 0,
  total_opened: 0,
  total_clicked: 0,
  total_bounced: 0,
  total_unsubscribed: 0,
  metadata: {},
  created_at: '2025-06-01T00:00:00Z',
  updated_at: '2025-06-01T00:00:00Z',
};

// =============================================================================
// Supabase User
// =============================================================================

export const mockSupabaseUser = {
  id: TEST_IDS.userId,
  email: 'admin@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  created_at: '2025-01-01T00:00:00Z',
};
