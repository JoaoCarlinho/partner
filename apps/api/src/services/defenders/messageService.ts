/**
 * Defender-Debtor Message Service
 * Handles private messaging between assigned defenders and debtors
 */

import { v4 as uuidv4 } from 'uuid';
import { messageEncryption, EncryptedMessage } from './messageEncryption';

// Types
export type SenderType = 'DEFENDER' | 'DEBTOR';
export type MessageContentType = 'TEXT' | 'FILE' | 'SYSTEM';
export type MessageEventType = 'SENT' | 'READ' | 'ATTACHMENT_UPLOADED' | 'ATTACHMENT_DOWNLOADED';

export interface DefenderMessage {
  id: string;
  assignmentId: string;
  senderId: string;
  senderType: SenderType;
  content: string; // Encrypted JSON
  contentType: MessageContentType;
  toneAnalysisId?: string;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DefenderMessageAttachment {
  id: string;
  messageId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
  s3Bucket: string;
  uploadedAt: Date;
}

export interface DefenderMessageAudit {
  id: string;
  messageId: string;
  action: MessageEventType;
  actorId: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface SendMessageRequest {
  assignmentId: string;
  content: string;
  contentType?: MessageContentType;
  attachmentIds?: string[];
}

export interface MessageResponse {
  id: string;
  assignmentId: string;
  senderId: string;
  senderType: SenderType;
  senderName: string;
  content: string;
  contentType: MessageContentType;
  toneAnalysis?: {
    score: number;
    feedback: string[];
  } | null;
  attachments: AttachmentResponse[];
  readAt?: string;
  createdAt: string;
}

export interface AttachmentResponse {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// In-memory stores for development
// Note: In production, use PostgreSQL/Prisma
const messagesStore = new Map<string, DefenderMessage>();
const attachmentsStore = new Map<string, DefenderMessageAttachment>();
const auditStore = new Map<string, DefenderMessageAudit>();

// Mock assignment store reference
interface Assignment {
  id: string;
  defenderId: string;
  debtorId: string;
  status: string;
}

const mockAssignments = new Map<string, Assignment>();

// Initialize with sample data
mockAssignments.set('assign-001', {
  id: 'assign-001',
  defenderId: 'defender-001',
  debtorId: 'debtor-001',
  status: 'ACTIVE',
});

export class DefenderMessageService {
  /**
   * Send a message in a defender-debtor conversation
   */
  async sendMessage(
    request: SendMessageRequest,
    sender: { id: string; name: string; role: string }
  ): Promise<MessageResponse> {
    // Validate assignment and access
    const assignment = mockAssignments.get(request.assignmentId);

    if (!assignment || assignment.status !== 'ACTIVE') {
      throw new Error('Invalid or inactive assignment');
    }

    // Determine sender type
    let senderType: SenderType;
    if (sender.id === assignment.defenderId) {
      senderType = 'DEFENDER';
    } else if (sender.id === assignment.debtorId) {
      senderType = 'DEBTOR';
    } else {
      throw new Error('Not authorized to send messages in this conversation');
    }

    // Block creditors explicitly
    if (sender.role === 'CREDITOR') {
      throw new Error('Creditors cannot access defender-debtor communications');
    }

    // Encrypt message content
    const encrypted = await messageEncryption.encryptMessage(request.content);

    // Run tone analysis for defender messages
    let toneAnalysisId: string | undefined;
    let toneAnalysisResult: { score: number; feedback: string[] } | null = null;

    if (senderType === 'DEFENDER') {
      // Mock tone analysis - in production, call tone analysis service
      toneAnalysisResult = await this.analyzeTone(request.content);
      toneAnalysisId = uuidv4();
    }

    // Create message
    const messageId = uuidv4();
    const message: DefenderMessage = {
      id: messageId,
      assignmentId: request.assignmentId,
      senderId: sender.id,
      senderType,
      content: JSON.stringify(encrypted),
      contentType: request.contentType || 'TEXT',
      toneAnalysisId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    messagesStore.set(messageId, message);

    // Log for compliance
    await this.logMessageEvent(messageId, 'SENT', sender.id);

    // In production: send notifications and emit WebSocket events
    // await this.notifyRecipient(assignment, sender, message);
    // await this.emitWebSocketEvent(request.assignmentId, message);

    // Get attachments if any
    const attachments = (request.attachmentIds || [])
      .map((id) => attachmentsStore.get(id))
      .filter((a): a is DefenderMessageAttachment => a !== undefined);

    return {
      id: message.id,
      assignmentId: message.assignmentId,
      senderId: message.senderId,
      senderType: message.senderType,
      senderName: sender.name,
      content: request.content, // Return decrypted for sender
      contentType: message.contentType,
      toneAnalysis: toneAnalysisResult,
      attachments: attachments.map(this.formatAttachment),
      readAt: undefined,
      createdAt: message.createdAt.toISOString(),
    };
  }

  /**
   * Get messages for an assignment with pagination
   */
  async getMessages(
    assignmentId: string,
    user: { id: string; role: string },
    pagination: PaginationParams
  ): Promise<PaginatedResult<MessageResponse>> {
    // Validate access
    const assignment = mockAssignments.get(assignmentId);

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    if (user.id !== assignment.defenderId && user.id !== assignment.debtorId) {
      throw new Error('Not authorized to view this conversation');
    }

    // Block creditors explicitly
    if (user.role === 'CREDITOR') {
      throw new Error('Creditors cannot access defender-debtor communications');
    }

    // Get messages for assignment
    const allMessages = Array.from(messagesStore.values())
      .filter((m) => m.assignmentId === assignmentId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = allMessages.length;
    const paginatedMessages = allMessages.slice(
      pagination.offset,
      pagination.offset + pagination.limit
    );

    // Decrypt messages
    const decryptedMessages = await Promise.all(
      paginatedMessages.map(async (msg) => {
        const encrypted: EncryptedMessage = JSON.parse(msg.content);
        const decryptedContent = await messageEncryption.decryptMessage(encrypted);

        // Get attachments
        const attachments = Array.from(attachmentsStore.values()).filter(
          (a) => a.messageId === msg.id
        );

        return {
          id: msg.id,
          assignmentId: msg.assignmentId,
          senderId: msg.senderId,
          senderType: msg.senderType,
          senderName: msg.senderType === 'DEFENDER' ? 'Public Defender' : 'Debtor',
          content: decryptedContent,
          contentType: msg.contentType,
          toneAnalysis: null, // Excluded for privacy in listing
          attachments: attachments.map(this.formatAttachment),
          readAt: msg.readAt?.toISOString(),
          createdAt: msg.createdAt.toISOString(),
        };
      })
    );

    return {
      data: decryptedMessages,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  /**
   * Mark a message as read
   */
  async markAsRead(
    messageId: string,
    user: { id: string; role: string }
  ): Promise<{ id: string; readAt: string }> {
    const message = messagesStore.get(messageId);

    if (!message) {
      throw new Error('Message not found');
    }

    // Validate access
    const assignment = mockAssignments.get(message.assignmentId);

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    if (user.id !== assignment.defenderId && user.id !== assignment.debtorId) {
      throw new Error('Not authorized to access this message');
    }

    // Can only mark messages from the other party as read
    if (message.senderId === user.id) {
      throw new Error('Cannot mark your own message as read');
    }

    // Update message
    const readAt = new Date();
    message.readAt = readAt;
    message.updatedAt = new Date();
    messagesStore.set(messageId, message);

    // Log for compliance
    await this.logMessageEvent(messageId, 'READ', user.id);

    return {
      id: messageId,
      readAt: readAt.toISOString(),
    };
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadCount(
    assignmentId: string,
    userId: string
  ): Promise<number> {
    const messages = Array.from(messagesStore.values()).filter(
      (m) =>
        m.assignmentId === assignmentId &&
        m.senderId !== userId &&
        !m.readAt
    );

    return messages.length;
  }

  /**
   * Analyze tone of message (mock implementation)
   */
  private async analyzeTone(
    content: string
  ): Promise<{ score: number; feedback: string[] }> {
    // Mock tone analysis - in production, use AI service
    const feedback: string[] = [];
    let score = 85;

    // Simple heuristics for demo
    if (content.toLowerCase().includes('understand')) {
      score += 5;
      feedback.push('Good use of empathetic language');
    }

    if (content.length < 20) {
      score -= 10;
      feedback.push('Consider providing more detail');
    }

    if (content.includes('!')) {
      score -= 5;
      feedback.push('Avoid excessive punctuation for professional tone');
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      feedback,
    };
  }

  /**
   * Log message event for compliance
   */
  private async logMessageEvent(
    messageId: string,
    action: MessageEventType,
    actorId: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const audit: DefenderMessageAudit = {
      id: uuidv4(),
      messageId,
      action,
      actorId,
      metadata,
      createdAt: new Date(),
    };

    auditStore.set(audit.id, audit);
  }

  /**
   * Format attachment for response
   */
  private formatAttachment(attachment: DefenderMessageAttachment): AttachmentResponse {
    return {
      id: attachment.id,
      fileName: attachment.fileName,
      fileType: attachment.fileType,
      fileSize: attachment.fileSize,
    };
  }

  /**
   * Get audit log for a message
   */
  async getMessageAuditLog(messageId: string): Promise<DefenderMessageAudit[]> {
    return Array.from(auditStore.values())
      .filter((a) => a.messageId === messageId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Export compliance log for assignment
   */
  async exportComplianceLog(
    assignmentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DefenderMessageAudit[]> {
    const messages = Array.from(messagesStore.values())
      .filter((m) => m.assignmentId === assignmentId)
      .map((m) => m.id);

    return Array.from(auditStore.values())
      .filter(
        (a) =>
          messages.includes(a.messageId) &&
          a.createdAt >= startDate &&
          a.createdAt <= endDate
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}

// Export singleton instance
export const defenderMessageService = new DefenderMessageService();
