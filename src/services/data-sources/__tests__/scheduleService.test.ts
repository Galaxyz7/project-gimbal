
import {
  calculateNextSyncTime,
  validateScheduleConfig,
  getScheduleDescription,
  getFrequencyOptions,
  calculateRetryDelay,
  calculateNextRetryTime,
  shouldRetry,
  getCommonTimezones,
} from '../scheduleService';
import type { ScheduleConfiguration } from '../../../types/dataImport';

// =============================================================================
// Tests
// =============================================================================

describe('scheduleService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T10:30:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // calculateNextSyncTime
  // ---------------------------------------------------------------------------

  describe('calculateNextSyncTime', () => {
    it('should return null for manual frequency', () => {
      const config: ScheduleConfiguration = { frequency: 'manual', retry_on_failure: false, max_retries: 0, retry_delay_minutes: 15 };
      expect(calculateNextSyncTime(config)).toBeNull();
    });

    it('should return next hour for hourly frequency', () => {
      const config: ScheduleConfiguration = { frequency: 'hourly', retry_on_failure: false, max_retries: 0, retry_delay_minutes: 15 };
      // Use local time to avoid timezone conversion issues
      const from = new Date(2025, 5, 15, 10, 30, 0);
      const result = calculateNextSyncTime(config, from);
      expect(result).not.toBeNull();
      expect(result!.getMinutes()).toBe(0);
      expect(result!.getHours()).toBe(11);
    });

    it('should return next day for daily frequency', () => {
      const config: ScheduleConfiguration = { frequency: 'daily', time: '09:00', retry_on_failure: false, max_retries: 0, retry_delay_minutes: 15 };
      const from = new Date(2025, 5, 15, 10, 0, 0);
      const result = calculateNextSyncTime(config, from);
      expect(result).not.toBeNull();
      // Since 09:00 has already passed at 10:00, should be tomorrow
      expect(result!.getDate()).toBe(16);
    });

    it('should handle daily before time passes', () => {
      const config: ScheduleConfiguration = { frequency: 'daily', time: '14:00', retry_on_failure: false, max_retries: 0, retry_delay_minutes: 15 };
      const from = new Date(2025, 5, 15, 10, 0, 0);
      const result = calculateNextSyncTime(config, from);
      expect(result).not.toBeNull();
      expect(result!.getDate()).toBe(15);
      expect(result!.getHours()).toBe(14);
    });

    it('should return next week for weekly frequency', () => {
      const config: ScheduleConfiguration = { frequency: 'weekly', day_of_week: 0, time: '02:00', retry_on_failure: false, max_retries: 0, retry_delay_minutes: 15 };
      const result = calculateNextSyncTime(config, new Date(2025, 5, 15, 10, 0, 0)); // Sunday June 15
      expect(result).not.toBeNull();
    });

    it('should return next month for monthly frequency', () => {
      const config: ScheduleConfiguration = { frequency: 'monthly', day_of_month: 1, time: '02:00', retry_on_failure: false, max_retries: 0, retry_delay_minutes: 15 };
      const result = calculateNextSyncTime(config, new Date(2025, 5, 15, 10, 0, 0));
      expect(result).not.toBeNull();
      expect(result!.getMonth()).toBe(6); // July (0-indexed)
      expect(result!.getDate()).toBe(1);
    });

    it('should return null for cron without expression', () => {
      const config: ScheduleConfiguration = { frequency: 'cron', retry_on_failure: false, max_retries: 0, retry_delay_minutes: 15 };
      expect(calculateNextSyncTime(config)).toBeNull();
    });

    it('should parse simple cron expression', () => {
      const config: ScheduleConfiguration = { frequency: 'cron', cron_expression: '0 2 * * *', retry_on_failure: false, max_retries: 0, retry_delay_minutes: 15 };
      const result = calculateNextSyncTime(config, new Date(2025, 5, 15, 10, 0, 0));
      expect(result).not.toBeNull();
      expect(result!.getHours()).toBe(2);
      expect(result!.getMinutes()).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // validateScheduleConfig
  // ---------------------------------------------------------------------------

  describe('validateScheduleConfig', () => {
    it('should validate valid config', () => {
      const config: ScheduleConfiguration = {
        frequency: 'daily',
        time: '09:00',
        retry_on_failure: true,
        max_retries: 3,
        retry_delay_minutes: 15,
      };
      expect(validateScheduleConfig(config).valid).toBe(true);
    });

    it('should require cron expression for cron frequency', () => {
      const config: ScheduleConfiguration = {
        frequency: 'cron',
        retry_on_failure: false,
        max_retries: 0,
        retry_delay_minutes: 15,
      };
      const result = validateScheduleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cron expression is required for cron frequency');
    });

    it('should validate time format', () => {
      const config: ScheduleConfiguration = {
        frequency: 'daily',
        time: '9:00',
        retry_on_failure: false,
        max_retries: 0,
        retry_delay_minutes: 15,
      };
      const result = validateScheduleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('HH:MM'))).toBe(true);
    });

    it('should validate day_of_week', () => {
      const config: ScheduleConfiguration = {
        frequency: 'weekly',
        day_of_week: 7,
        retry_on_failure: false,
        max_retries: 0,
        retry_delay_minutes: 15,
      };
      expect(validateScheduleConfig(config).valid).toBe(false);
    });

    it('should validate day_of_month', () => {
      const config: ScheduleConfiguration = {
        frequency: 'monthly',
        day_of_month: 31,
        retry_on_failure: false,
        max_retries: 0,
        retry_delay_minutes: 15,
      };
      expect(validateScheduleConfig(config).valid).toBe(false);
    });

    it('should validate max_retries', () => {
      const config: ScheduleConfiguration = {
        frequency: 'daily',
        retry_on_failure: true,
        max_retries: 11,
        retry_delay_minutes: 15,
      };
      expect(validateScheduleConfig(config).valid).toBe(false);
    });

    it('should validate retry_delay_minutes', () => {
      const config: ScheduleConfiguration = {
        frequency: 'daily',
        retry_on_failure: true,
        max_retries: 3,
        retry_delay_minutes: 1500,
      };
      expect(validateScheduleConfig(config).valid).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // getScheduleDescription
  // ---------------------------------------------------------------------------

  describe('getScheduleDescription', () => {
    it('should describe manual', () => {
      expect(getScheduleDescription({ frequency: 'manual', retry_on_failure: false, max_retries: 0, retry_delay_minutes: 15 })).toBe('Manual sync only');
    });

    it('should describe hourly', () => {
      expect(getScheduleDescription({ frequency: 'hourly', retry_on_failure: false, max_retries: 0, retry_delay_minutes: 15 })).toBe('Every hour');
    });

    it('should describe daily with time', () => {
      const desc = getScheduleDescription({ frequency: 'daily', time: '09:00', retry_on_failure: false, max_retries: 0, retry_delay_minutes: 15 });
      expect(desc).toContain('Daily');
      expect(desc).toContain('09:00');
    });

    it('should describe weekly with day name', () => {
      const desc = getScheduleDescription({ frequency: 'weekly', day_of_week: 1, time: '09:00', retry_on_failure: false, max_retries: 0, retry_delay_minutes: 15 });
      expect(desc).toContain('Monday');
    });

    it('should describe monthly', () => {
      const desc = getScheduleDescription({ frequency: 'monthly', day_of_month: 15, time: '02:00', retry_on_failure: false, max_retries: 0, retry_delay_minutes: 15 });
      expect(desc).toContain('Monthly');
      expect(desc).toContain('15');
    });

    it('should describe cron', () => {
      const desc = getScheduleDescription({ frequency: 'cron', cron_expression: '0 2 * * *', retry_on_failure: false, max_retries: 0, retry_delay_minutes: 15 });
      expect(desc).toContain('0 2 * * *');
    });

    it('should include timezone when provided', () => {
      const desc = getScheduleDescription({ frequency: 'daily', time: '09:00', timezone: 'America/New_York', retry_on_failure: false, max_retries: 0, retry_delay_minutes: 15 });
      expect(desc).toContain('America/New_York');
    });
  });

  // ---------------------------------------------------------------------------
  // getFrequencyOptions
  // ---------------------------------------------------------------------------

  describe('getFrequencyOptions', () => {
    it('should return all frequency options', () => {
      const options = getFrequencyOptions();
      expect(options).toHaveLength(6);
      expect(options.map(o => o.value)).toEqual(['manual', 'hourly', 'daily', 'weekly', 'monthly', 'cron']);
    });
  });

  // ---------------------------------------------------------------------------
  // Retry Logic
  // ---------------------------------------------------------------------------

  describe('calculateRetryDelay', () => {
    it('should use exponential backoff', () => {
      expect(calculateRetryDelay(1, 15)).toBe(15);
      expect(calculateRetryDelay(2, 15)).toBe(30);
      expect(calculateRetryDelay(3, 15)).toBe(60);
      expect(calculateRetryDelay(4, 15)).toBe(120);
    });
  });

  describe('calculateNextRetryTime', () => {
    it('should calculate retry time', () => {
      const config: ScheduleConfiguration = { frequency: 'daily', retry_on_failure: true, max_retries: 3, retry_delay_minutes: 15 };
      const from = new Date(2025, 5, 15, 10, 0, 0);
      const result = calculateNextRetryTime(1, config, from);
      // Attempt 1: 15 minutes delay
      expect(result.getMinutes()).toBe(15);
    });
  });

  describe('shouldRetry', () => {
    it('should return false when retry_on_failure is false', () => {
      const config: ScheduleConfiguration = { frequency: 'daily', retry_on_failure: false, max_retries: 3, retry_delay_minutes: 15 };
      expect(shouldRetry(1, config)).toBe(false);
    });

    it('should return true when under max retries', () => {
      const config: ScheduleConfiguration = { frequency: 'daily', retry_on_failure: true, max_retries: 3, retry_delay_minutes: 15 };
      expect(shouldRetry(1, config)).toBe(true);
      expect(shouldRetry(2, config)).toBe(true);
    });

    it('should return false when at max retries', () => {
      const config: ScheduleConfiguration = { frequency: 'daily', retry_on_failure: true, max_retries: 3, retry_delay_minutes: 15 };
      expect(shouldRetry(3, config)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // getCommonTimezones
  // ---------------------------------------------------------------------------

  describe('getCommonTimezones', () => {
    it('should return timezone list', () => {
      const timezones = getCommonTimezones();
      expect(timezones.length).toBeGreaterThan(0);
      expect(timezones[0].value).toBe('UTC');
      expect(timezones.find(tz => tz.value === 'America/New_York')).toBeTruthy();
    });
  });
});
