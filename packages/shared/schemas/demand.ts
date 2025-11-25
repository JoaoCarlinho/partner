/**
 * Demand Letter Schemas
 * Zod validation schemas for letter generation
 */

import { z } from 'zod';
import { US_STATE_CODES, type USStateCode } from '../constants/fdcpaRules.js';

/**
 * Debt amount schema
 */
export const debtAmountSchema = z.object({
  principal: z.number().positive('Principal must be positive'),
  interest: z.number().nonnegative('Interest cannot be negative').optional(),
  fees: z.number().nonnegative('Fees cannot be negative').optional(),
});

/**
 * Case details schema for letter generation
 */
export const caseDetailsSchema = z.object({
  debtorName: z.string().min(1, 'Debtor name is required'),
  creditorName: z.string().min(1, 'Creditor name is required'),
  originalCreditor: z.string().optional(),
  debtAmount: debtAmountSchema,
  debtOriginDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Date must be in YYYY-MM-DD format'
  ),
  accountNumber: z.string().optional(),
  stateJurisdiction: z
    .string()
    .length(2)
    .toUpperCase()
    .refine(
      (code) => US_STATE_CODES.includes(code as USStateCode),
      'Invalid US state code'
    ),
  additionalContext: z.string().max(2000, 'Additional context too long').optional(),
});

/**
 * Letter generation request schema
 */
export const generateLetterSchema = z.object({
  templateId: z.string().uuid('Invalid template ID'),
  caseId: z.string().uuid('Invalid case ID'),
  caseDetails: caseDetailsSchema,
  options: z
    .object({
      stream: z.boolean().optional(),
    })
    .optional(),
});

/**
 * Letter status enum
 */
export const letterStatusSchema = z.enum([
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'SENT',
]);

/**
 * Letter update schema
 */
export const updateLetterSchema = z.object({
  content: z.string().min(1, 'Content is required').optional(),
  status: letterStatusSchema.optional(),
});

/**
 * Case creation schema
 */
export const createCaseSchema = z.object({
  creditorName: z.string().min(1, 'Creditor name is required'),
  debtAmount: z.number().positive('Debt amount must be positive'),
  debtorName: z.string().optional(),
  debtorEmail: z.string().email('Invalid email').optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Case status enum
 */
export const caseStatusSchema = z.enum([
  'ACTIVE',
  'RESOLVED',
  'ESCALATED',
  'CLOSED',
]);

export type CaseDetailsInput = z.infer<typeof caseDetailsSchema>;
export type GenerateLetterInput = z.infer<typeof generateLetterSchema>;
export type UpdateLetterInput = z.infer<typeof updateLetterSchema>;
export type CreateCaseInput = z.infer<typeof createCaseSchema>;
