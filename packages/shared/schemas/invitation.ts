/**
 * Invitation Schemas
 * Zod validation schemas for invitation operations
 */

import { z } from 'zod';

/**
 * Schema for creating an invitation
 */
export const createInvitationSchema = z.object({
  expirationDays: z
    .number()
    .int()
    .min(1, 'Expiration must be at least 1 day')
    .max(90, 'Expiration cannot exceed 90 days')
    .optional()
    .default(30),
  usageLimit: z
    .number()
    .int()
    .min(0, 'Usage limit cannot be negative')
    .max(100, 'Usage limit cannot exceed 100')
    .optional()
    .default(1),
});

/**
 * Schema for validating an invitation token (URL parameter)
 */
export const validateInvitationTokenSchema = z.object({
  token: z
    .string()
    .min(1, 'Token is required')
    .max(2048, 'Token too long'),
});

/**
 * Schema for redeeming an invitation
 */
export const redeemInvitationSchema = z.object({
  token: z
    .string()
    .min(1, 'Token is required')
    .max(2048, 'Token too long'),
  debtorEmail: z
    .string()
    .email('Invalid email format')
    .optional(),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type ValidateInvitationTokenInput = z.infer<typeof validateInvitationTokenSchema>;
export type RedeemInvitationInput = z.infer<typeof redeemInvitationSchema>;
