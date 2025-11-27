import bcrypt from 'bcryptjs';

const BCRYPT_COST_FACTOR = 12;

/**
 * Hash a password using bcrypt
 * Cost factor 12 provides ~300ms hashing time, good balance of security/performance
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST_FACTOR);
}

/**
 * Verify a password against a bcrypt hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
