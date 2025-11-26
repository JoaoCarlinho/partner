import { encrypt, decrypt, EncryptedData, isEncryptedData } from './crypto.js';

/**
 * Encrypt a single field value
 * Returns null/undefined unchanged (we don't encrypt empty values)
 */
export async function encryptField(value: string | null | undefined): Promise<EncryptedData | null | undefined> {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (value === '') return null; // Treat empty string as null

  return encrypt(value);
}

/**
 * Decrypt a single field value
 * Returns null/undefined unchanged
 */
export async function decryptField(
  encryptedValue: EncryptedData | string | null | undefined
): Promise<string | null | undefined> {
  if (encryptedValue === null) return null;
  if (encryptedValue === undefined) return undefined;

  // If it's a plain string, it might be legacy unencrypted data
  if (typeof encryptedValue === 'string') {
    return encryptedValue;
  }

  // Validate encrypted data structure
  if (!isEncryptedData(encryptedValue)) {
    throw new Error('Invalid encrypted data structure');
  }

  return decrypt(encryptedValue);
}

/**
 * Encrypt multiple fields in an object
 * Only encrypts the specified field names
 */
export async function encryptFields<T extends Record<string, unknown>>(
  data: T,
  fieldNames: (keyof T)[]
): Promise<T> {
  const result = { ...data };

  for (const fieldName of fieldNames) {
    const value = data[fieldName];
    if (typeof value === 'string' || value === null || value === undefined) {
      result[fieldName] = (await encryptField(value as string | null | undefined)) as T[keyof T];
    }
  }

  return result;
}

/**
 * Decrypt multiple fields in an object
 * Only decrypts the specified field names
 */
export async function decryptFields<T extends Record<string, unknown>>(
  data: T,
  fieldNames: (keyof T)[]
): Promise<T> {
  const result = { ...data };

  for (const fieldName of fieldNames) {
    const value = data[fieldName];
    if (isEncryptedData(value) || typeof value === 'string' || value === null || value === undefined) {
      result[fieldName] = (await decryptField(value as EncryptedData | string | null | undefined)) as T[keyof T];
    }
  }

  return result;
}

/**
 * Definition of fields that require encryption per model
 */
export const ENCRYPTED_FIELDS: Record<string, string[]> = {
  DebtorProfile: ['assessment'],
  Message: ['content', 'originalContent'],
  DemandLetter: ['content', 'paraphrasedContent'],
  // Note: debtAmount is a Decimal type, not string, so we don't encrypt it
  // If needed, it would require special handling
};

/**
 * Check if a model has encrypted fields
 */
export function hasEncryptedFields(modelName: string): boolean {
  return modelName in ENCRYPTED_FIELDS && ENCRYPTED_FIELDS[modelName].length > 0;
}

/**
 * Get the list of encrypted fields for a model
 */
export function getEncryptedFields(modelName: string): string[] {
  return ENCRYPTED_FIELDS[modelName] || [];
}
