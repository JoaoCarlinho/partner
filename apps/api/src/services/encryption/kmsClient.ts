import { KMSClient, GenerateDataKeyCommand, DecryptCommand } from '@aws-sdk/client-kms';

// KMS Client singleton
const kmsClient = new KMSClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const KMS_KEY_ID = process.env.KMS_KEY_ID || 'alias/steno-encryption';

// DEK cache to reduce KMS calls
interface CachedDEK {
  plaintext: Buffer;
  encrypted: Buffer;
  expiresAt: number;
}

const dekCache = new Map<string, CachedDEK>();
const DEK_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate a new data encryption key (DEK) from KMS
 * Uses AES-256 for symmetric encryption
 */
export async function generateDataKey(): Promise<{ plaintext: Buffer; encrypted: Buffer }> {
  // Check cache first
  const cacheKey = 'default';
  const cached = dekCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      plaintext: cached.plaintext,
      encrypted: cached.encrypted,
    };
  }

  const command = new GenerateDataKeyCommand({
    KeyId: KMS_KEY_ID,
    KeySpec: 'AES_256',
  });

  const response = await kmsClient.send(command);

  if (!response.Plaintext || !response.CiphertextBlob) {
    throw new Error('Failed to generate data key from KMS');
  }

  const result = {
    plaintext: Buffer.from(response.Plaintext),
    encrypted: Buffer.from(response.CiphertextBlob),
  };

  // Cache the DEK
  dekCache.set(cacheKey, {
    ...result,
    expiresAt: Date.now() + DEK_CACHE_TTL_MS,
  });

  return result;
}

/**
 * Decrypt an encrypted data key using KMS
 */
export async function decryptDataKey(encryptedKey: Buffer): Promise<Buffer> {
  const command = new DecryptCommand({
    CiphertextBlob: encryptedKey,
    KeyId: KMS_KEY_ID,
  });

  const response = await kmsClient.send(command);

  if (!response.Plaintext) {
    throw new Error('Failed to decrypt data key');
  }

  return Buffer.from(response.Plaintext);
}

/**
 * Clear the DEK cache (useful for testing or key rotation)
 */
export function clearDekCache(): void {
  dekCache.clear();
}

export { kmsClient, KMS_KEY_ID };
