/**
 * Demand Letter Types
 * Types for AI-powered letter generation and case management
 */

import type { ComplianceResult } from './compliance.js';

/**
 * Debt amount breakdown
 */
export interface DebtAmount {
  principal: number;
  interest?: number;
  fees?: number;
}

/**
 * Case details for letter generation
 */
export interface CaseDetails {
  debtorName: string;
  creditorName: string;
  originalCreditor?: string;
  debtAmount: DebtAmount;
  debtOriginDate: string;
  accountNumber?: string;
  stateJurisdiction: string;
  additionalContext?: string;
}

/**
 * Letter generation request
 */
export interface GenerateLetterRequest {
  templateId: string;
  caseId: string;
  caseDetails: CaseDetails;
  options?: {
    stream?: boolean;
  };
}

/**
 * Letter status enum matching Prisma
 */
export type LetterStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'SENT';

/**
 * Generated demand letter
 */
export interface DemandLetter {
  id: string;
  caseId: string;
  templateId?: string;
  content: string;
  status: LetterStatus;
  complianceResult?: ComplianceResult;
  createdAt: string;
  updatedAt: string;
}

/**
 * Letter generation response
 */
export interface GenerateLetterResponse {
  id: string;
  content: string;
  templateId: string;
  caseId: string;
  status: LetterStatus;
  complianceResult: ComplianceResult;
  createdAt: string;
}

/**
 * Debt calculation result
 */
export interface DebtCalculation {
  principal: number;
  interest: number;
  fees: number;
  total: number;
  itemization: DebtItemization[];
}

/**
 * Single line item in debt breakdown
 */
export interface DebtItemization {
  description: string;
  amount: number;
}

/**
 * AI generation metadata
 */
export interface GenerationMetadata {
  modelId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
}
