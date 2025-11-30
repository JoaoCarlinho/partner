/**
 * Defender Invitation Service
 * Handles invitation creation, validation, and redemption
 */

import crypto from 'crypto';
import { sendEmail } from '../email/sesClient';

// In-memory stores (use database in production)
const invitationStore = new Map<string, DefenderInvitation>();
const invitationByToken = new Map<string, string>();

export interface DefenderInvitation {
  id: string;
  email: string;
  token: string;
  invitedBy: string;
  organizationName?: string;
  expiresAt: Date;
  redeemedAt?: Date;
  createdAt: Date;
}

export interface InviteDefenderRequest {
  email: string;
  organizationName?: string;
  invitedBy: string;
}

export interface InvitationValidation {
  valid: boolean;
  invitation?: DefenderInvitation;
  error?: string;
}

// Configuration
const INVITATION_EXPIRY_DAYS = 7;
const APP_URL = process.env.APP_URL || 'https://d13ip2cieye91r.cloudfront.net';

/**
 * Send defender invitation email
 */
async function sendDefenderInvitationEmail(invitation: DefenderInvitation): Promise<void> {
  const inviteUrl = `${APP_URL}/defender/accept-invitation/index.html?token=${invitation.token}`;
  const expiresFormatted = invitation.expiresAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  await sendEmail({
    to: invitation.email,
    subject: 'You\'re Invited to Join Steno as a Public Defender',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #493087;">You're Invited!</h1>
        <p>You've been invited to join <strong>Steno</strong> as a public defender${invitation.organizationName ? ` representing <strong>${invitation.organizationName}</strong>` : ''}.</p>
        <p>Steno helps public defenders efficiently manage cases and communicate with clients through our secure platform.</p>
        <p style="margin: 24px 0;">
          <a href="${inviteUrl}"
             style="background-color: #493087; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Accept Invitation
          </a>
        </p>
        <p style="color: #666;">This invitation will expire on ${expiresFormatted}.</p>
        <p style="color: #666; font-size: 12px;">If you didn't expect this invitation, you can safely ignore this email.</p>
      </div>
    `,
    text: `You've been invited to join Steno as a public defender${invitation.organizationName ? ` representing ${invitation.organizationName}` : ''}.\n\nAccept your invitation: ${inviteUrl}\n\nThis invitation expires on ${expiresFormatted}.`,
  });
}

/**
 * Invite a new public defender
 */
export async function inviteDefender(
  request: InviteDefenderRequest
): Promise<DefenderInvitation> {
  // Check for existing pending invitation
  for (const invitation of invitationStore.values()) {
    if (
      invitation.email.toLowerCase() === request.email.toLowerCase() &&
      !invitation.redeemedAt &&
      invitation.expiresAt > new Date()
    ) {
      throw new Error('Active invitation already exists for this email');
    }
  }

  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex');

  // Calculate expiration date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

  // Create invitation
  const invitation: DefenderInvitation = {
    id: generateId(),
    email: request.email.toLowerCase(),
    token,
    invitedBy: request.invitedBy,
    organizationName: request.organizationName,
    expiresAt,
    createdAt: new Date(),
  };

  invitationStore.set(invitation.id, invitation);
  invitationByToken.set(token, invitation.id);

  // Send invitation email
  try {
    await sendDefenderInvitationEmail(invitation);
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    // Don't fail the invitation creation if email fails
  }

  return invitation;
}

/**
 * Validate an invitation token
 */
export async function validateInvitation(token: string): Promise<InvitationValidation> {
  const invitationId = invitationByToken.get(token);

  if (!invitationId) {
    return {
      valid: false,
      error: 'Invitation not found',
    };
  }

  const invitation = invitationStore.get(invitationId);

  if (!invitation) {
    return {
      valid: false,
      error: 'Invitation not found',
    };
  }

  if (invitation.redeemedAt) {
    return {
      valid: false,
      error: 'Invitation has already been used',
    };
  }

  if (invitation.expiresAt < new Date()) {
    return {
      valid: false,
      error: 'Invitation has expired',
    };
  }

  return {
    valid: true,
    invitation,
  };
}

