import { describe, it, expect } from 'vitest';
import {
  createTemplateSchema,
  updateTemplateSchema,
  templatePreviewSchema,
  templateListQuerySchema,
  templateIdParamSchema,
  versionParamSchema,
} from './template.js';

describe('Template Schemas', () => {
  describe('createTemplateSchema', () => {
    it('should accept valid template creation', () => {
      const result = createTemplateSchema.safeParse({
        name: 'Default Demand Letter',
        description: 'Standard demand letter template',
        content: 'Dear {{debtor_name}}, you owe {{debt_amount}}.',
      });
      expect(result.success).toBe(true);
    });

    it('should accept template without description', () => {
      const result = createTemplateSchema.safeParse({
        name: 'Simple Template',
        content: 'Template content here.',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const result = createTemplateSchema.safeParse({
        name: '',
        content: 'Some content',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty content', () => {
      const result = createTemplateSchema.safeParse({
        name: 'Template',
        content: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject name over 255 characters', () => {
      const result = createTemplateSchema.safeParse({
        name: 'a'.repeat(256),
        content: 'Content',
      });
      expect(result.success).toBe(false);
    });

    it('should trim whitespace from name', () => {
      const result = createTemplateSchema.safeParse({
        name: '  Trimmed Name  ',
        content: 'Content',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Trimmed Name');
      }
    });
  });

  describe('updateTemplateSchema', () => {
    it('should accept partial updates', () => {
      const result = updateTemplateSchema.safeParse({
        name: 'Updated Name',
      });
      expect(result.success).toBe(true);
    });

    it('should accept all fields', () => {
      const result = updateTemplateSchema.safeParse({
        name: 'Updated Name',
        description: 'Updated description',
        content: 'Updated content',
        isActive: false,
      });
      expect(result.success).toBe(true);
    });

    it('should accept null description', () => {
      const result = updateTemplateSchema.safeParse({
        description: null,
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty object', () => {
      const result = updateTemplateSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('templatePreviewSchema', () => {
    it('should accept valid sample data', () => {
      const result = templatePreviewSchema.safeParse({
        sampleData: {
          debtor_name: 'John Doe',
          debt_amount: '$5,000.00',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty sample data', () => {
      const result = templatePreviewSchema.safeParse({
        sampleData: {},
      });
      expect(result.success).toBe(true);
    });

    it('should reject non-string values', () => {
      const result = templatePreviewSchema.safeParse({
        sampleData: {
          debtor_name: 123,
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('templateListQuerySchema', () => {
    it('should accept valid query parameters', () => {
      const result = templateListQuerySchema.safeParse({
        cursor: '550e8400-e29b-41d4-a716-446655440000',
        limit: '50',
        isActive: 'true',
        search: 'demand',
        createdBy: '550e8400-e29b-41d4-a716-446655440001',
      });
      expect(result.success).toBe(true);
    });

    it('should use default limit', () => {
      const result = templateListQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });

    it('should coerce limit to number', () => {
      const result = templateListQuerySchema.safeParse({
        limit: '30',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(30);
      }
    });

    it('should transform isActive string to boolean', () => {
      const trueResult = templateListQuerySchema.safeParse({ isActive: 'true' });
      expect(trueResult.success).toBe(true);
      if (trueResult.success) {
        expect(trueResult.data.isActive).toBe(true);
      }

      const falseResult = templateListQuerySchema.safeParse({ isActive: 'false' });
      expect(falseResult.success).toBe(true);
      if (falseResult.success) {
        expect(falseResult.data.isActive).toBe(false);
      }
    });

    it('should reject limit over 100', () => {
      const result = templateListQuerySchema.safeParse({
        limit: '101',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid cursor UUID', () => {
      const result = templateListQuerySchema.safeParse({
        cursor: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('templateIdParamSchema', () => {
    it('should accept valid UUID', () => {
      const result = templateIdParamSchema.safeParse({
        templateId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = templateIdParamSchema.safeParse({
        templateId: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('versionParamSchema', () => {
    it('should accept valid params', () => {
      const result = versionParamSchema.safeParse({
        templateId: '550e8400-e29b-41d4-a716-446655440000',
        version: '3',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBe(3);
      }
    });

    it('should reject non-positive version', () => {
      const result = versionParamSchema.safeParse({
        templateId: '550e8400-e29b-41d4-a716-446655440000',
        version: '0',
      });
      expect(result.success).toBe(false);
    });

    it('should coerce version to number', () => {
      const result = versionParamSchema.safeParse({
        templateId: '550e8400-e29b-41d4-a716-446655440000',
        version: '5',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.version).toBe('number');
      }
    });
  });
});
