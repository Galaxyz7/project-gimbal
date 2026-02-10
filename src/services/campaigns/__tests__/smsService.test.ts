
import {
  smsService,
  SMS_SEGMENT_LENGTH,
  SMS_UNICODE_SEGMENT_LENGTH,
  MAX_SMS_LENGTH,
} from '../smsService';

// =============================================================================
// Mock Supabase
// =============================================================================

const { mockInvoke, mockRpc } = vi.hoisted(() => {
  const mockInvoke = vi.fn();
  const mockRpc = vi.fn();
  return { mockInvoke, mockRpc };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: { invoke: mockInvoke },
    rpc: mockRpc,
  },
}));

vi.mock('@/utils/phone', () => ({
  validateE164: vi.fn((phone: string) => ({
    valid: phone.startsWith('+1') && phone.length === 12,
    formatted: phone,
    error: phone.startsWith('+1') ? undefined : 'Invalid format',
  })),
  formatToE164: vi.fn((phone: string) => (phone.startsWith('+1') ? phone : null)),
  maskPhone: vi.fn((phone: string) => `***${phone.slice(-4)}`),
}));

// =============================================================================
// Tests
// =============================================================================

describe('smsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // sendSingle
  // ---------------------------------------------------------------------------

  describe('sendSingle', () => {
    it('should send SMS via edge function', async () => {
      mockInvoke.mockResolvedValue({
        data: { success: true, messageId: 'msg-1', externalId: 'ext-1' },
        error: null,
      });
      const result = await smsService.sendSingle({
        messageId: 'msg-1',
        to: '+12125551234',
        body: 'Hello!',
      });
      expect(result.success).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('send-sms', expect.objectContaining({
        body: expect.objectContaining({ messageId: 'msg-1' }),
      }));
    });

    it('should return error on invoke failure', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Edge function error' },
      });
      const result = await smsService.sendSingle({
        messageId: 'msg-1',
        to: '+12125551234',
        body: 'Hello!',
      });
      expect(result.success).toBe(false);
      expect(result.code).toBe('INVOKE_ERROR');
    });
  });

  // ---------------------------------------------------------------------------
  // checkConsent
  // ---------------------------------------------------------------------------

  describe('checkConsent', () => {
    it('should return canSend true', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null });
      const result = await smsService.checkConsent('member-1');
      expect(result.canSend).toBe(true);
    });

    it('should return canSend false', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null });
      const result = await smsService.checkConsent('member-1');
      expect(result.canSend).toBe(false);
      expect(result.reason).toContain('consent');
    });

    it('should handle errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'Error' } });
      const result = await smsService.checkConsent('member-1');
      expect(result.canSend).toBe(false);
    });

    it('should pass timezone', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null });
      await smsService.checkConsent('member-1', 'America/Chicago');
      expect(mockRpc).toHaveBeenCalledWith('can_send_sms', expect.objectContaining({
        p_timezone: 'America/Chicago',
      }));
    });
  });

  // ---------------------------------------------------------------------------
  // validatePhoneNumber / formatPhoneNumber / maskPhoneNumber
  // ---------------------------------------------------------------------------

  describe('validatePhoneNumber', () => {
    it('should delegate to validateE164', () => {
      const result = smsService.validatePhoneNumber('+12125551234');
      expect(result.valid).toBe(true);
    });
  });

  describe('formatPhoneNumber', () => {
    it('should delegate to formatToE164', () => {
      expect(smsService.formatPhoneNumber('+12125551234')).toBe('+12125551234');
    });
  });

  describe('maskPhoneNumber', () => {
    it('should mask phone number', () => {
      expect(smsService.maskPhoneNumber('+12125551234')).toBe('***1234');
    });
  });

  // ---------------------------------------------------------------------------
  // calculateSegments
  // ---------------------------------------------------------------------------

  describe('calculateSegments', () => {
    it('should calculate single segment for short message', () => {
      const result = smsService.calculateSegments('Hello World');
      expect(result.segmentCount).toBe(1);
      expect(result.isUnicode).toBe(false);
      expect(result.segmentLength).toBe(SMS_SEGMENT_LENGTH);
    });

    it('should calculate multiple segments for long message', () => {
      const longMsg = 'x'.repeat(200);
      const result = smsService.calculateSegments(longMsg);
      expect(result.segmentCount).toBe(2);
      expect(result.characterCount).toBe(200);
    });

    it('should detect unicode and use shorter segment length', () => {
      const unicodeMsg = 'Hello 你好';
      const result = smsService.calculateSegments(unicodeMsg);
      expect(result.isUnicode).toBe(true);
      expect(result.segmentLength).toBe(SMS_UNICODE_SEGMENT_LENGTH);
    });

    it('should calculate remaining characters in segment', () => {
      const result = smsService.calculateSegments('Hello');
      expect(result.remainingInSegment).toBe(SMS_SEGMENT_LENGTH - 5);
    });

    it('should return 1 segment for empty string', () => {
      const result = smsService.calculateSegments('');
      expect(result.segmentCount).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // renderTemplate
  // ---------------------------------------------------------------------------

  describe('renderTemplate', () => {
    it('should replace variables', () => {
      expect(
        smsService.renderTemplate('Hi {{firstName}}!', { firstName: 'Jane' })
      ).toBe('Hi Jane!');
    });

    it('should leave unmatched variables', () => {
      expect(
        smsService.renderTemplate('Hi {{firstName}} {{lastName}}', { firstName: 'Jane' })
      ).toBe('Hi Jane {{lastName}}');
    });
  });

  // ---------------------------------------------------------------------------
  // validateContent
  // ---------------------------------------------------------------------------

  describe('validateContent', () => {
    it('should pass valid content with opt-out', () => {
      const result = smsService.validateContent('Hello! Reply STOP to unsubscribe.');
      expect(result.valid).toBe(true);
    });

    it('should error on empty content', () => {
      const result = smsService.validateContent('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Message content is required');
    });

    it('should error on content exceeding max length', () => {
      const result = smsService.validateContent('x'.repeat(MAX_SMS_LENGTH + 1));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('maximum length'))).toBe(true);
    });

    it('should warn for multi-segment messages', () => {
      const result = smsService.validateContent('x'.repeat(200) + ' Reply STOP');
      expect(result.warnings.some(w => w.includes('segments'))).toBe(true);
    });

    it('should warn for unicode characters', () => {
      const result = smsService.validateContent('Hello 你好 STOP');
      expect(result.warnings.some(w => w.includes('special characters'))).toBe(true);
    });

    it('should warn when missing opt-out', () => {
      const result = smsService.validateContent('Hello World');
      expect(result.warnings.some(w => w.includes('opt-out'))).toBe(true);
    });
  });
});
