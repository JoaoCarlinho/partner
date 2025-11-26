import { describe, it, expect } from 'vitest';
import {
  generateSecureToken,
  hashToken,
  generateAccessToken,
  verifyAccessToken,
  generateEmailVerificationToken,
  generatePasswordResetToken,
} from './tokens.js';
import { Role } from '@steno/shared';

describe('Token utilities', () => {
  describe('generateSecureToken', () => {
    it('should generate a 64-character hex string', () => {
      const token = generateSecureToken();
      expect(token).toHaveLength(64);
      expect(/^[a-f0-9]+$/i.test(token)).toBe(true);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set(Array.from({ length: 100 }, () => generateSecureToken()));
      expect(tokens.size).toBe(100);
    });
  });

  describe('hashToken', () => {
    it('should produce consistent hashes for same input', () => {
      const token = 'test-token';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashToken('token1');
      const hash2 = hashToken('token2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('JWT tokens', () => {
    const payload = {
      sub: 'user-123',
      org_id: 'org-456',
      role: Role.ATTORNEY,
      email: 'test@example.com',
    };

    it('should generate and verify access token', () => {
      const token = generateAccessToken(payload);
      expect(token).toBeDefined();
      expect(token.split('.').length).toBe(3); // JWT format

      const decoded = verifyAccessToken(token);
      expect(decoded.sub).toBe(payload.sub);
      expect(decoded.org_id).toBe(payload.org_id);
      expect(decoded.role).toBe(payload.role);
      expect(decoded.email).toBe(payload.email);
    });

    it('should reject invalid token', () => {
      expect(() => verifyAccessToken('invalid-token')).toThrow();
    });
  });

  describe('generateEmailVerificationToken', () => {
    it('should return token, hash, and expiry', () => {
      const result = generateEmailVerificationToken();

      expect(result.token).toHaveLength(64);
      expect(result.hash).toHaveLength(64);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should set expiry to 24 hours from now', () => {
      const result = generateEmailVerificationToken();
      const expectedExpiry = Date.now() + 24 * 60 * 60 * 1000;

      // Allow 1 minute tolerance
      expect(result.expiresAt.getTime()).toBeGreaterThan(expectedExpiry - 60000);
      expect(result.expiresAt.getTime()).toBeLessThan(expectedExpiry + 60000);
    });
  });

  describe('generatePasswordResetToken', () => {
    it('should return token, hash, and expiry', () => {
      const result = generatePasswordResetToken();

      expect(result.token).toHaveLength(64);
      expect(result.hash).toHaveLength(64);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should set expiry to 24 hours from now', () => {
      const result = generatePasswordResetToken();
      const expectedExpiry = Date.now() + 24 * 60 * 60 * 1000;

      // Allow 1 minute tolerance
      expect(result.expiresAt.getTime()).toBeGreaterThan(expectedExpiry - 60000);
      expect(result.expiresAt.getTime()).toBeLessThan(expectedExpiry + 60000);
    });
  });
});
