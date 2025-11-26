/**
 * Invitation Types
 * Types for secure invitation link generation and management
 */

/**
 * Invitation status
 */
export type InvitationStatus = 'active' | 'expired' | 'revoked' | 'exhausted';

/**
 * Encrypted payload structure embedded in invitation token
 */
export interface InvitationPayload {
  tokenId: string;           // Unique token identifier
  caseId: string;            // Encrypted case reference
  demandLetterId: string;    // Reference to demand letter
  debtorHash: string;        // Hash of debtor identifier
  organizationId: string;    // Organization that created invitation
  expiresAt: number;         // Unix timestamp
  createdAt: number;         // Unix timestamp
  usageLimit: number;        // 0 = unlimited, 1 = single-use, n = n uses
}

/**
 * Options for creating an invitation
 */
export interface CreateInvitationOptions {
  expirationDays?: number;   // Default 30, max 90
  usageLimit?: number;       // Default 1 (single-use), 0 = unlimited
}

/**
 * Invitation creation response
 */
export interface InvitationResponse {
  invitationUrl: string;     // Full URL with token
  token: string;             // Raw token
  expiresAt: string;         // ISO timestamp
  usageLimit: number;
  status: InvitationStatus;
}

/**
 * Invitation validation result
 */
export interface InvitationValidationResult {
  valid: boolean;
  status?: InvitationStatus;
  caseReference?: string;    // Masked case info
  organizationName?: string; // Organization name
  expiresAt?: string;        // ISO timestamp
  remainingUses?: number;
  errorCode?: 'INVALID_TOKEN' | 'EXPIRED' | 'REVOKED' | 'EXHAUSTED' | 'MALFORMED';
  errorMessage?: string;
}

/**
 * Invitation status response
 */
export interface InvitationStatusResponse {
  hasInvitation: boolean;
  invitationUrl?: string;
  token?: string;
  expiresAt?: string;
  usageLimit?: number;
  usageCount?: number;
  status: InvitationStatus;
  revokedAt?: string;
  createdAt?: string;
}

/**
 * Organization invitation settings
 */
export interface InvitationSettings {
  defaultExpirationDays: number;  // Default 30
  defaultUsageLimit: number;      // Default 1
  maxExpirationDays: number;      // Max 90
  allowReInvitation: boolean;     // Allow re-inviting debtors
}

/**
 * Default invitation settings
 */
export const DEFAULT_INVITATION_SETTINGS: InvitationSettings = {
  defaultExpirationDays: 30,
  defaultUsageLimit: 1,
  maxExpirationDays: 90,
  allowReInvitation: true,
};
