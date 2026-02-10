
const mockRpc = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
  },
}));

import { rateLimiter } from '../rateLimiter';
import { RATE_LIMIT } from '../../constants/app';

describe('rateLimiter (server-side)', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  describe('isLocked', () => {
    it('should return false when account is not locked', async () => {
      mockRpc.mockResolvedValueOnce({ data: false, error: null });

      const result = await rateLimiter.isLocked('test@example.com');

      expect(result).toBe(false);
      expect(mockRpc).toHaveBeenCalledWith('is_account_locked', {
        user_email: 'test@example.com',
      });
    });

    it('should return true when account is locked', async () => {
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const result = await rateLimiter.isLocked('test@example.com');

      expect(result).toBe(true);
    });

    it('should return false on RPC error', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

      const result = await rateLimiter.isLocked('test@example.com');

      expect(result).toBe(false);
    });
  });

  describe('getLockoutTimeRemaining', () => {
    it('should return minutes remaining', async () => {
      mockRpc.mockResolvedValueOnce({ data: 12, error: null });

      const result = await rateLimiter.getLockoutTimeRemaining('test@example.com');

      expect(result).toBe(12);
      expect(mockRpc).toHaveBeenCalledWith('get_lockout_time_remaining', {
        user_email: 'test@example.com',
      });
    });

    it('should return 0 when not locked', async () => {
      mockRpc.mockResolvedValueOnce({ data: 0, error: null });

      const result = await rateLimiter.getLockoutTimeRemaining('test@example.com');

      expect(result).toBe(0);
    });

    it('should return 0 on RPC error', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

      const result = await rateLimiter.getLockoutTimeRemaining('test@example.com');

      expect(result).toBe(0);
    });
  });

  describe('recordFailedAttempt', () => {
    it('should call record_login_attempt with success=false', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: null });

      await rateLimiter.recordFailedAttempt('test@example.com');

      expect(mockRpc).toHaveBeenCalledWith('record_login_attempt', {
        user_email: 'test@example.com',
        user_ip: null,
        was_success: false,
      });
    });

    it('should not throw on RPC error', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

      await expect(rateLimiter.recordFailedAttempt('test@example.com')).resolves.toBeUndefined();
    });
  });

  describe('getRemainingAttempts', () => {
    it('should return max attempts when no failures', async () => {
      mockRpc.mockResolvedValueOnce({ data: 0, error: null });

      const result = await rateLimiter.getRemainingAttempts('test@example.com');

      expect(result).toBe(RATE_LIMIT.MAX_ATTEMPTS);
      expect(mockRpc).toHaveBeenCalledWith('get_failed_attempt_count', {
        user_email: 'test@example.com',
      });
    });

    it('should return remaining attempts after failures', async () => {
      mockRpc.mockResolvedValueOnce({ data: 3, error: null });

      const result = await rateLimiter.getRemainingAttempts('test@example.com');

      expect(result).toBe(RATE_LIMIT.MAX_ATTEMPTS - 3);
    });

    it('should return 0 when at or past max attempts', async () => {
      mockRpc.mockResolvedValueOnce({ data: RATE_LIMIT.MAX_ATTEMPTS + 1, error: null });

      const result = await rateLimiter.getRemainingAttempts('test@example.com');

      expect(result).toBe(0);
    });

    it('should return max attempts on RPC error', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

      const result = await rateLimiter.getRemainingAttempts('test@example.com');

      expect(result).toBe(RATE_LIMIT.MAX_ATTEMPTS);
    });
  });

  describe('reset', () => {
    it('should call reset_login_attempts', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: null });

      await rateLimiter.reset('test@example.com');

      expect(mockRpc).toHaveBeenCalledWith('reset_login_attempts', {
        user_email: 'test@example.com',
      });
    });

    it('should not throw on RPC error', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

      await expect(rateLimiter.reset('test@example.com')).resolves.toBeUndefined();
    });
  });

  describe('recordSuccess', () => {
    it('should record success and then reset attempts', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      await rateLimiter.recordSuccess('test@example.com');

      expect(mockRpc).toHaveBeenCalledTimes(2);
      expect(mockRpc).toHaveBeenCalledWith('record_login_attempt', {
        user_email: 'test@example.com',
        user_ip: null,
        was_success: true,
      });
      expect(mockRpc).toHaveBeenCalledWith('reset_login_attempts', {
        user_email: 'test@example.com',
      });
    });
  });

  describe('different users', () => {
    it('should pass different emails to RPC calls', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null });

      await rateLimiter.isLocked('user1@example.com');
      await rateLimiter.isLocked('user2@example.com');

      expect(mockRpc).toHaveBeenCalledWith('is_account_locked', {
        user_email: 'user1@example.com',
      });
      expect(mockRpc).toHaveBeenCalledWith('is_account_locked', {
        user_email: 'user2@example.com',
      });
    });
  });
});
