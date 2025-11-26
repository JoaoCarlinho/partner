/**
 * Invitation Service
 * Business logic for invitation link generation, validation, and management
 */

import { prisma } from '../../lib/prisma.js';
import { logger } from '../../middleware/logger.js';
import {
  generateInvitationToken,
  decodeInvitationToken,
  hashDebtorIdentifier,
  buildInvitationUrl,
  calculateExpirationTimestamp,
  extractTokenId,
} from './tokenGenerator.js';
import type {
  InvitationPayload,
  InvitationResponse,
  InvitationValidationResult,
  InvitationStatusResponse,
  InvitationStatus,
  CreateInvitationOptions,
  DEFAULT_INVITATION_SETTINGS,
} from '@steno/shared';

// Default settings
const DEFAULT_EXPIRATION_DAYS = 30;
const DEFAULT_USAGE_LIMIT = 1;
const MAX_EXPIRATION_DAYS = 90;

/**
 * Create an invitation link for a demand letter
 */
export async function createInvitationLink(
  demandLetterId: string,
  organizationId: string,
  options: CreateInvitationOptions = {}
): Promise<InvitationResponse> {
  // Validate options
  const expirationDays = Math.min(
    Math.max(options.expirationDays || DEFAULT_EXPIRATION_DAYS, 1),
    MAX_EXPIRATION_DAYS
  );
  const usageLimit = Math.max(options.usageLimit ?? DEFAULT_USAGE_LIMIT, 0);

  // Load demand letter with case details
  const demandLetter = await prisma.demandLetter.findFirst({
    where: { id: demandLetterId, organizationId },
    include: {
      case: {
        select: {
          id: true,
          debtorName: true,
          debtorEmail: true,
        },
      },
    },
  });

  if (!demandLetter) {
    throw new InvitationError('Demand letter not found', 'NOT_FOUND');
  }

  // Check if there's already an active invitation
  if (demandLetter.invitationToken && !demandLetter.invitationRevokedAt) {
    const isExpired = demandLetter.invitationExpiresAt &&
      demandLetter.invitationExpiresAt < new Date();
    const isExhausted = demandLetter.invitationUsageLimit > 0 &&
      demandLetter.invitationUsageCount >= demandLetter.invitationUsageLimit;

    if (!isExpired && !isExhausted) {
      throw new InvitationError(
        'An active invitation already exists. Revoke it first to create a new one.',
        'INVITATION_EXISTS'
      );
    }
  }

  // Calculate expiration
  const expiresAt = calculateExpirationTimestamp(expirationDays);

  // Create payload
  const payload: Omit<InvitationPayload, 'tokenId'> = {
    caseId: demandLetter.caseId,
    demandLetterId: demandLetter.id,
    debtorHash: hashDebtorIdentifier(
      demandLetter.case.debtorEmail ?? undefined,
      demandLetter.case.debtorName ?? undefined
    ),
    organizationId,
    expiresAt,
    createdAt: Date.now(),
    usageLimit,
  };

  // Generate token
  const { token, tokenId } = await generateInvitationToken(payload);
  const invitationUrl = buildInvitationUrl(token);

  // Store in database
  await prisma.demandLetter.update({
    where: { id: demandLetterId },
    data: {
      invitationToken: token,
      invitationTokenId: tokenId,
      invitationExpiresAt: new Date(expiresAt),
      invitationUsageLimit: usageLimit,
      invitationUsageCount: 0,
      invitationRevokedAt: null,
      invitationCreatedAt: new Date(),
      invitationPayload: payload as object,
    },
  });

  logger.info('Invitation created', {
    demandLetterId,
    tokenId,
    expirationDays,
    usageLimit,
  });

  return {
    invitationUrl,
    token,
    expiresAt: new Date(expiresAt).toISOString(),
    usageLimit,
    status: 'active',
  };
}

/**
 * Validate an invitation token
 */
export async function validateInvitationToken(
  token: string,
  options: { ipAddress?: string; userAgent?: string } = {}
): Promise<InvitationValidationResult> {
  // Extract token ID for quick lookup
  const tokenId = extractTokenId(token);
  if (!tokenId) {
    return {
      valid: false,
      errorCode: 'MALFORMED',
      errorMessage: 'Invalid invitation link format',
    };
  }

  // Look up invitation by token ID
  const demandLetter = await prisma.demandLetter.findFirst({
    where: { invitationTokenId: tokenId },
    include: {
      case: {
        select: {
          creditorName: true,
          debtorName: true,
        },
      },
    },
  });

  if (!demandLetter) {
    return {
      valid: false,
      errorCode: 'INVALID_TOKEN',
      errorMessage: 'This invitation link is invalid',
    };
  }

  // Check if revoked
  if (demandLetter.invitationRevokedAt) {
    return {
      valid: false,
      status: 'revoked',
      errorCode: 'REVOKED',
      errorMessage: 'This invitation has been revoked',
    };
  }

  // Check expiration
  if (demandLetter.invitationExpiresAt && demandLetter.invitationExpiresAt < new Date()) {
    return {
      valid: false,
      status: 'expired',
      errorCode: 'EXPIRED',
      errorMessage: 'This invitation has expired',
    };
  }

  // Check usage limit
  if (
    demandLetter.invitationUsageLimit > 0 &&
    demandLetter.invitationUsageCount >= demandLetter.invitationUsageLimit
  ) {
    return {
      valid: false,
      status: 'exhausted',
      errorCode: 'EXHAUSTED',
      errorMessage: 'This invitation has reached its usage limit',
    };
  }

  // Decrypt and verify token
  const payload = await decodeInvitationToken(token);
  if (!payload) {
    return {
      valid: false,
      errorCode: 'INVALID_TOKEN',
      errorMessage: 'Invalid invitation link',
    };
  }

  // Calculate remaining uses
  const remainingUses = demandLetter.invitationUsageLimit === 0
    ? -1  // Unlimited
    : demandLetter.invitationUsageLimit - demandLetter.invitationUsageCount;

  // Create masked case reference
  const caseReference = maskCaseReference(
    demandLetter.case.creditorName,
    demandLetter.case.debtorName
  );

  logger.info('Invitation validated', {
    tokenId,
    demandLetterId: demandLetter.id,
    ipAddress: options.ipAddress,
  });

  return {
    valid: true,
    status: 'active',
    caseReference,
    expiresAt: demandLetter.invitationExpiresAt?.toISOString(),
    remainingUses,
  };
}

