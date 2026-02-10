/**
 * Rate Limiter for Login Attempts (Server-Side)
 * Prevents brute force attacks by tracking login attempts in the database.
 * All state lives in the `login_attempts` table — not localStorage.
 */

import { supabase } from '@/lib/supabase';
import { RATE_LIMIT } from '../constants/app';

export const rateLimiter = {
  /**
   * Check if user is currently locked out
   */
  async isLocked(email: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('is_account_locked', {
      user_email: email,
    });
    if (error) {
      console.error('Failed to check account lock status:', error);
      return false;
    }
    return data === true;
  },

  /**
   * Get remaining time for lockout in minutes
   */
  async getLockoutTimeRemaining(email: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_lockout_time_remaining', {
      user_email: email,
    });
    if (error) {
      console.error('Failed to get lockout time:', error);
      return 0;
    }
    return data ?? 0;
  },

  /**
   * Record a failed login attempt
   */
  async recordFailedAttempt(email: string): Promise<void> {
    const { error } = await supabase.rpc('record_login_attempt', {
      user_email: email,
      user_ip: null,
      was_success: false,
    });
    if (error) {
      console.error('Failed to record login attempt:', error);
    }
  },

  /**
   * Get remaining attempts before lockout
   */
  async getRemainingAttempts(email: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_failed_attempt_count', {
      user_email: email,
    });
    if (error) {
      console.error('Failed to get attempt count:', error);
      return RATE_LIMIT.MAX_ATTEMPTS;
    }
    return Math.max(0, RATE_LIMIT.MAX_ATTEMPTS - (data ?? 0));
  },

  /**
   * Reset attempts (called after successful login)
   */
  async reset(email: string): Promise<void> {
    const { error } = await supabase.rpc('reset_login_attempts', {
      user_email: email,
    });
    if (error) {
      console.error('Failed to reset login attempts:', error);
    }
  },

  /**
   * Record a successful login and reset attempt counter
   */
  async recordSuccess(email: string): Promise<void> {
    await supabase.rpc('record_login_attempt', {
      user_email: email,
      user_ip: null,
      was_success: true,
    });
    await this.reset(email);
  },
};
