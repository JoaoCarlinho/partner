import { describe, it, expect } from 'vitest';
import {
  brandingSettingsSchema,
  defaultSettingsSchema,
  featureSettingsSchema,
  organizationSettingsSchema,
  updateOrganizationSchema,
} from './organization.js';

describe('Organization Schemas', () => {
  describe('brandingSettingsSchema', () => {
    it('should accept valid branding settings', () => {
      const result = brandingSettingsSchema.safeParse({
        logoUrl: 'https://example.com/logo.png',
        primaryColor: '#493087',
        secondaryColor: '#6B4BA3',
      });
      expect(result.success).toBe(true);
    });

    it('should accept partial branding settings', () => {
      const result = brandingSettingsSchema.safeParse({
        primaryColor: '#493087',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid hex color', () => {
      const result = brandingSettingsSchema.safeParse({
        primaryColor: 'red',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid URL', () => {
      const result = brandingSettingsSchema.safeParse({
        logoUrl: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('defaultSettingsSchema', () => {
    it('should accept valid default settings', () => {
      const result = defaultSettingsSchema.safeParse({
        defaultTemplateId: '550e8400-e29b-41d4-a716-446655440000',
        sessionTimeoutMinutes: 480,
      });
      expect(result.success).toBe(true);
    });

    it('should reject non-UUID templateId', () => {
      const result = defaultSettingsSchema.safeParse({
        defaultTemplateId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject session timeout below minimum', () => {
      const result = defaultSettingsSchema.safeParse({
        sessionTimeoutMinutes: 10,
      });
      expect(result.success).toBe(false);
    });

    it('should reject session timeout above maximum', () => {
      const result = defaultSettingsSchema.safeParse({
        sessionTimeoutMinutes: 1500,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('featureSettingsSchema', () => {
    it('should accept valid feature settings', () => {
      const result = featureSettingsSchema.safeParse({
        enableAIAssist: true,
        enablePublicDefenders: false,
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty object', () => {
      const result = featureSettingsSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('organizationSettingsSchema', () => {
    it('should accept complete settings', () => {
      const result = organizationSettingsSchema.safeParse({
        branding: {
          logoUrl: 'https://example.com/logo.png',
          primaryColor: '#493087',
        },
        defaults: {
          sessionTimeoutMinutes: 480,
        },
        features: {
          enableAIAssist: true,
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty object', () => {
      const result = organizationSettingsSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('updateOrganizationSchema', () => {
    it('should accept name update', () => {
      const result = updateOrganizationSchema.safeParse({
        name: 'New Organization Name',
      });
      expect(result.success).toBe(true);
    });

    it('should accept settings update', () => {
      const result = updateOrganizationSchema.safeParse({
        settings: {
          branding: {
            primaryColor: '#FF0000',
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept combined update', () => {
      const result = updateOrganizationSchema.safeParse({
        name: 'Updated Name',
        settings: {
          features: {
            enableAIAssist: false,
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject name that is too short', () => {
      const result = updateOrganizationSchema.safeParse({
        name: 'A',
      });
      expect(result.success).toBe(false);
    });

    it('should reject name that is too long', () => {
      const result = updateOrganizationSchema.safeParse({
        name: 'A'.repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });
});
