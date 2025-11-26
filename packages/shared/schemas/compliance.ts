import { z } from 'zod';
import { US_STATE_CODES, type USStateCode } from '../constants/fdcpaRules.js';

/**
 * Debt details schema for compliance validation
 */
export const debtDetailsSchema = z.object({
  principal: z.number().positive('Principal must be positive'),
  interest: z.number().min(0).optional(),
  fees: z.number().min(0).optional(),
  originDate: z.string().refine(
    (date) => !isNaN(Date.parse(date)),
    'Invalid date format'
  ),
  creditorName: z.string().min(1, 'Creditor name is required'),
  originalCreditor: z.string().optional(),
  accountNumber: z.string().optional(),
});

export type DebtDetailsInput = z.infer<typeof debtDetailsSchema>;

/**
 * Compliance validation request schema
 */
export const complianceValidateSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  state: z.string().length(2).toUpperCase().refine(
    (code) => US_STATE_CODES.includes(code as USStateCode),
    'Invalid US state code'
  ),
  debtDetails: debtDetailsSchema,
});

export type ComplianceValidateInput = z.infer<typeof complianceValidateSchema>;

/**
 * Disclosure generation request schema
 */
export const disclosureGenerateSchema = z.object({
  state: z.string().length(2).toUpperCase().refine(
    (code) => US_STATE_CODES.includes(code as USStateCode),
    'Invalid US state code'
  ),
  debtDetails: debtDetailsSchema,
  blocks: z.array(z.string()).optional(), // Specific blocks to generate
});

export type DisclosureGenerateInput = z.infer<typeof disclosureGenerateSchema>;
