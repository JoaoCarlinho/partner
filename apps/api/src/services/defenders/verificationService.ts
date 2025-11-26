/**
 * Defender Verification Service
 * Handles credential upload, storage, and admin verification
 */

import crypto from 'crypto';
import { transitionOnboarding, getDefenderProfile, DefenderProfile } from './onboardingStateMachine';

// In-memory stores (use database in production)
const credentialStore = new Map<string, DefenderCredential>();
const credentialsByDefender = new Map<string, string[]>();

export type CredentialType = 'BAR_CARD' | 'ORGANIZATION_LETTER' | 'PHOTO_ID' | 'OTHER';

export interface DefenderCredential {
  id: string;
  defenderId: string;
  credentialType: CredentialType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  documentUrl: string;
  documentHash: string;
  uploadedAt: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
  rejectionReason?: string;
}

export interface UploadCredentialRequest {
  defenderId: string;
  credentialType: CredentialType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileContent: Buffer;
}

export interface VerificationDecision {
  defenderId: string;
  approved: boolean;
  verifiedBy: string;
  notes?: string;
  rejectionReason?: string;
}

// Allowed file types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Required credentials for verification
const REQUIRED_CREDENTIALS: CredentialType[] = ['BAR_CARD', 'PHOTO_ID'];

/**
 * Upload a credential document
 */
export async function uploadCredential(
  request: UploadCredentialRequest
): Promise<DefenderCredential> {
  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(request.mimeType)) {
    throw new Error(`Invalid file type: ${request.mimeType}. Allowed: PDF, JPEG, PNG, WebP`);
  }

  // Validate file size
  if (request.fileSize > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Verify defender exists
  const defender = await getDefenderProfile(request.defenderId);
  if (!defender) {
    throw new Error('Defender not found');
  }

  // Generate document hash for integrity
  const documentHash = crypto.createHash('sha256').update(request.fileContent).digest('hex');

  // In production, upload to S3 with encryption
  // const s3Key = `credentials/${request.defenderId}/${request.credentialType}/${documentHash}`;
  // await s3.upload({
  //   Bucket: process.env.CREDENTIALS_BUCKET,
  //   Key: s3Key,
  //   Body: request.fileContent,
  //   ContentType: request.mimeType,
  //   ServerSideEncryption: 'aws:kms',
  //   SSEKMSKeyId: process.env.KMS_KEY_ID,
  // }).promise();

  // Mock S3 URL for development
  const documentUrl = `s3://credentials-bucket/${request.defenderId}/${documentHash}`;

  const credential: DefenderCredential = {
    id: generateId(),
    defenderId: request.defenderId,
    credentialType: request.credentialType,
    fileName: request.fileName,
    fileSize: request.fileSize,
    mimeType: request.mimeType,
    documentUrl,
    documentHash,
    uploadedAt: new Date(),
  };

  credentialStore.set(credential.id, credential);

  // Track credentials by defender
  const defenderCredentials = credentialsByDefender.get(request.defenderId) || [];
  defenderCredentials.push(credential.id);
  credentialsByDefender.set(request.defenderId, defenderCredentials);

  // Check if all required credentials uploaded
  await checkAndUpdateCredentialStatus(request.defenderId);

  return credential;
}

/**
 * Check if all required credentials are uploaded and update status
 */
async function checkAndUpdateCredentialStatus(defenderId: string): Promise<void> {
  const defender = await getDefenderProfile(defenderId);
  if (!defender) return;

  const credentials = await getDefenderCredentials(defenderId);
  const uploadedTypes = new Set(credentials.map((c) => c.credentialType));

  const allRequired = REQUIRED_CREDENTIALS.every((type) => uploadedTypes.has(type));

  if (allRequired && defender.onboardingStatus === 'REGISTERED') {
    await transitionOnboarding(defenderId, 'SUBMIT_CREDENTIALS');
  }
}

/**
 * Get all credentials for a defender
 */
export async function getDefenderCredentials(defenderId: string): Promise<DefenderCredential[]> {
  const credentialIds = credentialsByDefender.get(defenderId) || [];
  const credentials: DefenderCredential[] = [];

  for (const id of credentialIds) {
    const credential = credentialStore.get(id);
    if (credential) {
      credentials.push(credential);
    }
  }

  return credentials.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
}

/**
 * Get credential by ID
 */
export async function getCredential(id: string): Promise<DefenderCredential | null> {
  return credentialStore.get(id) || null;
}

/**
 * Process verification decision
 */
