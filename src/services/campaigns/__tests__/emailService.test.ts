
import { emailService, MAX_SUBJECT_LENGTH, RECOMMENDED_SUBJECT_LENGTH } from '../emailService';

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

// =============================================================================
// Tests
// =============================================================================

describe('emailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // sendSingle
  // ---------------------------------------------------------------------------

  describe('sendSingle', () => {
    it('should send email via edge function', async () => {
      mockInvoke.mockResolvedValue({
        data: { success: true, messageId: 'msg-1', externalId: 'ext-1' },
        error: null,
      });
      const result = await emailService.sendSingle({
        messageId: 'msg-1',
        to: 'test@example.com',
        subject: 'Test',
        html: '<h1>Hello</h1>',
      });
      expect(result.success).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('send-email', expect.objectContaining({
        body: expect.objectContaining({ messageId: 'msg-1', to: 'test@example.com' }),
      }));
    });

    it('should return error on invoke failure', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Edge function error' },
      });
      const result = await emailService.sendSingle({
        messageId: 'msg-1',
        to: 'test@example.com',
        subject: 'Test',
        html: '<h1>Hello</h1>',
      });
      expect(result.success).toBe(false);
      expect(result.code).toBe('INVOKE_ERROR');
    });
  });

  // ---------------------------------------------------------------------------
  // checkConsent
  // ---------------------------------------------------------------------------

  describe('checkConsent', () => {
    it('should return canSend true when consent granted', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null });
      const result = await emailService.checkConsent('member-1');
      expect(result.canSend).toBe(true);
    });

    it('should return canSend false when no consent', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null });
      const result = await emailService.checkConsent('member-1');
      expect(result.canSend).toBe(false);
    });

    it('should return canSend false on error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });
      const result = await emailService.checkConsent('member-1');
      expect(result.canSend).toBe(false);
      expect(result.reason).toContain('Failed to verify');
    });
  });

  // ---------------------------------------------------------------------------
  // isValidEmail
  // ---------------------------------------------------------------------------

  describe('isValidEmail', () => {
    it('should accept valid emails', () => {
      expect(emailService.isValidEmail('test@example.com')).toBe(true);
      expect(emailService.isValidEmail('user+tag@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(emailService.isValidEmail('not-an-email')).toBe(false);
      expect(emailService.isValidEmail('@domain.com')).toBe(false);
      expect(emailService.isValidEmail('user@')).toBe(false);
      expect(emailService.isValidEmail('')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // renderTemplate
  // ---------------------------------------------------------------------------

  describe('renderTemplate', () => {
    it('should replace template variables', () => {
      const result = emailService.renderTemplate(
        'Hello {{firstName}}, welcome to {{company}}!',
        { firstName: 'John', company: 'Gimbal' }
      );
      expect(result).toBe('Hello John, welcome to Gimbal!');
    });

    it('should leave unmatched variables intact', () => {
      const result = emailService.renderTemplate(
        'Hello {{firstName}} {{lastName}}',
        { firstName: 'John' }
      );
      expect(result).toBe('Hello John {{lastName}}');
    });
  });

  // ---------------------------------------------------------------------------
  // validateContent
  // ---------------------------------------------------------------------------

  describe('validateContent', () => {
    it('should pass valid content', () => {
      const result = emailService.validateContent(
        '<p>Hello! <a href="{{unsubscribeUrl}}">Unsubscribe</a> {{physicalAddress}}</p>',
        'Welcome'
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require subject', () => {
      const result = emailService.validateContent('<p>Hello</p>', '');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Subject is required');
    });

    it('should require content', () => {
      const result = emailService.validateContent('', 'Test');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Email content is required');
    });

    it('should error on subject exceeding max length', () => {
      const longSubject = 'x'.repeat(MAX_SUBJECT_LENGTH + 1);
      const result = emailService.validateContent('<p>Hello</p>', longSubject);
      expect(result.errors.some(e => e.includes('maximum length'))).toBe(true);
    });

    it('should warn on subject exceeding recommended length', () => {
      const mediumSubject = 'x'.repeat(RECOMMENDED_SUBJECT_LENGTH + 1);
      const result = emailService.validateContent(
        '<p>Hello unsubscribe {{physicalAddress}}</p>',
        mediumSubject
      );
      expect(result.warnings.some(w => w.includes('recommended'))).toBe(true);
    });

    it('should warn when missing unsubscribe', () => {
      const result = emailService.validateContent('<p>Hello</p>', 'Test');
      expect(result.warnings.some(w => w.includes('unsubscribe'))).toBe(true);
    });

    it('should warn when missing physical address', () => {
      const result = emailService.validateContent('<p>Hello unsubscribe</p>', 'Test');
      expect(result.warnings.some(w => w.includes('physical address'))).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // htmlToText
  // ---------------------------------------------------------------------------

  describe('htmlToText', () => {
    it('should strip HTML tags', () => {
      expect(emailService.htmlToText('<p>Hello <b>World</b></p>')).toContain('Hello World');
    });

    it('should convert links to text with URL', () => {
      const result = emailService.htmlToText('<a href="https://example.com">Click here</a>');
      expect(result).toContain('Click here');
      expect(result).toContain('https://example.com');
    });

    it('should decode HTML entities', () => {
      expect(emailService.htmlToText('A &amp; B &lt; C')).toBe('A & B < C');
    });

    it('should remove scripts and styles', () => {
      const html = '<script>alert("xss")</script><style>.x{}</style><p>Content</p>';
      const result = emailService.htmlToText(html);
      expect(result).not.toContain('alert');
      expect(result).toContain('Content');
    });
  });

  // ---------------------------------------------------------------------------
  // maskEmail
  // ---------------------------------------------------------------------------

  describe('maskEmail', () => {
    it('should mask email', () => {
      expect(emailService.maskEmail('john@example.com')).toBe('jo***@example.com');
    });

    it('should handle short local part', () => {
      expect(emailService.maskEmail('ab@example.com')).toBe('***@example.com');
    });

    it('should handle invalid email', () => {
      expect(emailService.maskEmail('invalid')).toBe('***@***');
    });
  });

  // ---------------------------------------------------------------------------
  // calculateSize
  // ---------------------------------------------------------------------------

  describe('calculateSize', () => {
    it('should calculate size in KB', () => {
      const html = 'x'.repeat(2048);
      expect(emailService.calculateSize(html)).toBe(2);
    });

    it('should include text in calculation', () => {
      const html = 'x'.repeat(1024);
      const text = 'x'.repeat(1024);
      expect(emailService.calculateSize(html, text)).toBe(2);
    });

    it('should round up', () => {
      expect(emailService.calculateSize('hello')).toBe(1);
    });
  });
});
