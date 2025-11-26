/**
 * Messages API Handlers
 * REST endpoints for message management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { broadcastNewMessage, broadcastReadReceipt } from '../services/messaging/broadcastService';

const router = Router();

// Audit action constants
const AUDIT_ACTION_MESSAGE_SENT = 'MESSAGE_SENT';
const AUDIT_ACTION_MESSAGE_READ = 'MESSAGE_READ';

// Types
interface Message {
  id: string;
  caseId: string;
  senderId: string;
  senderRole: string;
  senderName: string;
  content: string;
  originalContent?: string;
  toneAnalysis?: any;
  complianceFlags?: any;
  isAiModified: boolean;
  parentMessageId?: string;
  createdAt: string;
  readAt?: string;
  threadCount?: number;
}

interface CreateMessageRequest {
  content: string;
  parentMessageId?: string;
}

// In-memory message store (would use database in production)
const messages: Map<string, Message> = new Map();
const messagesByCase: Map<string, string[]> = new Map();

/**
 * Generate unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * GET /api/v1/cases/:caseId/messages
 * Get paginated message history for a case
 */
router.get('/:caseId/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { caseId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const parentId = req.query.parentId as string | undefined;

    // Get user from auth context
    const user = (req as any).user || { id: 'mock-user', role: 'DEBTOR', name: 'Mock User' };

    // TODO: Verify user has access to case

    // Get messages for case
    const caseMessageIds = messagesByCase.get(caseId) || [];
    let caseMessages = caseMessageIds
      .map((id) => messages.get(id))
      .filter((m): m is Message => m !== undefined);

    // Filter by parent if specified (for threading)
    if (parentId === 'null') {
      // Top-level messages only
      caseMessages = caseMessages.filter((m) => !m.parentMessageId);
    } else if (parentId) {
      // Thread messages
      caseMessages = caseMessages.filter((m) => m.parentMessageId === parentId);
    }

    // Sort by created_at descending
    caseMessages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Paginate
    const total = caseMessages.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMessages = caseMessages.slice(startIndex, endIndex);

    // Add thread counts for top-level messages
    const messagesWithThreadCounts = paginatedMessages.map((msg) => {
      if (!msg.parentMessageId) {
        const threadCount = caseMessages.filter((m) => m.parentMessageId === msg.id).length;
        return { ...msg, threadCount };
      }
      return msg;
    });

    res.status(200).json({
      success: true,
      data: messagesWithThreadCounts,
      meta: {
        pagination: {
          page,
          limit,
          total,
          hasMore: endIndex < total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/cases/:caseId/messages
 * Create and send a new message
 */
router.post(
  '/:caseId/messages',
  async (req: Request<{ caseId: string }, any, CreateMessageRequest>, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const { content, parentMessageId } = req.body;

      // Get user from auth context
      const user = (req as any).user || {
        id: 'mock-user',
        role: 'DEBTOR',
        name: 'Mock User',
      };

      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Message content is required',
        });
      }

      // TODO: Verify user has access to case
      // TODO: Run tone analysis (E4-S2)
      // TODO: Check compliance (E4-S5)

      // Validate parent message if provided
      if (parentMessageId) {
        const parentMessage = messages.get(parentMessageId);
        if (!parentMessage || parentMessage.caseId !== caseId) {
          return res.status(400).json({
            success: false,
            error: 'Invalid parent message',
          });
        }
      }

      // Create message
      const messageId = generateMessageId();
      const message: Message = {
        id: messageId,
        caseId,
        senderId: user.id,
        senderRole: user.role,
        senderName: user.name,
        content: content.trim(),
        isAiModified: false,
        parentMessageId,
        createdAt: new Date().toISOString(),
      };

      // Store message
      messages.set(messageId, message);
      if (!messagesByCase.has(caseId)) {
        messagesByCase.set(caseId, []);
      }
      messagesByCase.get(caseId)!.push(messageId);

      // Log audit event
      console.log(`[AUDIT] ${AUDIT_ACTION_MESSAGE_SENT}`, {
        messageId,
        caseId,
        senderId: user.id,
        senderRole: user.role,
        parentMessageId,
        timestamp: new Date().toISOString(),
      });

      // Broadcast to case participants
      await broadcastNewMessage(caseId, message, user.id);

      res.status(201).json({
        success: true,
        data: message,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/messages/:messageId/thread
 * Get all messages in a thread
 */
router.get('/messages/:messageId/thread', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { messageId } = req.params;

    const parentMessage = messages.get(messageId);
    if (!parentMessage) {
      return res.status(404).json({
        success: false,
        error: 'Message not found',
      });
    }

    // Get all messages in thread
    const caseMessageIds = messagesByCase.get(parentMessage.caseId) || [];
    const threadMessages = caseMessageIds
      .map((id) => messages.get(id))
      .filter((m): m is Message => m !== undefined && m.parentMessageId === messageId);

    // Sort by created_at ascending (oldest first in thread)
    threadMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    res.status(200).json({
      success: true,
      data: {
        parent: parentMessage,
        replies: threadMessages,
        replyCount: threadMessages.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/messages/:messageId/read
 * Mark a message as read
 */
router.put('/messages/:messageId/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { messageId } = req.params;

    // Get user from auth context
    const user = (req as any).user || { id: 'mock-user', name: 'Mock User' };

    const message = messages.get(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found',
      });
    }

    // Only mark as read if not already read and not sender
    if (!message.readAt && message.senderId !== user.id) {
      message.readAt = new Date().toISOString();

      // Log audit event
      console.log(`[AUDIT] ${AUDIT_ACTION_MESSAGE_READ}`, {
        messageId,
        readBy: user.id,
        timestamp: message.readAt,
      });

      // Broadcast read receipt to sender
      await broadcastReadReceipt(message.senderId, {
        messageId,
        readAt: message.readAt,
        readBy: user.id,
        readByName: user.name,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        messageId,
        readAt: message.readAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/cases/:caseId/messages/mark-all-read
 * Mark all messages in a case as read
 */
router.post('/:caseId/messages/mark-all-read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { caseId } = req.params;

    // Get user from auth context
    const user = (req as any).user || { id: 'mock-user', name: 'Mock User' };

    const caseMessageIds = messagesByCase.get(caseId) || [];
    const readAt = new Date().toISOString();
    let markedCount = 0;

    for (const msgId of caseMessageIds) {
      const message = messages.get(msgId);
      if (message && !message.readAt && message.senderId !== user.id) {
        message.readAt = readAt;
        markedCount++;

        // Broadcast read receipt
        await broadcastReadReceipt(message.senderId, {
          messageId: message.id,
          readAt,
          readBy: user.id,
          readByName: user.name,
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        markedCount,
        readAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