export async function processVerification(
  decision: VerificationDecision
): Promise<DefenderProfile> {
  const defender = await getDefenderProfile(decision.defenderId);

  if (!defender) {
    throw new Error('Defender not found');
  }

  if (defender.onboardingStatus !== 'CREDENTIALS_SUBMITTED') {
    throw new Error('Defender credentials have not been submitted or already verified');
  }

  if (decision.approved) {
    // Mark all credentials as verified
    const credentials = await getDefenderCredentials(decision.defenderId);
    for (const credential of credentials) {
      credential.verifiedAt = new Date();
      credential.verifiedBy = decision.verifiedBy;
      credentialStore.set(credential.id, credential);
    }

    // Transition to verified state
    return transitionOnboarding(decision.defenderId, 'VERIFY_CREDENTIALS', {
      verifiedBy: decision.verifiedBy,
      notes: decision.notes,
    });
  } else {
    // Mark credentials with rejection reason
    const credentials = await getDefenderCredentials(decision.defenderId);
    for (const credential of credentials) {
      credential.rejectionReason = decision.rejectionReason;
      credentialStore.set(credential.id, credential);
    }

    // Transition back to registered (can re-submit)
    return transitionOnboarding(decision.defenderId, 'REJECT_CREDENTIALS', {
      rejectionReason: decision.rejectionReason,
    });
  }
}

/**
 * Get defenders pending verification
 */
export async function getPendingVerifications(): Promise<
  Array<{
    defender: DefenderProfile;
    credentials: DefenderCredential[];
    submittedAt: Date;
  }>
> {
  const pending: Array<{
    defender: DefenderProfile;
    credentials: DefenderCredential[];
    submittedAt: Date;
  }> = [];

  // Get all defenders with CREDENTIALS_SUBMITTED status
  for (const [defenderId, credentialIds] of credentialsByDefender.entries()) {
    const defender = await getDefenderProfile(defenderId);
    if (defender?.onboardingStatus === 'CREDENTIALS_SUBMITTED') {
      const credentials = await getDefenderCredentials(defenderId);
      const submittedAt =
        credentials.length > 0
          ? new Date(Math.max(...credentials.map((c) => c.uploadedAt.getTime())))
          : new Date();

      pending.push({
        defender,
        credentials,
        submittedAt,
      });
    }
  }

  // Sort by submission date (oldest first)
  return pending.sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
}

/**
 * Delete a credential (before verification)
 */
export async function deleteCredential(credentialId: string, defenderId: string): Promise<boolean> {
  const credential = credentialStore.get(credentialId);

  if (!credential) {
    throw new Error('Credential not found');
  }

  if (credential.defenderId !== defenderId) {
    throw new Error('Not authorized to delete this credential');
  }

  if (credential.verifiedAt) {
    throw new Error('Cannot delete verified credential');
  }

  // Remove from stores
  credentialStore.delete(credentialId);

  const defenderCredentials = credentialsByDefender.get(defenderId) || [];
  const index = defenderCredentials.indexOf(credentialId);
  if (index > -1) {
    defenderCredentials.splice(index, 1);
    credentialsByDefender.set(defenderId, defenderCredentials);
  }

  // In production, delete from S3
  // await s3.deleteObject({...}).promise();

  return true;
}

/**
 * Get verification status summary
 */
export async function getVerificationStatus(defenderId: string): Promise<{
  allUploaded: boolean;
  allVerified: boolean;
  pending: CredentialType[];
  uploaded: { type: CredentialType; verified: boolean }[];
}> {
  const credentials = await getDefenderCredentials(defenderId);
  const uploadedTypes = new Map(
    credentials.map((c) => [c.credentialType, !!c.verifiedAt])
  );

  const pending: CredentialType[] = [];
  const uploaded: { type: CredentialType; verified: boolean }[] = [];

  for (const type of REQUIRED_CREDENTIALS) {
    if (uploadedTypes.has(type)) {
      uploaded.push({ type, verified: uploadedTypes.get(type)! });
    } else {
      pending.push(type);
    }
  }

  return {
    allUploaded: pending.length === 0,
    allVerified: uploaded.every((u) => u.verified),
    pending,
    uploaded,
  };
}

/**
 * Generate presigned URL for credential download (admin only)
 */
export async function getCredentialDownloadUrl(
  credentialId: string
): Promise<{ url: string; expiresAt: Date }> {
  const credential = credentialStore.get(credentialId);

  if (!credential) {
    throw new Error('Credential not found');
  }

  // In production, generate presigned S3 URL
  // const url = s3.getSignedUrl('getObject', {
  //   Bucket: process.env.CREDENTIALS_BUCKET,
  //   Key: credential.documentUrl.replace('s3://credentials-bucket/', ''),
  //   Expires: 3600, // 1 hour
  // });

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  return {
    url: `https://credentials.example.com/download/${credentialId}?token=presigned`,
    expiresAt,
  };
}

function generateId(): string {
  return `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
