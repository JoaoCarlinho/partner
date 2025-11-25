/**
 * Broadcast Service
 * Handles broadcasting messages to WebSocket connections
 */

import { connectionRegistry } from './connectionRegistry';

// WebSocket event types
export type WebSocketEventType =
  | 'new_message'
  | 'message_blocked'
  | 'typing_indicator'
  | 'message_read'
  | 'user_joined'
  | 'user_left'
  | 'connection_ack';

// Event payload types
export interface NewMessagePayload {
  id: string;
  caseId: string;
  senderId: string;
  senderRole: string;
  senderName: string;
  content: string;
  originalContent?: string;
  toneAnalysis?: any;
  isAiModified: boolean;
  parentMessageId?: string;
  createdAt: string;
  threadCount?: number;
}

export interface MessageBlockedPayload {
  reason: string[];
  suggestions: string[];
  originalContent: string;
}

export interface TypingIndicatorPayload {
  userId: string;
  userName: string;
  caseId: string;
  isTyping: boolean;
}

export interface MessageReadPayload {
  messageId: string;
  readAt: string;
  readBy: string;
  readByName: string;
}

export interface ConnectionAckPayload {
  connectionId: string;
  userId: string;
  subscribedCases: string[];
}

// Outbound message structure
export interface WebSocketMessage<T = unknown> {
  type: WebSocketEventType;
  payload: T;
  timestamp: string;
}

// Send function type (injected for different environments)
export type SendFunction = (connectionId: string, data: string) => Promise<void>;

// Default send function (for Express WebSocket)
let sendFunction: SendFunction = async () => {
  console.warn('WebSocket send function not configured');
};

/**
 * Configure the send function (called during app initialization)
 */
export function configureBroadcastService(send: SendFunction): void {
  sendFunction = send;
}

/**
 * Send a message to a specific connection
 */
async function sendToConnection(connectionId: string, message: WebSocketMessage): Promise<boolean> {
  try {
    const data = JSON.stringify(message);
    await sendFunction(connectionId, data);
    connectionRegistry.updateActivity(connectionId);
    return true;
  } catch (error) {
    console.error(`Failed to send to connection ${connectionId}:`, error);
    // Connection might be stale, unregister it
    connectionRegistry.unregister(connectionId);
    return false;
  }
}

/**
 * Broadcast an event to all participants in a case
 */
export async function broadcastToCase<T>(
  caseId: string,
  eventType: WebSocketEventType,
  payload: T,
  excludeConnectionId?: string
): Promise<{ sent: number; failed: number }> {
  const message: WebSocketMessage<T> = {
    type: eventType,
    payload,
    timestamp: new Date().toISOString(),
  };

  let connectionIds = connectionRegistry.getConnectionsForCase(caseId);

  if (excludeConnectionId) {
    connectionIds = connectionIds.filter((id) => id !== excludeConnectionId);
  }

  let sent = 0;
  let failed = 0;

  const results = await Promise.allSettled(
    connectionIds.map((connectionId) => sendToConnection(connectionId, message))
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Send an event to a specific user (all their connections)
 */
export async function sendToUser<T>(
  userId: string,
  eventType: WebSocketEventType,
  payload: T
): Promise<{ sent: number; failed: number }> {
  const message: WebSocketMessage<T> = {
    type: eventType,
    payload,
    timestamp: new Date().toISOString(),
  };

  const connectionIds = connectionRegistry.getConnectionsForUser(userId);

  let sent = 0;
  let failed = 0;

  const results = await Promise.allSettled(
    connectionIds.map((connectionId) => sendToConnection(connectionId, message))
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Send a direct message to a specific connection
 */
export async function sendDirect<T>(
  connectionId: string,
  eventType: WebSocketEventType,
  payload: T
): Promise<boolean> {
  const message: WebSocketMessage<T> = {
    type: eventType,
    payload,
    timestamp: new Date().toISOString(),
  };

  return sendToConnection(connectionId, message);
}

/**
 * Broadcast a new message to case participants
 */
export async function broadcastNewMessage(
  caseId: string,
  message: NewMessagePayload,
  excludeSenderId?: string
): Promise<void> {
  // Get connections for sender to exclude
  let excludeConnectionId: string | undefined;
  if (excludeSenderId) {
    const senderConnections = connectionRegistry.getConnectionsForUser(excludeSenderId);
    // For simplicity, exclude the first connection (user might have multiple)
    excludeConnectionId = senderConnections[0];
  }

  await broadcastToCase(caseId, 'new_message', message, excludeConnectionId);
}

/**
 * Broadcast typing indicator to case participants
 */
export async function broadcastTypingIndicator(
  caseId: string,
  indicator: TypingIndicatorPayload,
  excludeUserId?: string
): Promise<void> {
  let excludeConnectionId: string | undefined;
  if (excludeUserId) {
    const userConnections = connectionRegistry.getConnectionsForUser(excludeUserId);
    excludeConnectionId = userConnections[0];
  }

  await broadcastToCase(caseId, 'typing_indicator', indicator, excludeConnectionId);
}

/**
 * Broadcast read receipt to message sender
 */
export async function broadcastReadReceipt(
  senderId: string,
  receipt: MessageReadPayload
): Promise<void> {
  await sendToUser(senderId, 'message_read', receipt);
}

/**
 * Send blocked message notification
 */
export async function sendMessageBlocked(
  connectionId: string,
  blocked: MessageBlockedPayload
): Promise<void> {
  await sendDirect(connectionId, 'message_blocked', blocked);
}

/**
 * Send connection acknowledgment
 */
export async function sendConnectionAck(
  connectionId: string,
  ack: ConnectionAckPayload
): Promise<void> {
  await sendDirect(connectionId, 'connection_ack', ack);
}
