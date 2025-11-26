/**
 * Message Notification Service for Defender-Debtor Communication
 * Handles real-time notifications, WebSocket events, and email alerts
 */

import { v4 as uuidv4 } from 'uuid';

// Types
export type NotificationType =
  | 'NEW_MESSAGE'
  | 'MESSAGE_READ'
  | 'TYPING'
  | 'UNREAD_REMINDER';

export interface WebSocketEvent {
  type: NotificationType;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface NotificationPreferences {
  userId: string;
  emailOnNewMessage: boolean;
  pushOnNewMessage: boolean;
  dailyUnreadDigest: boolean;
}

export interface PendingNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
}

// In-memory stores for development
const notificationsStore = new Map<string, PendingNotification>();
const preferencesStore = new Map<string, NotificationPreferences>();
const typingStatus = new Map<string, { userId: string; expiresAt: Date }>();

// WebSocket connections (mock)
const wsConnections = new Map<string, Set<string>>(); // assignmentId -> Set of userIds

export class MessageNotificationService {
  /**
   * Send notification for new message
   */
  async notifyNewMessage(
    recipientId: string,
    senderName: string,
    messagePreview: string,
    assignmentId: string
  ): Promise<void> {
    // Check preferences
    const prefs = await this.getPreferences(recipientId);

    // Create in-app notification
    const notification: PendingNotification = {
      id: uuidv4(),
      userId: recipientId,
      type: 'NEW_MESSAGE',
      title: `New message from ${senderName}`,
      body: this.truncatePreview(messagePreview),
      metadata: { assignmentId },
      read: false,
      createdAt: new Date(),
    };

    notificationsStore.set(notification.id, notification);

    // Send WebSocket event
    await this.emitToChannel(assignmentId, {
      type: 'NEW_MESSAGE',
      payload: {
        assignmentId,
        senderName,
        preview: this.truncatePreview(messagePreview),
      },
      timestamp: new Date().toISOString(),
    });

    // Send email if enabled
    if (prefs.emailOnNewMessage) {
      await this.sendEmailNotification(recipientId, notification);
    }

    // Send push notification if enabled
    if (prefs.pushOnNewMessage) {
      await this.sendPushNotification(recipientId, notification);
    }
  }

  /**
   * Send read receipt notification
   */
  async notifyMessageRead(
    messageId: string,
    readerId: string,
    assignmentId: string
  ): Promise<void> {
    await this.emitToChannel(assignmentId, {
      type: 'MESSAGE_READ',
      payload: {
        messageId,
        readerId,
        readAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle typing indicator
   */
  async setTypingStatus(
    assignmentId: string,
    userId: string,
    isTyping: boolean
  ): Promise<void> {
    const key = `${assignmentId}:${userId}`;

    if (isTyping) {
      // Set typing with 5 second expiry
      typingStatus.set(key, {
        userId,
        expiresAt: new Date(Date.now() + 5000),
      });
    } else {
      typingStatus.delete(key);
    }

    await this.emitToChannel(assignmentId, {
      type: 'TYPING',
      payload: {
        userId,
        isTyping,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get typing status for an assignment
   */
  getTypingUsers(assignmentId: string): string[] {
    const now = new Date();
    const typingUsers: string[] = [];

    for (const [key, status] of typingStatus.entries()) {
      if (key.startsWith(`${assignmentId}:`) && status.expiresAt > now) {
        typingUsers.push(status.userId);
      }
    }

    return typingUsers;
  }

  /**
   * Subscribe to WebSocket channel
   */
  async subscribeToChannel(
    assignmentId: string,
    userId: string
  ): Promise<void> {
    if (!wsConnections.has(assignmentId)) {
      wsConnections.set(assignmentId, new Set());
    }
    wsConnections.get(assignmentId)!.add(userId);
  }

  /**
   * Unsubscribe from WebSocket channel
   */
  async unsubscribeFromChannel(
    assignmentId: string,
    userId: string
  ): Promise<void> {
    wsConnections.get(assignmentId)?.delete(userId);
  }

  /**
   * Emit event to WebSocket channel
   */
  private async emitToChannel(
    assignmentId: string,
    event: WebSocketEvent
  ): Promise<void> {
    // In production, use Redis pub/sub or similar
    const subscribers = wsConnections.get(assignmentId);

    if (subscribers) {
      console.log(
        `[WebSocket] Emitting ${event.type} to ${subscribers.size} subscribers on channel ${assignmentId}`
      );
    }
  }

  /**
   * Get notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const existing = preferencesStore.get(userId);
    if (existing) return existing;

    // Default preferences
    const defaults: NotificationPreferences = {
      userId,
      emailOnNewMessage: true,
      pushOnNewMessage: true,
      dailyUnreadDigest: true,
    };

    preferencesStore.set(userId, defaults);
    return defaults;
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const current = await this.getPreferences(userId);
    const updated = { ...current, ...updates, userId };
    preferencesStore.set(userId, updated);
    return updated;
  }

  /**
   * Get unread notifications for user
   */
  async getUnreadNotifications(userId: string): Promise<PendingNotification[]> {
    return Array.from(notificationsStore.values())
      .filter((n) => n.userId === userId && !n.read)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId: string): Promise<void> {
    const notification = notificationsStore.get(notificationId);
    if (notification) {
      notification.read = true;
      notificationsStore.set(notificationId, notification);
    }
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllRead(userId: string): Promise<void> {
    for (const [id, notification] of notificationsStore.entries()) {
      if (notification.userId === userId && !notification.read) {
        notification.read = true;
        notificationsStore.set(id, notification);
      }
    }
  }

  /**
   * Send email notification (mock)
   */
  private async sendEmailNotification(
    userId: string,
    notification: PendingNotification
  ): Promise<void> {
    // In production, use email service (SES, SendGrid, etc.)
    console.log(`[Email] Sending to ${userId}: ${notification.title}`);
  }

  /**
   * Send push notification (mock)
   */
  private async sendPushNotification(
    userId: string,
    notification: PendingNotification
  ): Promise<void> {
    // In production, use push service (FCM, APNs, etc.)
    console.log(`[Push] Sending to ${userId}: ${notification.title}`);
  }

  /**
   * Send daily unread digest
   */
  async sendUnreadDigest(): Promise<void> {
    // Get all users with unread messages
    const userUnreads = new Map<string, number>();

    for (const notification of notificationsStore.values()) {
      if (!notification.read && notification.type === 'NEW_MESSAGE') {
        const count = userUnreads.get(notification.userId) || 0;
        userUnreads.set(notification.userId, count + 1);
      }
    }

    // Send digest emails
    for (const [userId, count] of userUnreads.entries()) {
      const prefs = await this.getPreferences(userId);
      if (prefs.dailyUnreadDigest && count > 0) {
        console.log(`[Digest] Sending to ${userId}: ${count} unread messages`);
      }
    }
  }

  /**
   * Truncate message preview
   */
  private truncatePreview(text: string, maxLength = 100): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Clear expired typing statuses
   */
  clearExpiredTypingStatuses(): void {
    const now = new Date();
    for (const [key, status] of typingStatus.entries()) {
      if (status.expiresAt <= now) {
        typingStatus.delete(key);
      }
    }
  }
}

// Export singleton instance
export const messageNotificationService = new MessageNotificationService();

// Clean up expired typing statuses periodically
setInterval(() => {
  messageNotificationService.clearExpiredTypingStatuses();
}, 5000);
