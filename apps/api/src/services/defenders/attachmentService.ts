/**
 * Defender Message Attachment Service
 * Handles file uploads and downloads for defender-debtor communication
 */

import { v4 as uuidv4 } from 'uuid';
import { messageEncryption } from './messageEncryption';

// Types
export interface FileUpload {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface AttachmentRecord {
  id: string;
  messageId?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
  s3Bucket: string;
  encryptionMetadata: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface UploadResult {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface DownloadResult {
  downloadUrl: string;
  expiresAt: string;
}

// Configuration
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'text/plain',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const DEFAULT_BUCKET = 'defender-attachments';

// In-memory stores for development
// Note: In production, use S3 for file storage and PostgreSQL for metadata
const attachmentStore = new Map<string, AttachmentRecord>();
const fileStore = new Map<string, Buffer>(); // Simulates S3

// Mock assignment access validation
interface Assignment {
  id: string;
  defenderId: string;
  debtorId: string;
  status: string;
}

const mockAssignments = new Map<string, Assignment>();
mockAssignments.set('assign-001', {
  id: 'assign-001',
  defenderId: 'defender-001',
  debtorId: 'debtor-001',
  status: 'ACTIVE',
});

export class DefenderAttachmentService {
  /**
   * Upload an attachment
   */
  async uploadAttachment(
    file: FileUpload,
    assignmentId: string,
    user: { id: string; role: string }
  ): Promise<UploadResult> {
    // Validate access
    const assignment = mockAssignments.get(assignmentId);
    if (!assignment) {
      throw new Error('Assignment not found');
    }

    if (user.id !== assignment.defenderId && user.id !== assignment.debtorId) {
      throw new Error('Not authorized to upload attachments');
    }

    if (user.role === 'CREDITOR') {
      throw new Error('Creditors cannot upload to defender conversations');
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      throw new Error(
        `File type not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Scan for malware (mock)
    await this.scanForMalware(file.buffer);

    // Encrypt file
    const { encryptedBuffer, metadata } = await messageEncryption.encryptFile(file.buffer);

    // Generate S3 key
    const attachmentId = uuidv4();
    const s3Key = `defender-attachments/${assignmentId}/${attachmentId}-${file.originalname}`;

    // Store file (in production, upload to S3)
    fileStore.set(s3Key, encryptedBuffer);

    // Create attachment record
    const attachment: AttachmentRecord = {
      id: attachmentId,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      s3Key,
      s3Bucket: DEFAULT_BUCKET,
      encryptionMetadata: JSON.stringify(metadata),
      uploadedBy: user.id,
      uploadedAt: new Date(),
    };

    attachmentStore.set(attachmentId, attachment);

    return {
      id: attachment.id,
      fileName: attachment.fileName,
      fileType: attachment.fileType,
      fileSize: attachment.fileSize,
      uploadedAt: attachment.uploadedAt.toISOString(),
    };
  }

  /**
   * Link attachment to a message
   */
  async linkToMessage(attachmentId: string, messageId: string): Promise<void> {
    const attachment = attachmentStore.get(attachmentId);
    if (!attachment) {
      throw new Error('Attachment not found');
    }

    attachment.messageId = messageId;
    attachmentStore.set(attachmentId, attachment);
  }

  /**
   * Get download URL for an attachment
   */
  async getDownloadUrl(
    attachmentId: string,
    user: { id: string; role: string }
  ): Promise<DownloadResult> {
    const attachment = attachmentStore.get(attachmentId);
    if (!attachment) {
      throw new Error('Attachment not found');
    }

    // Parse assignment ID from S3 key
    const keyParts = attachment.s3Key.split('/');
    const assignmentId = keyParts[1];

    // Validate access
    const assignment = mockAssignments.get(assignmentId);
    if (!assignment) {
      throw new Error('Assignment not found');
    }

    if (user.id !== assignment.defenderId && user.id !== assignment.debtorId) {
      throw new Error('Not authorized to download this attachment');
    }

    if (user.role === 'CREDITOR') {
      throw new Error('Creditors cannot access defender attachments');
    }

    // Generate presigned URL (mock - in production use S3 presigned URLs)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const downloadUrl = `/api/v1/defender/attachments/${attachmentId}/download?token=${uuidv4()}&expires=${expiresAt.getTime()}`;

    return {
      downloadUrl,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Download and decrypt attachment content
   */
  async downloadAttachment(
    attachmentId: string,
    user: { id: string; role: string }
  ): Promise<{ buffer: Buffer; fileName: string; fileType: string }> {
    const attachment = attachmentStore.get(attachmentId);
    if (!attachment) {
      throw new Error('Attachment not found');
    }

    // Parse assignment ID from S3 key
    const keyParts = attachment.s3Key.split('/');
    const assignmentId = keyParts[1];

    // Validate access
    const assignment = mockAssignments.get(assignmentId);
    if (!assignment) {
      throw new Error('Assignment not found');
    }

    if (user.id !== assignment.defenderId && user.id !== assignment.debtorId) {
      throw new Error('Not authorized to download this attachment');
    }

    // Get encrypted file
    const encryptedBuffer = fileStore.get(attachment.s3Key);
    if (!encryptedBuffer) {
      throw new Error('File not found');
    }

    // Decrypt file
    const metadata = JSON.parse(attachment.encryptionMetadata);
    const decryptedBuffer = await messageEncryption.decryptFile(encryptedBuffer, metadata);

    return {
      buffer: decryptedBuffer,
      fileName: attachment.fileName,
      fileType: attachment.fileType,
    };
  }

  /**
   * Delete an attachment
   */
  async deleteAttachment(
    attachmentId: string,
    user: { id: string }
  ): Promise<void> {
    const attachment = attachmentStore.get(attachmentId);
    if (!attachment) {
      throw new Error('Attachment not found');
    }

    // Only uploader can delete
    if (attachment.uploadedBy !== user.id) {
      throw new Error('Only the uploader can delete this attachment');
    }

    // Delete from file store
    fileStore.delete(attachment.s3Key);

    // Delete metadata
    attachmentStore.delete(attachmentId);
  }

  /**
   * Get attachments for a message
   */
  async getMessageAttachments(messageId: string): Promise<AttachmentRecord[]> {
    return Array.from(attachmentStore.values())
      .filter((a) => a.messageId === messageId);
  }

  /**
   * Scan file for malware (mock implementation)
   */
  private async scanForMalware(buffer: Buffer): Promise<void> {
    // In production, integrate with malware scanning service
    // like ClamAV or AWS GuardDuty

    // Check for common malware signatures (simplified)
    const content = buffer.toString('utf8', 0, Math.min(1000, buffer.length));

    // Block executable content in documents
    const dangerousPatterns = [
      '<script',
      'javascript:',
      'vbscript:',
      'powershell',
      'cmd.exe',
    ];

    for (const pattern of dangerousPatterns) {
      if (content.toLowerCase().includes(pattern)) {
        throw new Error('File contains potentially malicious content');
      }
    }

    // Simulate scan delay
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Get file type icon
   */
  getFileTypeIcon(fileType: string): string {
    const iconMap: Record<string, string> = {
      'application/pdf': '📄',
      'application/msword': '📝',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
      'image/jpeg': '🖼️',
      'image/png': '🖼️',
      'image/gif': '🖼️',
      'text/plain': '📃',
    };

    return iconMap[fileType] || '📎';
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

// Export singleton instance
export const defenderAttachmentService = new DefenderAttachmentService();