/**
 * Redeem an invitation (increment usage count)
 */
export async function redeemInvitation(
  token: string,
  options: { ipAddress?: string; userAgent?: string } = {}
): Promise<{ success: boolean; demandLetterId?: string; caseId?: string }> {
  // First validate
  const validation = await validateInvitationToken(token, options);
  if (!validation.valid) {
    return { success: false };
  }

  // Extract token ID
  const tokenId = extractTokenId(token);
  if (!tokenId) {
    return { success: false };
  }

  // Update usage count atomically
  const demandLetter = await prisma.demandLetter.update({
    where: { invitationTokenId: tokenId },
    data: {
      invitationUsageCount: {
        increment: 1,
      },
    },
    select: {
      id: true,
      caseId: true,
    },
  });

  logger.info('Invitation redeemed', {
    tokenId,
    demandLetterId: demandLetter.id,
    ipAddress: options.ipAddress,
  });

  return {
    success: true,
    demandLetterId: demandLetter.id,
    caseId: demandLetter.caseId,
  };
}

/**
 * Revoke an invitation
 */
export async function revokeInvitation(
  demandLetterId: string,
  organizationId: string
): Promise<{ success: boolean; revokedAt: string }> {
  const demandLetter = await prisma.demandLetter.findFirst({
    where: { id: demandLetterId, organizationId },
  });

  if (!demandLetter) {
    throw new InvitationError('Demand letter not found', 'NOT_FOUND');
  }

  if (!demandLetter.invitationToken) {
    throw new InvitationError('No invitation exists for this demand letter', 'NO_INVITATION');
  }

  if (demandLetter.invitationRevokedAt) {
    throw new InvitationError('Invitation already revoked', 'ALREADY_REVOKED');
  }

  const revokedAt = new Date();

  await prisma.demandLetter.update({
    where: { id: demandLetterId },
    data: {
      invitationRevokedAt: revokedAt,
    },
  });

  logger.info('Invitation revoked', {
    demandLetterId,
    tokenId: demandLetter.invitationTokenId,
  });

  return {
    success: true,
    revokedAt: revokedAt.toISOString(),
  };
}

/**
 * Get invitation status for a demand letter
 */
export async function getInvitationStatus(
  demandLetterId: string,
  organizationId: string
): Promise<InvitationStatusResponse> {
  const demandLetter = await prisma.demandLetter.findFirst({
    where: { id: demandLetterId, organizationId },
    select: {
      invitationToken: true,
      invitationExpiresAt: true,
      invitationUsageLimit: true,
      invitationUsageCount: true,
      invitationRevokedAt: true,
      invitationCreatedAt: true,
    },
  });

  if (!demandLetter) {
    throw new InvitationError('Demand letter not found', 'NOT_FOUND');
  }

  if (!demandLetter.invitationToken) {
    return {
      hasInvitation: false,
      status: 'active', // No invitation, but not in an error state
    };
  }

  // Determine status
  let status: InvitationStatus = 'active';
  if (demandLetter.invitationRevokedAt) {
    status = 'revoked';
  } else if (demandLetter.invitationExpiresAt && demandLetter.invitationExpiresAt < new Date()) {
    status = 'expired';
  } else if (
    demandLetter.invitationUsageLimit > 0 &&
    demandLetter.invitationUsageCount >= demandLetter.invitationUsageLimit
  ) {
    status = 'exhausted';
  }

  return {
    hasInvitation: true,
    invitationUrl: buildInvitationUrl(demandLetter.invitationToken),
    token: demandLetter.invitationToken,
    expiresAt: demandLetter.invitationExpiresAt?.toISOString(),
    usageLimit: demandLetter.invitationUsageLimit,
    usageCount: demandLetter.invitationUsageCount,
    status,
    revokedAt: demandLetter.invitationRevokedAt?.toISOString(),
    createdAt: demandLetter.invitationCreatedAt?.toISOString(),
  };
}

/**
 * Create a masked case reference for display
 */
function maskCaseReference(creditorName: string, debtorName: string | null): string {
  const maskName = (name: string | null): string => {
    if (!name) return '***';
    if (name.length <= 3) return '***';
    return `${name.slice(0, 2)}***${name.slice(-1)}`;
  };

  return `Case: ${maskName(debtorName)} v. ${creditorName}`;
}

/**
 * Custom error class for invitation errors
 */
export class InvitationError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'InvitationError';
    this.code = code;
  }
}
