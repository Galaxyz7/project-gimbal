
import { STORAGE_KEYS } from '@/constants/app';

// =============================================================================
// Mock Supabase before importing auditLog
// =============================================================================

const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
  },
}));

// We need to re-instantiate the AuditLogger each test, so let's import the class
// and event types but handle the singleton carefully

describe('AuditLogger', () => {
  let AuditEventType: Record<string, string>;
  let auditLogger: {
    log: (eventType: string, email?: string, metadata?: Record<string, unknown>) => void;
    getRecentLogs: (limit?: number) => Array<{ timestamp: number; eventType: string; email?: string }>;
    getLogsByType: (eventType: string) => Array<{ eventType: string }>;
    getLogsByEmail: (email: string) => Array<{ email?: string }>;
    clearLogs: () => void;
    exportLogs: () => string;
  };

  beforeEach(async () => {
    localStorage.clear();
    vi.clearAllMocks();
    // Re-import to get fresh instance
    vi.resetModules();

    vi.mock('@/lib/supabase', () => ({
      supabase: { rpc: mockRpc },
    }));

    const mod = await import('../auditLog');
    AuditEventType = mod.AuditEventType as unknown as Record<string, string>;
    auditLogger = mod.auditLogger;
  });

  describe('AuditEventType', () => {
    it('should have expected event types', () => {
      expect(AuditEventType.LOGIN_SUCCESS).toBe('login_success');
      expect(AuditEventType.LOGIN_FAILED).toBe('login_failed');
      expect(AuditEventType.LOGOUT).toBe('logout');
      expect(AuditEventType.SESSION_EXPIRED).toBe('session_expired');
      expect(AuditEventType.ACCOUNT_LOCKED).toBe('account_locked');
    });
  });

  describe('log', () => {
    it('should store log in localStorage', () => {
      auditLogger.log('login_success', 'user@example.com');
      const stored = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      expect(stored).not.toBeNull();
      const logs = JSON.parse(stored!);
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });

    it('should include event type and email', () => {
      auditLogger.log('login_success', 'user@example.com');
      const logs = auditLogger.getRecentLogs(1);
      expect(logs[0].eventType).toBe('login_success');
      expect(logs[0].email).toBe('user@example.com');
    });

    it('should include timestamp', () => {
      const before = Date.now();
      auditLogger.log('login_success', 'user@example.com');
      const after = Date.now();
      const logs = auditLogger.getRecentLogs(1);
      expect(logs[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(logs[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('should send log to server via RPC', () => {
      auditLogger.log('login_success', 'user@example.com', { ip: '127.0.0.1' });
      expect(mockRpc).toHaveBeenCalledWith('log_audit_event', expect.objectContaining({
        p_event_type: 'login_success',
        p_email: 'user@example.com',
      }));
    });
  });

  describe('getRecentLogs', () => {
    it('should return logs in reverse chronological order', () => {
      auditLogger.log('login_success', 'user1@example.com');
      auditLogger.log('login_failed', 'user2@example.com');
      const logs = auditLogger.getRecentLogs();
      expect(logs[0].eventType).toBe('login_failed');
      expect(logs[1].eventType).toBe('login_success');
    });

    it('should respect limit parameter', () => {
      auditLogger.log('login_success', 'user1@example.com');
      auditLogger.log('login_failed', 'user2@example.com');
      auditLogger.log('logout', 'user3@example.com');
      const logs = auditLogger.getRecentLogs(2);
      expect(logs).toHaveLength(2);
    });
  });

  describe('getLogsByType', () => {
    it('should filter by event type', () => {
      auditLogger.log('login_success', 'user1@example.com');
      auditLogger.log('login_failed', 'user2@example.com');
      auditLogger.log('login_success', 'user3@example.com');
      const logs = auditLogger.getLogsByType('login_success');
      expect(logs).toHaveLength(2);
    });
  });

  describe('getLogsByEmail', () => {
    it('should filter by email', () => {
      auditLogger.log('login_success', 'user1@example.com');
      auditLogger.log('login_failed', 'user1@example.com');
      auditLogger.log('login_success', 'user2@example.com');
      const logs = auditLogger.getLogsByEmail('user1@example.com');
      expect(logs).toHaveLength(2);
    });
  });

  describe('clearLogs', () => {
    it('should remove all logs', () => {
      auditLogger.log('login_success', 'user@example.com');
      auditLogger.clearLogs();
      expect(auditLogger.getRecentLogs()).toHaveLength(0);
      expect(localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)).toBeNull();
    });
  });

  describe('exportLogs', () => {
    it('should return JSON string', () => {
      auditLogger.log('login_success', 'user@example.com');
      const exported = auditLogger.exportLogs();
      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThanOrEqual(1);
    });
  });
});
