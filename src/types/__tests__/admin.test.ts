
import {
  hasMinimumRole,
  canPerformAction,
  mapProfileRow,
  mapAppSettingsRow,
  mapAuditLogRow,
  ROLE_HIERARCHY,
  ROLE_LABELS,
} from '../admin';
import { mockProfileRow } from '@/test/mocks/fixtures';

describe('RBAC Helpers', () => {
  describe('ROLE_HIERARCHY', () => {
    it('should have admin as highest', () => {
      expect(ROLE_HIERARCHY.admin).toBeGreaterThan(ROLE_HIERARCHY.user);
      expect(ROLE_HIERARCHY.user).toBeGreaterThan(ROLE_HIERARCHY.viewer);
    });
  });

  describe('ROLE_LABELS', () => {
    it('should have labels for all roles', () => {
      expect(ROLE_LABELS.admin).toBe('Administrator');
      expect(ROLE_LABELS.user).toBe('User');
      expect(ROLE_LABELS.viewer).toBe('Viewer');
    });
  });

  describe('hasMinimumRole', () => {
    it('admin meets all requirements', () => {
      expect(hasMinimumRole('admin', 'admin')).toBe(true);
      expect(hasMinimumRole('admin', 'user')).toBe(true);
      expect(hasMinimumRole('admin', 'viewer')).toBe(true);
    });

    it('user meets user and viewer but not admin', () => {
      expect(hasMinimumRole('user', 'admin')).toBe(false);
      expect(hasMinimumRole('user', 'user')).toBe(true);
      expect(hasMinimumRole('user', 'viewer')).toBe(true);
    });

    it('viewer only meets viewer', () => {
      expect(hasMinimumRole('viewer', 'admin')).toBe(false);
      expect(hasMinimumRole('viewer', 'user')).toBe(false);
      expect(hasMinimumRole('viewer', 'viewer')).toBe(true);
    });
  });

  describe('canPerformAction', () => {
    it('admin can do everything', () => {
      expect(canPerformAction('admin', 'manage_users')).toBe(true);
      expect(canPerformAction('admin', 'manage_settings')).toBe(true);
      expect(canPerformAction('admin', 'create_campaigns')).toBe(true);
      expect(canPerformAction('admin', 'view_analytics')).toBe(true);
    });

    it('user can create campaigns and view analytics', () => {
      expect(canPerformAction('user', 'manage_users')).toBe(false);
      expect(canPerformAction('user', 'manage_settings')).toBe(false);
      expect(canPerformAction('user', 'create_campaigns')).toBe(true);
      expect(canPerformAction('user', 'view_analytics')).toBe(true);
    });

    it('viewer can only view analytics', () => {
      expect(canPerformAction('viewer', 'manage_users')).toBe(false);
      expect(canPerformAction('viewer', 'manage_settings')).toBe(false);
      expect(canPerformAction('viewer', 'create_campaigns')).toBe(false);
      expect(canPerformAction('viewer', 'view_analytics')).toBe(true);
    });
  });
});

describe('Row Mappers', () => {
  describe('mapProfileRow', () => {
    it('should map snake_case to camelCase', () => {
      const profile = mapProfileRow(mockProfileRow);
      expect(profile.id).toBe(mockProfileRow.id);
      expect(profile.email).toBe(mockProfileRow.email);
      expect(profile.role).toBe('admin');
      expect(profile.displayName).toBe(mockProfileRow.display_name);
      expect(profile.avatarUrl).toBe(mockProfileRow.avatar_url);
      expect(profile.isActive).toBe(mockProfileRow.is_active);
      expect(profile.lastLoginAt).toBe(mockProfileRow.last_login_at);
      expect(profile.createdAt).toBe(mockProfileRow.created_at);
    });
  });

  describe('mapAppSettingsRow', () => {
    it('should map all settings fields', () => {
      const row = {
        id: 'settings-1',
        twilio_account_sid: 'AC_test',
        twilio_auth_token: 'token',
        twilio_phone_number: '+15551234567',
        sendgrid_api_key: 'SG.key',
        sendgrid_from_email: 'noreply@test.com',
        sendgrid_from_name: 'Test',
        company_name: 'Test Co',
        company_address: '123 Main St',
        timezone: 'America/New_York',
        monthly_sms_limit: 10000,
        monthly_email_limit: 50000,
        data_retention_days: 365,
        audit_retention_days: 30,
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      };
      const settings = mapAppSettingsRow(row);
      expect(settings.twilioAccountSid).toBe('AC_test');
      expect(settings.sendgridApiKey).toBe('SG.key');
      expect(settings.companyName).toBe('Test Co');
      expect(settings.monthlySmsLimit).toBe(10000);
    });
  });

  describe('mapAuditLogRow', () => {
    it('should map audit log fields', () => {
      const row = {
        id: 'log-1',
        event_type: 'LOGIN_SUCCESS',
        email: 'user@example.com',
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0',
        metadata: { source: 'web' },
        created_at: '2025-06-01T00:00:00Z',
      };
      const log = mapAuditLogRow(row);
      expect(log.eventType).toBe('LOGIN_SUCCESS');
      expect(log.email).toBe('user@example.com');
      expect(log.ipAddress).toBe('127.0.0.1');
      expect(log.metadata).toEqual({ source: 'web' });
    });
  });
});