/**
 * Get invitation by token
 */
export async function getInvitationByToken(token: string): Promise<DefenderInvitation | null> {
  const invitationId = invitationByToken.get(token);
  if (!invitationId) return null;
  return invitationStore.get(invitationId) || null;
}

/**
 * Get invitation by ID
 */
export async function getInvitation(id: string): Promise<DefenderInvitation | null> {
  return invitationStore.get(id) || null;
}

/**
 * Mark invitation as redeemed
 */
export async function redeemInvitation(token: string): Promise<DefenderInvitation> {
  const validation = await validateInvitation(token);

  if (!validation.valid || !validation.invitation) {
    throw new Error(validation.error || 'Invalid invitation');
  }

  const invitation = validation.invitation;
  invitation.redeemedAt = new Date();
  invitationStore.set(invitation.id, invitation);

  return invitation;
}

/**
 * Get all pending invitations
 */
export async function getPendingInvitations(): Promise<DefenderInvitation[]> {
  const pending: DefenderInvitation[] = [];
  const now = new Date();

  for (const invitation of invitationStore.values()) {
    if (!invitation.redeemedAt && invitation.expiresAt > now) {
      pending.push(invitation);
    }
  }

  return pending.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Get all invitations (for admin view)
 */
export async function getAllInvitations(options?: {
  status?: 'pending' | 'redeemed' | 'expired';
  limit?: number;
}): Promise<DefenderInvitation[]> {
  let invitations = Array.from(invitationStore.values());
  const now = new Date();

  if (options?.status) {
    invitations = invitations.filter((inv) => {
      if (options.status === 'pending') {
        return !inv.redeemedAt && inv.expiresAt > now;
      }
      if (options.status === 'redeemed') {
        return !!inv.redeemedAt;
      }
      if (options.status === 'expired') {
        return !inv.redeemedAt && inv.expiresAt <= now;
      }
      return true;
    });
  }

  invitations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (options?.limit) {
    invitations = invitations.slice(0, options.limit);
  }

  return invitations;
}

/**
 * Resend invitation
 */
export async function resendInvitation(invitationId: string): Promise<DefenderInvitation> {
  const invitation = invitationStore.get(invitationId);

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  if (invitation.redeemedAt) {
    throw new Error('Cannot resend redeemed invitation');
  }

  // Extend expiration
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);
  invitation.expiresAt = expiresAt;

  invitationStore.set(invitationId, invitation);

  // Resend invitation email
  try {
    await sendDefenderInvitationEmail(invitation);
  } catch (error) {
    console.error('Failed to resend invitation email:', error);
  }

  return invitation;
}

/**
 * Cancel/revoke invitation
 */
export async function revokeInvitation(invitationId: string): Promise<boolean> {
  const invitation = invitationStore.get(invitationId);

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  if (invitation.redeemedAt) {
    throw new Error('Cannot revoke redeemed invitation');
  }

  // Mark as expired by setting expiration to past
  invitation.expiresAt = new Date(0);
  invitationStore.set(invitationId, invitation);

  return true;
}

/**
 * Get invitation statistics
 */
export async function getInvitationStats(): Promise<{
  total: number;
  pending: number;
  redeemed: number;
  expired: number;
}> {
  const now = new Date();
  let total = 0;
  let pending = 0;
  let redeemed = 0;
  let expired = 0;

  for (const invitation of invitationStore.values()) {
    total++;
    if (invitation.redeemedAt) {
      redeemed++;
    } else if (invitation.expiresAt <= now) {
      expired++;
    } else {
      pending++;
    }
  }

  return { total, pending, redeemed, expired };
}

/**
 * Generate invite URL
 */
export function generateInviteUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || process.env.APP_URL || 'http://localhost:3000';
  return `${base}/defender/invite/${token}`;
}

function generateId(): string {
  return `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
