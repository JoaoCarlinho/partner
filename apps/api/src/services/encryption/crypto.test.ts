import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomBytes } from 'crypto';

// Mock the KMS client before importing the crypto module
vi.mock('./kmsClient.js', () => {
  // Generate a consistent test key for mocking
  const testKey = randomBytes(32);
  const encryptedTestKey = randomBytes(64);

  return {
    generateDataKey: vi.fn().mockResolvedValue({
      plaintext: testKey,
      encrypted: encryptedTestKey,
    }),
    decryptDataKey: vi.fn().mockResolvedValue(testKey),
    clearDekCache: vi.fn(),
  };
});

import { encrypt, decrypt, isEncryptedData, EncryptedData } from './crypto.js';
import { generateDataKey, decryptDataKey } from './kmsClient.js';

describe('Crypto utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('encrypt', () => {
    it('should encrypt plaintext and return EncryptedData structure', async () => {
      const plaintext = 'Hello, World!';
      const result = await encrypt(plaintext);

      expect(result).toHaveProperty('ciphertext');
      expect(result).toHaveProperty('encryptedKey');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('authTag');
      expect(result).toHaveProperty('version', 1);

      // All should be Base64 strings
      expect(typeof result.ciphertext).toBe('string');
      expect(typeof result.encryptedKey).toBe('string');
      expect(typeof result.iv).toBe('string');
      expect(typeof result.authTag).toBe('string');

      // Should have called KMS
      expect(generateDataKey).toHaveBeenCalledTimes(1);
    });

    it('should produce different ciphertext for same plaintext (different IV)', async () => {
      const plaintext = 'Same message';
      const result1 = await encrypt(plaintext);
      const result2 = await encrypt(plaintext);

      // IVs should be different
      expect(result1.iv).not.toBe(result2.iv);

      // Ciphertext should also be different due to different IV
      expect(result1.ciphertext).not.toBe(result2.ciphertext);
    });

    it('should handle empty string', async () => {
      const result = await encrypt('');
      expect(result).toHaveProperty('ciphertext');
      expect(result.version).toBe(1);
    });

    it('should handle unicode characters', async () => {
      const plaintext = 'Hello 世界! 🔐';
      const result = await encrypt(plaintext);
      expect(result).toHaveProperty('ciphertext');
    });
  });

  describe('decrypt', () => {
    it('should decrypt encrypted data back to original', async () => {
      const original = 'Secret message';
      const encrypted = await encrypt(original);
      const decrypted = await decrypt(encrypted);

      expect(decrypted).toBe(original);
      expect(decryptDataKey).toHaveBeenCalled();
    });

    it('should handle unicode characters in round-trip', async () => {
      const original = 'Confidential: 機密情報 🔒';
      const encrypted = await encrypt(original);
      const decrypted = await decrypt(encrypted);

      expect(decrypted).toBe(original);
    });

    it('should handle long text', async () => {
      const original = 'A'.repeat(10000);
      const encrypted = await encrypt(original);
      const decrypted = await decrypt(encrypted);

      expect(decrypted).toBe(original);
    });

    it('should throw on unsupported version', async () => {
      const encrypted = await encrypt('test');
      const tampered = { ...encrypted, version: 2 } as unknown as EncryptedData;

      await expect(decrypt(tampered)).rejects.toThrow('Unsupported encryption version');
    });

    it('should throw on tampered ciphertext', async () => {
      const encrypted = await encrypt('test');
      const tampered = {
        ...encrypted,
        ciphertext: Buffer.from('tampered data').toString('base64'),
      };

      await expect(decrypt(tampered)).rejects.toThrow();
    });

    it('should throw on tampered auth tag', async () => {
      const encrypted = await encrypt('test');
      const tampered = {
        ...encrypted,
        authTag: Buffer.from('bad tag').toString('base64'),
      };

      await expect(decrypt(tampered)).rejects.toThrow();
    });
  });

  describe('isEncryptedData', () => {
    it('should return true for valid EncryptedData', async () => {
      const encrypted = await encrypt('test');
      expect(isEncryptedData(encrypted)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isEncryptedData(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isEncryptedData(undefined)).toBe(false);
    });

    it('should return false for plain string', () => {
      expect(isEncryptedData('plain text')).toBe(false);
    });

    it('should return false for object missing fields', () => {
      expect(isEncryptedData({ ciphertext: 'abc' })).toBe(false);
      expect(isEncryptedData({ ciphertext: 'a', encryptedKey: 'b' })).toBe(false);
    });

    it('should return false for wrong version', () => {
      expect(
        isEncryptedData({
          ciphertext: 'a',
          encryptedKey: 'b',
          iv: 'c',
          authTag: 'd',
          version: 2,
        })
      ).toBe(false);
    });
  });
});
