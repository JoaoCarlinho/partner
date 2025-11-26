import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomBytes } from 'crypto';

// Mock the KMS client
vi.mock('./kmsClient.js', () => {
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

import {
  encryptField,
  decryptField,
  encryptFields,
  decryptFields,
  hasEncryptedFields,
  getEncryptedFields,
  ENCRYPTED_FIELDS,
} from './fieldEncryption.js';

describe('Field Encryption utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('encryptField', () => {
    it('should encrypt a string value', async () => {
      const result = await encryptField('sensitive data');
      expect(result).toHaveProperty('ciphertext');
      expect(result).toHaveProperty('version', 1);
    });

    it('should return null for null value', async () => {
      const result = await encryptField(null);
      expect(result).toBeNull();
    });

    it('should return undefined for undefined value', async () => {
      const result = await encryptField(undefined);
      expect(result).toBeUndefined();
    });

    it('should return null for empty string', async () => {
      const result = await encryptField('');
      expect(result).toBeNull();
    });
  });

  describe('decryptField', () => {
    it('should decrypt an encrypted value', async () => {
      const original = 'secret';
      const encrypted = await encryptField(original);
      const decrypted = await decryptField(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should return null for null value', async () => {
      const result = await decryptField(null);
      expect(result).toBeNull();
    });

    it('should return undefined for undefined value', async () => {
      const result = await decryptField(undefined);
      expect(result).toBeUndefined();
    });

    it('should return plain string as-is (legacy data)', async () => {
      const result = await decryptField('legacy unencrypted data');
      expect(result).toBe('legacy unencrypted data');
    });
  });

  describe('encryptFields', () => {
    it('should encrypt specified fields', async () => {
      const data = {
        id: '123',
        content: 'secret message',
        publicField: 'not secret',
      };

      const result = await encryptFields(data, ['content']);

      expect(result.id).toBe('123');
      expect(result.publicField).toBe('not secret');
      expect(result.content).toHaveProperty('ciphertext');
      expect(result.content).toHaveProperty('version', 1);
    });

    it('should handle null fields', async () => {
      const data = {
        id: '123',
        content: null as string | null,
      };

      const result = await encryptFields(data, ['content']);
      expect(result.content).toBeNull();
    });

    it('should encrypt multiple fields', async () => {
      const data = {
        field1: 'secret1',
        field2: 'secret2',
        field3: 'not encrypted',
      };

      const result = await encryptFields(data, ['field1', 'field2']);

      expect(result.field1).toHaveProperty('ciphertext');
      expect(result.field2).toHaveProperty('ciphertext');
      expect(result.field3).toBe('not encrypted');
    });
  });

  describe('decryptFields', () => {
    it('should decrypt specified fields', async () => {
      const data = {
        id: '123',
        content: 'secret message',
        publicField: 'not secret',
      };

      const encrypted = await encryptFields(data, ['content']);
      const decrypted = await decryptFields(encrypted, ['content']);

      expect(decrypted.id).toBe('123');
      expect(decrypted.publicField).toBe('not secret');
      expect(decrypted.content).toBe('secret message');
    });

    it('should handle mixed encrypted and plain fields', async () => {
      const encryptedContent = await encryptField('encrypted');
      const data = {
        encrypted: encryptedContent,
        plain: 'plain text',
      };

      const result = await decryptFields(data, ['encrypted', 'plain']);

      expect(result.encrypted).toBe('encrypted');
      expect(result.plain).toBe('plain text');
    });
  });

  describe('ENCRYPTED_FIELDS configuration', () => {
    it('should have DebtorProfile fields', () => {
      expect(ENCRYPTED_FIELDS.DebtorProfile).toContain('assessment');
    });

    it('should have Message fields', () => {
      expect(ENCRYPTED_FIELDS.Message).toContain('content');
      expect(ENCRYPTED_FIELDS.Message).toContain('originalContent');
    });

    it('should have DemandLetter fields', () => {
      expect(ENCRYPTED_FIELDS.DemandLetter).toContain('content');
      expect(ENCRYPTED_FIELDS.DemandLetter).toContain('paraphrasedContent');
    });
  });

  describe('hasEncryptedFields', () => {
    it('should return true for models with encrypted fields', () => {
      expect(hasEncryptedFields('DebtorProfile')).toBe(true);
      expect(hasEncryptedFields('Message')).toBe(true);
      expect(hasEncryptedFields('DemandLetter')).toBe(true);
    });

    it('should return false for models without encrypted fields', () => {
      expect(hasEncryptedFields('User')).toBe(false);
      expect(hasEncryptedFields('Organization')).toBe(false);
      expect(hasEncryptedFields('NonExistent')).toBe(false);
    });
  });

  describe('getEncryptedFields', () => {
    it('should return field names for known models', () => {
      const fields = getEncryptedFields('DebtorProfile');
      expect(fields).toContain('assessment');
    });

    it('should return empty array for unknown models', () => {
      const fields = getEncryptedFields('Unknown');
      expect(fields).toEqual([]);
    });
  });
});
