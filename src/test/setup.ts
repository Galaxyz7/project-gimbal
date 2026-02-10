// Note: vitest globals (describe, it, expect, vi, etc.) are available
// via globals: true in vitest.config.ts. Do NOT import from 'vitest' here
// as it causes "failed to find the runner" errors in Vitest 4.x + Node 24.

import { cleanup } from '@testing-library/react';

// Extend expect with jest-dom matchers (use dynamic import to avoid CJS issues)
const jestDomMatchers = await import('@testing-library/jest-dom/matchers');
expect.extend(jestDomMatchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock navigator.userAgent
Object.defineProperty(navigator, 'userAgent', {
  value: 'test-user-agent',
  configurable: true,
});
