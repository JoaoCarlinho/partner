/**
 * Secure Invitation Token Generator
 * Generates cryptographically secure, time-limited invitation tokens
 */

import { randomBytes, randomUUID, createHash } from 'crypto';
import { encrypt, decrypt } from '../encryption/crypto.js';
import type { InvitationPayload } from '@steno/shared';

/**
 * Generate a unique token ID
 * Combines UUID with random bytes for 256-bit security
 */
export function generateTokenId(): string {
  const uuid = randomUUID();
  const randomSuffix = randomBytes(16).toString('hex');
  return `${uuid}-${randomSuffix}`;
}

/**
 * Create a hash of the debtor identifier for verification
 */
export function hashDebtorIdentifier(email: string | undefined, name: string | undefined): string {
  const identifier = `${email || ''}:${name || ''}`.toLowerCase().trim();
  return createHash('sha256').update(identifier).digest('hex').slice(0, 16);
}

/**
 * Generate a secure invitation token
 * Token structure: base64url({ id: tokenId, data: encryptedPayload })
 */
export async function generateInvitationToken(
  payload: Omit<InvitationPayload, 'tokenId'>
): Promise<{ token: string; tokenId: string }> {
  // Generate unique token ID
  const tokenId = generateTokenId();

  // Create payload with token ID
  const fullPayload: InvitationPayload = {
    ...payload,
    tokenId,
  };

  // Encrypt payload using KMS-backed encryption
  const encryptedData = await encrypt(JSON.stringify(fullPayload));

  // Combine into final token
  const tokenData = {
    id: tokenId,
    data: encryptedData,
  };

  const token = Buffer.from(JSON.stringify(tokenData)).toString('base64url');

  return { token, tokenId };
}

/**
 * Decode and decrypt an invitation token
 * Returns null if token is invalid or decryption fails
 */
export async function decodeInvitationToken(token: string): Promise<InvitationPayload | null> {
  try {
    // Decode base64url
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));

    if (!decoded.id || !decoded.data) {
      return null;
    }

    // Decrypt payload
    const payloadJson = await decrypt(decoded.data);
    const payload = JSON.parse(payloadJson) as InvitationPayload;

    // Verify token ID matches
    if (payload.tokenId !== decoded.id) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extract token ID from token without full decryption
 * Useful for quick lookups
 */
export function extractTokenId(token: string): string | null {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    return decoded.id || null;
  } catch {
    return null;
  }
}

/**
 * Build invitation URL from token
 */
export function buildInvitationUrl(token: string): string {
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/join/${token}`;
}

/**
 * Calculate expiration timestamp from days
 */
export function calculateExpirationTimestamp(days: number): number {
  const now = Date.now();
  return now + days * 24 * 60 * 60 * 1000;
}
