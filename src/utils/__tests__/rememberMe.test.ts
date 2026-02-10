
import { isRememberMeActive, clearRememberMe, getRememberMeDaysRemaining } from '../rememberMe';
import { STORAGE_KEYS } from '@/constants/app';

describe('rememberMe', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isRememberMeActive', () => {
    it('should return false when not set', () => {
      expect(isRememberMeActive()).toBe(false);
    });

    it('should return false when flag is not "true"', () => {
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'false');
      expect(isRememberMeActive()).toBe(false);
    });

    it('should return false when no expiration set', () => {
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
      expect(isRememberMeActive()).toBe(false);
    });

    it('should return true when active and not expired', () => {
      const futureTime = Date.now() + 24 * 60 * 60 * 1000; // 1 day ahead
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME_EXPIRES, String(futureTime));
      expect(isRememberMeActive()).toBe(true);
    });

    it('should return false and clear when expired', () => {
      const pastTime = Date.now() - 1000; // 1 second ago
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME_EXPIRES, String(pastTime));
      expect(isRememberMeActive()).toBe(false);
      // Should have cleared
      expect(localStorage.getItem(STORAGE_KEYS.REMEMBER_ME)).toBeNull();
    });
  });

  describe('clearRememberMe', () => {
    it('should remove both keys from localStorage', () => {
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME_EXPIRES, '12345');
      clearRememberMe();
      expect(localStorage.getItem(STORAGE_KEYS.REMEMBER_ME)).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.REMEMBER_ME_EXPIRES)).toBeNull();
    });

    it('should not throw when keys do not exist', () => {
      expect(() => clearRememberMe()).not.toThrow();
    });
  });

  describe('getRememberMeDaysRemaining', () => {
    it('should return 0 when not set', () => {
      expect(getRememberMeDaysRemaining()).toBe(0);
    });

    it('should return 0 when expired', () => {
      const pastTime = Date.now() - 1000;
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME_EXPIRES, String(pastTime));
      expect(getRememberMeDaysRemaining()).toBe(0);
    });

    it('should return correct days remaining', () => {
      const fiveDaysFromNow = Date.now() + 5 * 24 * 60 * 60 * 1000;
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME_EXPIRES, String(fiveDaysFromNow));
      expect(getRememberMeDaysRemaining()).toBe(5);
    });

    it('should round up partial days', () => {
      const oneDayAndOneHour = Date.now() + (24 + 1) * 60 * 60 * 1000;
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME_EXPIRES, String(oneDayAndOneHour));
      expect(getRememberMeDaysRemaining()).toBe(2);
    });

    it('should return 1 for less than a day remaining', () => {
      const halfDay = Date.now() + 12 * 60 * 60 * 1000;
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME_EXPIRES, String(halfDay));
      expect(getRememberMeDaysRemaining()).toBe(1);
    });
  });
});
