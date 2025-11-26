import { z } from 'zod';

/**
 * US State codes
 */
export const US_STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
] as const;

export type USStateCode = (typeof US_STATE_CODES)[number];

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
