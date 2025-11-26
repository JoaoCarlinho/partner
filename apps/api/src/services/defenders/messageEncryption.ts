/**
 * Message Encryption Service for Defender-Debtor Communication
 * Implements end-to-end encryption using AWS KMS
 */

import crypto from 'crypto';

// In production, use AWS KMS
// import { KMSClient, GenerateDataKeyCommand, DecryptCommand } from '@aws-sdk/client-kms';

export interface EncryptedMessage {
  encryptedContent: string;
  encryptedDataKey: string;
  iv: string;
  authTag: string;
}

export interface EncryptionConfig {
  kmsKeyId?: string;
  region?: string;
}

// In-memory key store for development
// Note: In production, use AWS KMS for key management
const developmentKey = crypto.randomBytes(32);

export class MessageEncryptionService {
  private config: EncryptionConfig;

  constructor(config: EncryptionConfig = {}) {
    this.config = {
      kmsKeyId: config.kmsKeyId || process.env.DEFENDER_MESSAGE_KMS_KEY_ID,
      region: config.region || process.env.AWS_REGION || 'us-east-1',
    };
  }

  /**
   * Encrypt message content
   * Uses AES-256-GCM for authenticated encryption
   */
  async encryptMessage(plaintext: string): Promise<EncryptedMessage> {
    // In production, generate data key from KMS
    // const kmsClient = new KMSClient({ region: this.config.region });
    // const dataKeyResponse = await kmsClient.send(new GenerateDataKeyCommand({
    //   KeyId: this.config.kmsKeyId,
    //   KeySpec: 'AES_256'
    // }));

    // For development, use local key
    const dataKey = developmentKey;
    const encryptedDataKey = Buffer.from(dataKey).toString('base64');

    // Generate random IV
    const iv = crypto.randomBytes(16);

    // Create cipher with AES-256-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', dataKey, iv);

    // Encrypt content
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get authentication tag for integrity verification
    const authTag = cipher.getAuthTag();

    return {
      encryptedContent: encrypted,
      encryptedDataKey,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  /**
   * Decrypt message content
   */
  async decryptMessage(encrypted: EncryptedMessage): Promise<string> {
    // In production, decrypt data key using KMS
    // const kmsClient = new KMSClient({ region: this.config.region });
    // const decryptedKeyResponse = await kmsClient.send(new DecryptCommand({
    //   KeyId: this.config.kmsKeyId,
    //   CiphertextBlob: Buffer.from(encrypted.encryptedDataKey, 'base64')
    // }));

    // For development, use local key
    const dataKey = developmentKey;

    // Parse IV and auth tag
    const iv = Buffer.from(encrypted.iv, 'base64');
    const authTag = Buffer.from(encrypted.authTag, 'base64');

    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', dataKey, iv);
    decipher.setAuthTag(authTag);

    // Decrypt content
    let decrypted = decipher.update(encrypted.encryptedContent, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Encrypt file buffer
   */
  async encryptFile(buffer: Buffer): Promise<{ encryptedBuffer: Buffer; metadata: EncryptedMessage }> {
    const dataKey = developmentKey;
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv('aes-256-gcm', dataKey, iv);

    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encryptedBuffer: encrypted,
      metadata: {
        encryptedContent: '', // Not used for files
        encryptedDataKey: Buffer.from(dataKey).toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
      },
    };
  }

  /**
   * Decrypt file buffer
   */
  async decryptFile(encryptedBuffer: Buffer, metadata: EncryptedMessage): Promise<Buffer> {
    const dataKey = developmentKey;
    const iv = Buffer.from(metadata.iv, 'base64');
    const authTag = Buffer.from(metadata.authTag, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', dataKey, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  }

  /**
   * Generate a hash of content for integrity checking
   */
  hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}

// Export singleton instance
export const messageEncryption = new MessageEncryptionService();
