
import {
  getAppSettings,
  updateAppSettings,
  getAppSettingsMasked,
  isTwilioConfigured,
  isSendGridConfigured,
  getMessagingStatus,
  getAuditLogs,
  getAuditLogCount,
  getAuditEventTypes,
  getAuditLogStats,
} from '../appSettingsService';

// =============================================================================
// Mock Supabase
// =============================================================================

const { mockSingle, mockQueryChain } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockQueryChain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    range: vi.fn(),
    single: mockSingle,
    then: vi.fn(),
  };
  for (const key of Object.keys(mockQueryChain)) {
    if (key !== 'single' && key !== 'then') {
      mockQueryChain[key].mockReturnValue(mockQueryChain);
    }
  }
  return { mockSingle, mockQueryChain };
});

const resolvableChain = (result: { data: unknown; error: unknown; count?: number | null }) => {
  Object.defineProperty(mockQueryChain, 'then', {
    value: vi.fn((resolve: (val: unknown) => void) => resolve(result)),
    writable: true,
    configurable: true,
  });
  mockSingle.mockResolvedValue(result);
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockQueryChain),
  },
}));

// =============================================================================
// Test Data
// =============================================================================

const mockSettingsRow = {
  id: 'settings-1',
  twilio_account_sid: 'AC123',
  twilio_auth_token: 'token123',
  twilio_phone_number: '+15551234567',
  sendgrid_api_key: 'SG.xxx',
  sendgrid_from_email: 'noreply@test.com',
  sendgrid_from_name: 'Test',
  company_name: 'Test Co',
  company_address: '123 Main St',
  timezone: 'America/New_York',
  monthly_sms_limit: 10000,
  monthly_email_limit: 50000,
  data_retention_days: 365,
  audit_retention_days: 30,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const mockAuditLogRow = {
  id: 'audit-1',
  event_type: 'LOGIN_SUCCESS',
  email: 'admin@test.com',
  ip_address: '127.0.0.1',
  user_agent: 'Mozilla/5.0',
  metadata: { browser: 'Chrome' },
  created_at: '2025-01-15T10:30:00Z',
};

// =============================================================================
// Tests
// =============================================================================

describe('appSettingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolvableChain({ data: null, error: null });
  });

  // ---------------------------------------------------------------------------
  // getAppSettings
  // ---------------------------------------------------------------------------

  describe('getAppSettings', () => {
    it('should return mapped settings on success', async () => {
      mockSingle.mockResolvedValue({ data: mockSettingsRow, error: null });
      const result = await getAppSettings();

      expect(result).not.toBeNull();
      expect(result!.id).toBe('settings-1');
      expect(result!.twilioAccountSid).toBe('AC123');
      expect(result!.twilioAuthToken).toBe('token123');
      expect(result!.twilioPhoneNumber).toBe('+15551234567');
      expect(result!.sendgridApiKey).toBe('SG.xxx');
      expect(result!.sendgridFromEmail).toBe('noreply@test.com');
      expect(result!.sendgridFromName).toBe('Test');
      expect(result!.companyName).toBe('Test Co');
      expect(result!.companyAddress).toBe('123 Main St');
      expect(result!.timezone).toBe('America/New_York');
      expect(result!.monthlySmsLimit).toBe(10000);
      expect(result!.monthlyEmailLimit).toBe(50000);
      expect(result!.dataRetentionDays).toBe(365);
      expect(result!.auditRetentionDays).toBe(30);
    });

    it('should return null when no settings exist (PGRST116)', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });
      const result = await getAppSettings();
      expect(result).toBeNull();
    });

    it('should throw on unexpected error', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: '500', message: 'Server error' },
      });
      await expect(getAppSettings()).rejects.toThrow('Failed to fetch app settings');
    });

    it('should return null when data is null without error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });
      const result = await getAppSettings();
      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // updateAppSettings
  // ---------------------------------------------------------------------------

  describe('updateAppSettings', () => {
    it('should update and return mapped settings', async () => {
      const updatedRow = { ...mockSettingsRow, company_name: 'Updated Co' };
      // First call: getAppSettings -> .single()
      mockSingle.mockResolvedValueOnce({ data: mockSettingsRow, error: null });
      // Second call: update -> .select().single()
      mockSingle.mockResolvedValueOnce({ data: updatedRow, error: null });

      const result = await updateAppSettings({ companyName: 'Updated Co' });
      expect(result.companyName).toBe('Updated Co');
    });

    it('should throw when no current settings exist', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      await expect(updateAppSettings({ companyName: 'Test' })).rejects.toThrow(
        'App settings not found'
      );
    });

    it('should map camelCase input to snake_case columns', async () => {
      mockSingle.mockResolvedValueOnce({ data: mockSettingsRow, error: null });
      mockSingle.mockResolvedValueOnce({ data: mockSettingsRow, error: null });

      await updateAppSettings({
        twilioAccountSid: 'AC_NEW',
        sendgridApiKey: 'SG.new',
        companyName: 'New Name',
        monthlySmsLimit: 5000,
        dataRetentionDays: 180,
      });

      expect(mockQueryChain.update).toHaveBeenCalledWith({
        twilio_account_sid: 'AC_NEW',
        sendgrid_api_key: 'SG.new',
        company_name: 'New Name',
        monthly_sms_limit: 5000,
        data_retention_days: 180,
      });
    });

    it('should only include defined fields in update', async () => {
      mockSingle.mockResolvedValueOnce({ data: mockSettingsRow, error: null });
      mockSingle.mockResolvedValueOnce({ data: mockSettingsRow, error: null });

      await updateAppSettings({ timezone: 'UTC' });

      expect(mockQueryChain.update).toHaveBeenCalledWith({ timezone: 'UTC' });
    });

    it('should throw on update error', async () => {
      mockSingle.mockResolvedValueOnce({ data: mockSettingsRow, error: null });
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });

      await expect(updateAppSettings({ companyName: 'Fail' })).rejects.toThrow(
        'Failed to update app settings'
      );
    });

    it('should use current settings id for eq filter', async () => {
      mockSingle.mockResolvedValueOnce({ data: mockSettingsRow, error: null });
      mockSingle.mockResolvedValueOnce({ data: mockSettingsRow, error: null });

      await updateAppSettings({ companyName: 'Test' });

      expect(mockQueryChain.eq).toHaveBeenCalledWith('id', 'settings-1');
    });
  });

  // ---------------------------------------------------------------------------
  // getAppSettingsMasked
  // ---------------------------------------------------------------------------

  describe('getAppSettingsMasked', () => {
    it('should mask twilioAuthToken and sendgridApiKey', async () => {
      mockSingle.mockResolvedValue({ data: mockSettingsRow, error: null });
      const result = await getAppSettingsMasked();

      expect(result).not.toBeNull();
      expect(result!.twilioAuthToken).toBe('••••••••');
      expect(result!.sendgridApiKey).toBe('••••••••');
      // Non-secret fields remain unmasked
      expect(result!.twilioAccountSid).toBe('AC123');
      expect(result!.sendgridFromEmail).toBe('noreply@test.com');
      expect(result!.companyName).toBe('Test Co');
    });

    it('should return null when no settings exist', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });
      const result = await getAppSettingsMasked();
      expect(result).toBeNull();
    });

    it('should return null for secrets that are already null', async () => {
      const rowWithNullSecrets = {
        ...mockSettingsRow,
        twilio_auth_token: null,
        sendgrid_api_key: null,
      };
      mockSingle.mockResolvedValue({ data: rowWithNullSecrets, error: null });
      const result = await getAppSettingsMasked();

      expect(result!.twilioAuthToken).toBeNull();
      expect(result!.sendgridApiKey).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // isTwilioConfigured
  // ---------------------------------------------------------------------------

  describe('isTwilioConfigured', () => {
    it('should return true when all Twilio fields are set', async () => {
      mockSingle.mockResolvedValue({ data: mockSettingsRow, error: null });
      const result = await isTwilioConfigured();
      expect(result).toBe(true);
    });

    it('should return false when account SID is missing', async () => {
      const partial = { ...mockSettingsRow, twilio_account_sid: null };
      mockSingle.mockResolvedValue({ data: partial, error: null });
      const result = await isTwilioConfigured();
      expect(result).toBe(false);
    });

    it('should return false when auth token is missing', async () => {
      const partial = { ...mockSettingsRow, twilio_auth_token: null };
      mockSingle.mockResolvedValue({ data: partial, error: null });
      const result = await isTwilioConfigured();
      expect(result).toBe(false);
    });

    it('should return false when phone number is missing', async () => {
      const partial = { ...mockSettingsRow, twilio_phone_number: null };
      mockSingle.mockResolvedValue({ data: partial, error: null });
      const result = await isTwilioConfigured();
      expect(result).toBe(false);
    });

    it('should return false when no settings exist', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });
      const result = await isTwilioConfigured();
      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // isSendGridConfigured
  // ---------------------------------------------------------------------------

  describe('isSendGridConfigured', () => {
    it('should return true when API key and from email are set', async () => {
      mockSingle.mockResolvedValue({ data: mockSettingsRow, error: null });
      const result = await isSendGridConfigured();
      expect(result).toBe(true);
    });

    it('should return false when API key is missing', async () => {
      const partial = { ...mockSettingsRow, sendgrid_api_key: null };
      mockSingle.mockResolvedValue({ data: partial, error: null });
      const result = await isSendGridConfigured();
      expect(result).toBe(false);
    });

    it('should return false when from email is missing', async () => {
      const partial = { ...mockSettingsRow, sendgrid_from_email: null };
      mockSingle.mockResolvedValue({ data: partial, error: null });
      const result = await isSendGridConfigured();
      expect(result).toBe(false);
    });

    it('should return false when no settings exist', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });
      const result = await isSendGridConfigured();
      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // getMessagingStatus
  // ---------------------------------------------------------------------------

  describe('getMessagingStatus', () => {
    it('should return full status when all configured', async () => {
      mockSingle.mockResolvedValue({ data: mockSettingsRow, error: null });
      const result = await getMessagingStatus();

      expect(result.sms.configured).toBe(true);
      expect(result.sms.phoneNumber).toBe('+15551234567');
      expect(result.email.configured).toBe(true);
      expect(result.email.fromEmail).toBe('noreply@test.com');
      expect(result.email.fromName).toBe('Test');
    });

    it('should return unconfigured when no settings', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });
      const result = await getMessagingStatus();

      expect(result.sms.configured).toBe(false);
      expect(result.sms.phoneNumber).toBeNull();
      expect(result.email.configured).toBe(false);
      expect(result.email.fromEmail).toBeNull();
      expect(result.email.fromName).toBeNull();
    });

    it('should return partial status when only email configured', async () => {
      const partialRow = {
        ...mockSettingsRow,
        twilio_account_sid: null,
        twilio_auth_token: null,
        twilio_phone_number: null,
      };
      mockSingle.mockResolvedValue({ data: partialRow, error: null });
      const result = await getMessagingStatus();

      expect(result.sms.configured).toBe(false);
      expect(result.sms.phoneNumber).toBeNull();
      expect(result.email.configured).toBe(true);
      expect(result.email.fromEmail).toBe('noreply@test.com');
    });
  });

  // ---------------------------------------------------------------------------
  // getAuditLogs
  // ---------------------------------------------------------------------------

  describe('getAuditLogs', () => {
    it('should fetch and map audit logs', async () => {
      resolvableChain({ data: [mockAuditLogRow], error: null });
      const result = await getAuditLogs();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('audit-1');
      expect(result[0].eventType).toBe('LOGIN_SUCCESS');
      expect(result[0].email).toBe('admin@test.com');
      expect(result[0].ipAddress).toBe('127.0.0.1');
      expect(result[0].userAgent).toBe('Mozilla/5.0');
      expect(result[0].metadata).toEqual({ browser: 'Chrome' });
      expect(result[0].createdAt).toBe('2025-01-15T10:30:00Z');
    });

    it('should apply search filter using or', async () => {
      resolvableChain({ data: [], error: null });
      await getAuditLogs({ search: 'admin' });
      expect(mockQueryChain.or).toHaveBeenCalledWith(
        'email.ilike.%admin%,event_type.ilike.%admin%'
      );
    });

    it('should filter by eventType', async () => {
      resolvableChain({ data: [], error: null });
      await getAuditLogs({ eventType: 'LOGIN_SUCCESS' });
      expect(mockQueryChain.eq).toHaveBeenCalledWith('event_type', 'LOGIN_SUCCESS');
    });

    it('should filter by email', async () => {
      resolvableChain({ data: [], error: null });
      await getAuditLogs({ email: 'admin@test.com' });
      expect(mockQueryChain.eq).toHaveBeenCalledWith('email', 'admin@test.com');
    });

    it('should filter by date range', async () => {
      resolvableChain({ data: [], error: null });
      await getAuditLogs({
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });
      expect(mockQueryChain.gte).toHaveBeenCalledWith('created_at', '2025-01-01');
      expect(mockQueryChain.lte).toHaveBeenCalledWith('created_at', '2025-01-31');
    });

    it('should apply limit and offset for pagination', async () => {
      resolvableChain({ data: [], error: null });
      await getAuditLogs({ limit: 20, offset: 40 });
      expect(mockQueryChain.limit).toHaveBeenCalledWith(20);
      expect(mockQueryChain.range).toHaveBeenCalledWith(40, 59);
    });

    it('should use default limit of 50 when offset provided without limit', async () => {
      resolvableChain({ data: [], error: null });
      await getAuditLogs({ offset: 10 });
      expect(mockQueryChain.range).toHaveBeenCalledWith(10, 59);
    });

    it('should throw on error', async () => {
      resolvableChain({ data: null, error: { message: 'DB error' } });
      await expect(getAuditLogs()).rejects.toThrow('Failed to fetch audit logs');
    });

    it('should return empty array when data is null', async () => {
      resolvableChain({ data: null, error: null });
      const result = await getAuditLogs();
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getAuditLogCount
  // ---------------------------------------------------------------------------

  describe('getAuditLogCount', () => {
    it('should return count', async () => {
      resolvableChain({ data: null, error: null, count: 42 });
      const result = await getAuditLogCount();
      expect(result).toBe(42);
    });

    it('should filter by eventType', async () => {
      resolvableChain({ data: null, error: null, count: 10 });
      await getAuditLogCount({ eventType: 'LOGIN_SUCCESS' });
      expect(mockQueryChain.eq).toHaveBeenCalledWith('event_type', 'LOGIN_SUCCESS');
    });

    it('should filter by email', async () => {
      resolvableChain({ data: null, error: null, count: 5 });
      await getAuditLogCount({ email: 'admin@test.com' });
      expect(mockQueryChain.eq).toHaveBeenCalledWith('email', 'admin@test.com');
    });

    it('should filter by date range', async () => {
      resolvableChain({ data: null, error: null, count: 20 });
      await getAuditLogCount({
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });
      expect(mockQueryChain.gte).toHaveBeenCalledWith('created_at', '2025-01-01');
      expect(mockQueryChain.lte).toHaveBeenCalledWith('created_at', '2025-01-31');
    });

    it('should return 0 when count is null', async () => {
      resolvableChain({ data: null, error: null, count: null });
      const result = await getAuditLogCount();
      expect(result).toBe(0);
    });

    it('should throw on error', async () => {
      resolvableChain({ data: null, error: { message: 'Count error' } });
      await expect(getAuditLogCount()).rejects.toThrow('Failed to count audit logs');
    });
  });

  // ---------------------------------------------------------------------------
  // getAuditEventTypes
  // ---------------------------------------------------------------------------

  describe('getAuditEventTypes', () => {
    it('should return deduplicated event types', async () => {
      resolvableChain({
        data: [
          { event_type: 'LOGIN_SUCCESS' },
          { event_type: 'LOGIN_FAILED' },
          { event_type: 'LOGIN_SUCCESS' },
          { event_type: 'LOGOUT' },
          { event_type: 'LOGIN_FAILED' },
        ],
        error: null,
      });
      const result = await getAuditEventTypes();

      expect(result).toHaveLength(3);
      expect(result).toContain('LOGIN_SUCCESS');
      expect(result).toContain('LOGIN_FAILED');
      expect(result).toContain('LOGOUT');
    });

    it('should return empty array when no data', async () => {
      resolvableChain({ data: [], error: null });
      const result = await getAuditEventTypes();
      expect(result).toEqual([]);
    });

    it('should skip null event types', async () => {
      resolvableChain({
        data: [
          { event_type: 'LOGIN_SUCCESS' },
          { event_type: null },
          { event_type: '' },
        ],
        error: null,
      });
      const result = await getAuditEventTypes();
      // null is skipped by the truthiness check, empty string is falsy too
      expect(result).toEqual(['LOGIN_SUCCESS']);
    });

    it('should throw on error', async () => {
      resolvableChain({ data: null, error: { message: 'Fetch error' } });
      await expect(getAuditEventTypes()).rejects.toThrow('Failed to fetch event types');
    });
  });

  // ---------------------------------------------------------------------------
  // getAuditLogStats
  // ---------------------------------------------------------------------------

  describe('getAuditLogStats', () => {
    it('should aggregate stats by type and day', async () => {
      resolvableChain({
        data: [
          { event_type: 'LOGIN_SUCCESS', created_at: '2025-01-15T10:00:00Z' },
          { event_type: 'LOGIN_SUCCESS', created_at: '2025-01-15T14:00:00Z' },
          { event_type: 'LOGIN_FAILED', created_at: '2025-01-15T11:00:00Z' },
          { event_type: 'LOGOUT', created_at: '2025-01-16T09:00:00Z' },
        ],
        error: null,
      });
      const result = await getAuditLogStats(7);

      expect(result.totalEvents).toBe(4);
      expect(result.eventsByType).toEqual({
        LOGIN_SUCCESS: 2,
        LOGIN_FAILED: 1,
        LOGOUT: 1,
      });
      expect(result.eventsByDay).toEqual([
        { date: '2025-01-15', count: 3 },
        { date: '2025-01-16', count: 1 },
      ]);
    });

    it('should sort eventsByDay chronologically', async () => {
      resolvableChain({
        data: [
          { event_type: 'LOGIN_SUCCESS', created_at: '2025-01-20T10:00:00Z' },
          { event_type: 'LOGIN_SUCCESS', created_at: '2025-01-10T10:00:00Z' },
          { event_type: 'LOGIN_SUCCESS', created_at: '2025-01-15T10:00:00Z' },
        ],
        error: null,
      });
      const result = await getAuditLogStats();

      expect(result.eventsByDay[0].date).toBe('2025-01-10');
      expect(result.eventsByDay[1].date).toBe('2025-01-15');
      expect(result.eventsByDay[2].date).toBe('2025-01-20');
    });

    it('should return empty stats when no data', async () => {
      resolvableChain({ data: [], error: null });
      const result = await getAuditLogStats();

      expect(result.totalEvents).toBe(0);
      expect(result.eventsByType).toEqual({});
      expect(result.eventsByDay).toEqual([]);
    });

    it('should use gte filter with calculated start date', async () => {
      resolvableChain({ data: [], error: null });
      await getAuditLogStats(14);
      expect(mockQueryChain.gte).toHaveBeenCalledWith(
        'created_at',
        expect.any(String)
      );
    });

    it('should throw on error', async () => {
      resolvableChain({ data: null, error: { message: 'Stats error' } });
      await expect(getAuditLogStats()).rejects.toThrow('Failed to fetch audit stats');
    });
  });
});
