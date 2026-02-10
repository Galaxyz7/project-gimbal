
import {
  getTemplates,
  getStarterTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  validateSmsContent,
  renderTemplate,
  extractTemplateVariables,
  validateTemplateVariables,
} from '../templateService';

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
    contains: vi.fn(),
    order: vi.fn(),
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

const resolvableChain = (result: { data: unknown; error: unknown }) => {
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
// Mock Data
// =============================================================================

const mockTemplateRow = {
  id: '00000000-0000-0000-0000-000000100000',
  user_id: '00000000-0000-0000-0000-000000000001',
  name: 'Welcome SMS',
  description: 'A welcome message for new members',
  template_type: 'sms',
  subject: null,
  content: 'Hi {{firstName}}, welcome to {{siteName}}!',
  preheader: null,
  is_active: true,
  is_system: false,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const mockSystemTemplateRow = {
  ...mockTemplateRow,
  id: '00000000-0000-0000-0000-000000200000',
  name: 'Welcome Message',
  is_system: true,
  user_id: '00000000-0000-0000-0000-000000000000',
};

// =============================================================================
// Tests
// =============================================================================

describe('templateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolvableChain({ data: [], error: null });
  });

  // ---------------------------------------------------------------------------
  // getTemplates
  // ---------------------------------------------------------------------------

  describe('getTemplates', () => {
    it('should fetch all active templates', async () => {
      resolvableChain({ data: [mockTemplateRow], error: null });
      const result = await getTemplates();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Welcome SMS');
      expect(result[0].isSystem).toBe(false);
    });

    it('should filter by type', async () => {
      resolvableChain({ data: [mockTemplateRow], error: null });
      await getTemplates({ type: 'sms' });
      expect(mockQueryChain.eq).toHaveBeenCalledWith('template_type', 'sms');
    });

    it('should return empty array when no templates', async () => {
      resolvableChain({ data: [], error: null });
      const result = await getTemplates();
      expect(result).toEqual([]);
    });

    it('should throw on error', async () => {
      resolvableChain({ data: null, error: { message: 'Network error' } });
      await expect(getTemplates()).rejects.toThrow('Failed to fetch templates');
    });
  });

  // ---------------------------------------------------------------------------
  // getStarterTemplates
  // ---------------------------------------------------------------------------

  describe('getStarterTemplates', () => {
    it('should fetch system templates', async () => {
      resolvableChain({ data: [mockSystemTemplateRow], error: null });
      const result = await getStarterTemplates();
      expect(result).toHaveLength(1);
      expect(result[0].isSystem).toBe(true);
      expect(mockQueryChain.eq).toHaveBeenCalledWith('is_system', true);
    });

    it('should filter by type', async () => {
      resolvableChain({ data: [], error: null });
      await getStarterTemplates('email');
      expect(mockQueryChain.eq).toHaveBeenCalledWith('template_type', 'email');
    });

    it('should throw on error', async () => {
      resolvableChain({ data: null, error: { message: 'Network error' } });
      await expect(getStarterTemplates()).rejects.toThrow('Failed to fetch starter templates');
    });
  });

  // ---------------------------------------------------------------------------
  // getTemplateById
  // ---------------------------------------------------------------------------

  describe('getTemplateById', () => {
    it('should fetch template by id', async () => {
      mockSingle.mockResolvedValue({ data: mockTemplateRow, error: null });
      const result = await getTemplateById('00000000-0000-0000-0000-000000100000');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Welcome SMS');
    });

    it('should return null when not found', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
      const result = await getTemplateById('nonexistent');
      expect(result).toBeNull();
    });

    it('should throw on non-404 error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: 'OTHER', message: 'Server error' } });
      await expect(getTemplateById('test')).rejects.toThrow('Failed to fetch template');
    });
  });

  // ---------------------------------------------------------------------------
  // createTemplate
  // ---------------------------------------------------------------------------

  describe('createTemplate', () => {
    it('should create a template', async () => {
      mockSingle.mockResolvedValue({ data: mockTemplateRow, error: null });
      const result = await createTemplate({
        name: 'Welcome SMS',
        templateType: 'sms',
        content: 'Hi {{firstName}}!',
      });
      expect(result.name).toBe('Welcome SMS');
      expect(mockQueryChain.insert).toHaveBeenCalled();
    });

    it('should throw on error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Duplicate name' } });
      await expect(
        createTemplate({ name: 'Test', templateType: 'sms', content: 'Hi' })
      ).rejects.toThrow('Failed to create template');
    });
  });

  // ---------------------------------------------------------------------------
  // updateTemplate
  // ---------------------------------------------------------------------------

  describe('updateTemplate', () => {
    it('should update a template', async () => {
      const updated = { ...mockTemplateRow, name: 'Updated SMS' };
      mockSingle.mockResolvedValue({ data: updated, error: null });
      const result = await updateTemplate('test-id', { name: 'Updated SMS' });
      expect(result.name).toBe('Updated SMS');
    });

    it('should throw on error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });
      await expect(updateTemplate('test-id', { name: 'Test' })).rejects.toThrow('Failed to update template');
    });
  });

  // ---------------------------------------------------------------------------
  // deleteTemplate
  // ---------------------------------------------------------------------------

  describe('deleteTemplate', () => {
    it('should soft delete a template', async () => {
      resolvableChain({ data: null, error: null });
      await deleteTemplate('test-id');
      expect(mockQueryChain.update).toHaveBeenCalledWith({ is_active: false });
    });

    it('should throw on error', async () => {
      resolvableChain({ data: null, error: { message: 'Error' } });
      await expect(deleteTemplate('test-id')).rejects.toThrow('Failed to delete template');
    });
  });

  // ---------------------------------------------------------------------------
  // duplicateTemplate
  // ---------------------------------------------------------------------------

  describe('duplicateTemplate', () => {
    it('should duplicate a template with default name', async () => {
      // First call: getTemplateById
      mockSingle.mockResolvedValueOnce({ data: mockTemplateRow, error: null });
      // Second call: createTemplate
      const duplicated = { ...mockTemplateRow, id: 'new-id', name: 'Welcome SMS (Copy)' };
      mockSingle.mockResolvedValueOnce({ data: duplicated, error: null });

      const result = await duplicateTemplate('00000000-0000-0000-0000-000000100000');
      expect(result.name).toBe('Welcome SMS (Copy)');
    });

    it('should duplicate with custom name', async () => {
      mockSingle.mockResolvedValueOnce({ data: mockTemplateRow, error: null });
      const duplicated = { ...mockTemplateRow, id: 'new-id', name: 'My Custom Template' };
      mockSingle.mockResolvedValueOnce({ data: duplicated, error: null });

      const result = await duplicateTemplate('00000000-0000-0000-0000-000000100000', 'My Custom Template');
      expect(result.name).toBe('My Custom Template');
    });

    it('should throw when source not found', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
      await expect(duplicateTemplate('nonexistent')).rejects.toThrow('Template not found');
    });
  });

  // ---------------------------------------------------------------------------
  // validateSmsContent
  // ---------------------------------------------------------------------------

  describe('validateSmsContent', () => {
    it('should validate valid SMS', () => {
      const result = validateSmsContent('Hello World');
      expect(result.isValid).toBe(true);
      expect(result.characterCount).toBe(11);
      expect(result.segmentCount).toBe(1);
      expect(result.issues).toHaveLength(0);
    });

    it('should flag empty content', () => {
      const result = validateSmsContent('');
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Content cannot be empty');
    });

    it('should detect multi-segment messages', () => {
      const longMessage = 'A'.repeat(161);
      const result = validateSmsContent(longMessage);
      expect(result.segmentCount).toBeGreaterThan(1);
      expect(result.issues.some((i) => i.includes('segments'))).toBe(true);
    });

    it('should detect unicode characters', () => {
      const result = validateSmsContent('Hello! 😊');
      expect(result.issues.some((i) => i.includes('special characters'))).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // renderTemplate
  // ---------------------------------------------------------------------------

  describe('renderTemplate', () => {
    it('should replace variables', () => {
      const result = renderTemplate('Hi {{firstName}}, welcome to {{siteName}}!', {
        firstName: 'John',
        siteName: 'Test Gym',
      });
      expect(result).toBe('Hi John, welcome to Test Gym!');
    });

    it('should replace null/undefined with empty string', () => {
      const result = renderTemplate('Hi {{firstName}}!', { firstName: null });
      expect(result).toBe('Hi !');
    });

    it('should leave unreplaced variables', () => {
      const result = renderTemplate('Hi {{firstName}}, {{lastName}}!', {
        firstName: 'John',
      });
      expect(result).toBe('Hi John, {{lastName}}!');
    });
  });

  // ---------------------------------------------------------------------------
  // extractTemplateVariables
  // ---------------------------------------------------------------------------

  describe('extractTemplateVariables', () => {
    it('should extract variables', () => {
      const vars = extractTemplateVariables('Hi {{firstName}}, welcome to {{siteName}}!');
      expect(vars).toEqual(['firstName', 'siteName']);
    });

    it('should deduplicate variables', () => {
      const vars = extractTemplateVariables('{{name}} is {{name}}');
      expect(vars).toEqual(['name']);
    });

    it('should return empty array when no variables', () => {
      const vars = extractTemplateVariables('Plain text message');
      expect(vars).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // validateTemplateVariables
  // ---------------------------------------------------------------------------

  describe('validateTemplateVariables', () => {
    it('should pass when all variables provided', () => {
      const result = validateTemplateVariables('Hi {{firstName}}!', { firstName: 'John' });
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should fail when variables missing', () => {
      const result = validateTemplateVariables('Hi {{firstName}} {{lastName}}!', { firstName: 'John' });
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['lastName']);
    });
  });

  // ---------------------------------------------------------------------------
  // Transform tests
  // ---------------------------------------------------------------------------

  describe('template transform', () => {
    it('should transform isSystem field correctly', async () => {
      resolvableChain({ data: [mockSystemTemplateRow], error: null });
      const result = await getTemplates();
      expect(result[0].isSystem).toBe(true);
    });

    it('should default isSystem to false when missing', async () => {
      const rowWithoutSystem = { ...mockTemplateRow };
      delete (rowWithoutSystem as Record<string, unknown>).is_system;
      resolvableChain({ data: [rowWithoutSystem], error: null });
      const result = await getTemplates();
      expect(result[0].isSystem).toBe(false);
    });
  });
});
