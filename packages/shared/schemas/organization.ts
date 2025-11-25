import { z } from 'zod';

/**
 * Branding settings schema
 */
export const brandingSettingsSchema = z.object({
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
}).strict();

/**
 * Default settings schema
 */
export const defaultSettingsSchema = z.object({
  defaultTemplateId: z.string().uuid().optional(),
  sessionTimeoutMinutes: z.number().int().min(15).max(1440).optional(),
}).strict();

/**
 * Feature flags schema
 */
export const featureSettingsSchema = z.object({
  enableAIAssist: z.boolean().optional(),
  enablePublicDefenders: z.boolean().optional(),
}).strict();

/**
 * Full organization settings schema
 */
export const organizationSettingsSchema = z.object({
  branding: brandingSettingsSchema.optional(),
  defaults: defaultSettingsSchema.optional(),
  features: featureSettingsSchema.optional(),
}).strict();

/**
 * Update organization request schema
 */
export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  settings: organizationSettingsSchema.partial().optional(),
}).strict();

export type BrandingSettings = z.infer<typeof brandingSettingsSchema>;
export type DefaultSettings = z.infer<typeof defaultSettingsSchema>;
export type FeatureSettings = z.infer<typeof featureSettingsSchema>;
export type OrganizationSettingsInput = z.infer<typeof organizationSettingsSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
