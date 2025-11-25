import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Role } from '@steno/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

export interface JwtPayload {
  sub: string; // user id
  org_id: string;
  role: Role;
  email: string;
}

/**
 * Generate a secure random token (32 bytes = 256 bits)
 * Returns hex-encoded string (64 characters)
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a token for storage (we store hashes, not raw tokens)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Generate refresh token (opaque, stored in DB)
 */
export function generateRefreshToken(): { token: string; hash: string; expiresAt: Date } {
  const token = generateSecureToken();
  const hash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  return { token, hash, expiresAt };
}

/**
 * Verify and decode JWT
 */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

/**
 * Generate email verification token
 * Token expires in 24 hours
 */
export function generateEmailVerificationToken(): { token: string; hash: string; expiresAt: Date } {
  const token = generateSecureToken();
  const hash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  return { token, hash, expiresAt };
}

/**
 * Generate password reset token
 * Token expires in 1 hour
 */
export function generatePasswordResetToken(): { token: string; hash: string; expiresAt: Date } {
  const token = generateSecureToken();
  const hash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  return { token, hash, expiresAt };
}

/**
 * Generate organization invite code
 * Code expires in 7 days
 */
export function generateInviteCode(): { code: string; expiresAt: Date } {
  const code = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return { code, expiresAt };
}
