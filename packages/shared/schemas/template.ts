import { z } from 'zod';

/**
 * Schema for creating a new template
 */
export const createTemplateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be 255 characters or less')
    .trim(),
  description: z
    .string()
    .max(1000, 'Description must be 1000 characters or less')
    .trim()
    .optional(),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(100000, 'Content must be 100,000 characters or less'),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

/**
 * Schema for updating a template
 */
export const updateTemplateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be 255 characters or less')
    .trim()
    .optional(),
  description: z
    .string()
    .max(1000, 'Description must be 1000 characters or less')
    .trim()
    .nullable()
    .optional(),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(100000, 'Content must be 100,000 characters or less')
    .optional(),
  isActive: z.boolean().optional(),
});

export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

/**
 * Schema for template preview request
 */
export const templatePreviewSchema = z.object({
  sampleData: z.record(z.string(), z.string()),
});

export type TemplatePreviewInput = z.infer<typeof templatePreviewSchema>;

/**
 * Schema for template list query parameters
 */
export const templateListQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  search: z.string().max(100).optional(),
  createdBy: z.string().uuid().optional(),
});

export type TemplateListQuery = z.infer<typeof templateListQuerySchema>;

/**
 * Schema for template ID parameter
 */
export const templateIdParamSchema = z.object({
  templateId: z.string().uuid('Invalid template ID'),
});

export type TemplateIdParam = z.infer<typeof templateIdParamSchema>;

/**
 * Schema for version parameter
 */
export const versionParamSchema = z.object({
  templateId: z.string().uuid('Invalid template ID'),
  version: z.coerce.number().int().positive('Version must be a positive integer'),
});

export type VersionParam = z.infer<typeof versionParamSchema>;

/**
 * Template response type
 */
export interface TemplateResponse {
  id: string;
  name: string;
  description: string | null;
  content: string;
  variables: string[];
  version: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Template version response type
 */
export interface TemplateVersionResponse {
  id: string;
  templateId: string;
  version: number;
  content: string;
  variables: string[];
  createdAt: string;
}

/**
 * Template preview response type
 */
export interface TemplatePreviewResponse {
  renderedContent: string;
  missingVariables: string[];
}
