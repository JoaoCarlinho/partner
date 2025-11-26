/**
 * WebSocket Event Handlers
 * Handles WebSocket connections and events for real-time messaging
 */

import { connectionRegistry } from '../services/messaging/connectionRegistry';
import {
  broadcastToCase,
  sendConnectionAck,
  type TypingIndicatorPayload,
} from '../services/messaging/broadcastService';

// Event types from clients
export type ClientEventType =
  | 'subscribe_case'
  | 'unsubscribe_case'
  | 'send_message'
  | 'typing_start'
  | 'typing_stop'
  | 'mark_read';

// Client event payloads
export interface SubscribeCasePayload {
  caseId: string;
}

export interface SendMessagePayload {
  caseId: string;
  content: string;
  parentMessageId?: string;
}

export interface TypingPayload {
  caseId: string;
}

export interface MarkReadPayload {
  messageId: string;
}

// Client event structure
export interface ClientEvent<T = unknown> {
  type: ClientEventType;
  payload: T;
}

// User context from JWT
export interface UserContext {
  id: string;
  role: string;
  name: string;
  organizationId?: string;
}

// Typing state tracking
const typingUsers: Map<string, { caseId: string; timeout: NodeJS.Timeout }> = new Map();
const TYPING_TIMEOUT_MS = 3000;

/**
 * Handle new WebSocket connection
 */
export async function handleConnect(
  connectionId: string,
  user: UserContext
): Promise<void> {
  // Register the connection
  connectionRegistry.register(connectionId, user.id, user.role);

  console.log(`[WebSocket] Connection established: ${connectionId} for user ${user.id}`);

  // Send acknowledgment
  await sendConnectionAck(connectionId, {
    connectionId,
    userId: user.id,
    subscribedCases: [],
  });
}

/**
 * Handle WebSocket disconnection
 */
export async function handleDisconnect(connectionId: string): Promise<void> {
  // Clear any typing state
  const connection = connectionRegistry.getConnection(connectionId);
  if (connection) {
    clearTypingState(connection.userId);
  }

  // Unregister the connection
  connectionRegistry.unregister(connectionId);

  console.log(`[WebSocket] Connection closed: ${connectionId}`);
}

/**
 * Handle incoming WebSocket message
 */
export async function handleMessage(
  connectionId: string,
  event: ClientEvent,
  user: UserContext
): Promise<void> {
  // Update connection activity
  connectionRegistry.updateActivity(connectionId);

  switch (event.type) {
    case 'subscribe_case':
      await handleSubscribeCase(connectionId, event.payload as SubscribeCasePayload, user);
      break;

    case 'unsubscribe_case':
      await handleUnsubscribeCase(connectionId, event.payload as SubscribeCasePayload);
      break;

    case 'typing_start':
      await handleTypingStart(connectionId, event.payload as TypingPayload, user);
      break;

    case 'typing_stop':
      await handleTypingStop(connectionId, event.payload as TypingPayload, user);
      break;

    case 'mark_read':
      await handleMarkRead(connectionId, event.payload as MarkReadPayload, user);
      break;

    default:
      console.warn(`[WebSocket] Unknown event type: ${event.type}`);
  }
}

/**
 * Handle case subscription
 */
async function handleSubscribeCase(
  connectionId: string,
  payload: SubscribeCasePayload,
  user: UserContext
): Promise<void> {
  const { caseId } = payload;

  // TODO: Verify user has access to case

  // Subscribe to case
  connectionRegistry.subscribeToCase(connectionId, caseId);

  console.log(`[WebSocket] User ${user.id} subscribed to case ${caseId}`);

  // Notify other participants
  await broadcastToCase(
    caseId,
    'user_joined',
    {
      userId: user.id,
      userName: user.name,
      userRole: user.role,
    },
    connectionId
  );
}

/**
 * Handle case unsubscription
 */
async function handleUnsubscribeCase(
  connectionId: string,
  payload: SubscribeCasePayload
): Promise<void> {
  const { caseId } = payload;
  const connection = connectionRegistry.getConnection(connectionId);

  // Unsubscribe from case
  connectionRegistry.unsubscribeFromCase(connectionId, caseId);

  console.log(`[WebSocket] Connection ${connectionId} unsubscribed from case ${caseId}`);

  // Notify other participants
  if (connection) {
    await broadcastToCase(
      caseId,
      'user_left',
      {
        userId: connection.userId,
      },
      connectionId
    );
  }
}

/**
 * Handle typing start
 */
async function handleTypingStart(
  connectionId: string,
  payload: TypingPayload,
  user: UserContext
): Promise<void> {
  const { caseId } = payload;

  // Clear existing timeout
  const existingState = typingUsers.get(user.id);
  if (existingState) {
    clearTimeout(existingState.timeout);
  }

  // Set auto-stop timeout
  const timeout = setTimeout(() => {
    handleTypingStop(connectionId, payload, user);
  }, TYPING_TIMEOUT_MS);

  typingUsers.set(user.id, { caseId, timeout });

  // Broadcast typing indicator
  const indicator: TypingIndicatorPayload = {
    userId: user.id,
    userName: user.name,
    caseId,
    isTyping: true,
  };

  await broadcastToCase(caseId, 'typing_indicator', indicator, connectionId);
}

/**
 * Handle typing stop
 */
async function handleTypingStop(
  connectionId: string,
  payload: TypingPayload,
  user: UserContext
): Promise<void> {
  const { caseId } = payload;

  // Clear typing state
  clearTypingState(user.id);

  // Broadcast typing stop
  const indicator: TypingIndicatorPayload = {
    userId: user.id,
    userName: user.name,
    caseId,
    isTyping: false,
  };

  await broadcastToCase(caseId, 'typing_indicator', indicator, connectionId);
}

/**
 * Handle mark read via WebSocket
 */
async function handleMarkRead(
  connectionId: string,
  payload: MarkReadPayload,
  user: UserContext
): Promise<void> {
  // This would typically call the message service
  // For now, just log it
  console.log(`[WebSocket] User ${user.id} marked message ${payload.messageId} as read`);
}

/**
 * Clear typing state for a user
 */
function clearTypingState(userId: string): void {
  const state = typingUsers.get(userId);
  if (state) {
    clearTimeout(state.timeout);
    typingUsers.delete(userId);
  }
}

/**
 * Get connection statistics
 */
export function getConnectionStats(): {
  totalConnections: number;
  totalUsers: number;
  totalCases: number;
} {
  return connectionRegistry.getStats();
}

/**
 * Cleanup stale connections (call periodically)
 */
export function cleanupStaleConnections(): string[] {
  return connectionRegistry.cleanupStaleConnections();
}
