import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { generateDataKey, decryptDataKey } from './kmsClient.js';

/**
 * Encrypted data structure for envelope encryption
 */
export interface EncryptedData {
  ciphertext: string;    // Base64 encrypted data
  encryptedKey: string;  // Base64 encrypted DEK
  iv: string;            // Base64 initialization vector
  authTag: string;       // Base64 authentication tag
  version: 1;            // Schema version for future compatibility
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt plaintext using envelope encryption
 * - Generates a DEK from KMS
 * - Encrypts data with AES-256-GCM using the DEK
 * - Returns encrypted data with encrypted DEK for storage
 */
export async function encrypt(plaintext: string): Promise<EncryptedData> {
  // Generate a data key from KMS
  const { plaintext: dek, encrypted: encryptedKey } = await generateDataKey();

  // Generate random IV
  const iv = randomBytes(IV_LENGTH);

  // Create cipher and encrypt
  const cipher = createCipheriv(ALGORITHM, dek, iv, { authTagLength: AUTH_TAG_LENGTH });
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  // Get authentication tag
  const authTag = cipher.getAuthTag();

  // Clear DEK from memory (best effort)
  dek.fill(0);

  return {
    ciphertext: ciphertext.toString('base64'),
    encryptedKey: encryptedKey.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    version: 1,
  };
}

/**
 * Decrypt encrypted data using envelope encryption
 * - Decrypts the DEK using KMS
 * - Decrypts the data using AES-256-GCM with the DEK
 */
export async function decrypt(encryptedData: EncryptedData): Promise<string> {
  // Validate version
  if (encryptedData.version !== 1) {
    throw new Error(`Unsupported encryption version: ${encryptedData.version}`);
  }

  // Decode Base64 components
  const encryptedKey = Buffer.from(encryptedData.encryptedKey, 'base64');
  const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');
  const iv = Buffer.from(encryptedData.iv, 'base64');
  const authTag = Buffer.from(encryptedData.authTag, 'base64');

  // Decrypt the DEK using KMS
  const dek = await decryptDataKey(encryptedKey);

  try {
    // Create decipher and decrypt
    const decipher = createDecipheriv(ALGORITHM, dek, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return plaintext.toString('utf8');
  } finally {
    // Clear DEK from memory (best effort)
    dek.fill(0);
  }
}

/**
 * Check if a value is an encrypted data structure
 */
export function isEncryptedData(value: unknown): value is EncryptedData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.ciphertext === 'string' &&
    typeof obj.encryptedKey === 'string' &&
    typeof obj.iv === 'string' &&
    typeof obj.authTag === 'string' &&
    obj.version === 1
  );
}
