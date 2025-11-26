/**
 * WebSocket Connection Registry
 * Manages active WebSocket connections for real-time messaging
 */

// Connection info stored per connection
export interface ConnectionInfo {
  connectionId: string;
  userId: string;
  userRole: string;
  caseIds: Set<string>;
  connectedAt: Date;
  lastActivity: Date;
}

// In-memory registry (for single-Lambda deployment)
// For distributed deployment, use DynamoDB with TTL
class ConnectionRegistry {
  // connectionId → ConnectionInfo
  private connections: Map<string, ConnectionInfo> = new Map();

  // caseId → Set<connectionId>
  private caseConnections: Map<string, Set<string>> = new Map();

  // userId → Set<connectionId>
  private userConnections: Map<string, Set<string>> = new Map();

  /**
   * Register a new connection
   */
  register(connectionId: string, userId: string, userRole: string): void {
    const connectionInfo: ConnectionInfo = {
      connectionId,
      userId,
      userRole,
      caseIds: new Set(),
      connectedAt: new Date(),
      lastActivity: new Date(),
    };

    this.connections.set(connectionId, connectionInfo);

    // Add to user connections
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(connectionId);
  }

  /**
   * Subscribe connection to a case
   */
  subscribeToCase(connectionId: string, caseId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    // Add case to connection
    connection.caseIds.add(caseId);
    connection.lastActivity = new Date();

    // Add connection to case
    if (!this.caseConnections.has(caseId)) {
      this.caseConnections.set(caseId, new Set());
    }
    this.caseConnections.get(caseId)!.add(connectionId);
  }

  /**
   * Unsubscribe connection from a case
   */
  unsubscribeFromCase(connectionId: string, caseId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.caseIds.delete(caseId);
      connection.lastActivity = new Date();
    }

    const caseConns = this.caseConnections.get(caseId);
    if (caseConns) {
      caseConns.delete(connectionId);
      if (caseConns.size === 0) {
        this.caseConnections.delete(caseId);
      }
    }
  }

  /**
   * Unregister a connection (cleanup on disconnect)
   */
  unregister(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Remove from all case subscriptions
    for (const caseId of connection.caseIds) {
      const caseConns = this.caseConnections.get(caseId);
      if (caseConns) {
        caseConns.delete(connectionId);
        if (caseConns.size === 0) {
          this.caseConnections.delete(caseId);
        }
      }
    }

    // Remove from user connections
    const userConns = this.userConnections.get(connection.userId);
    if (userConns) {
      userConns.delete(connectionId);
      if (userConns.size === 0) {
        this.userConnections.delete(connection.userId);
      }
    }

    // Remove connection
    this.connections.delete(connectionId);
  }

  /**
   * Get all connection IDs subscribed to a case
   */
  getConnectionsForCase(caseId: string): string[] {
    const caseConns = this.caseConnections.get(caseId);
    return caseConns ? Array.from(caseConns) : [];
  }

  /**
   * Get all connection IDs for a user
   */
  getConnectionsForUser(userId: string): string[] {
    const userConns = this.userConnections.get(userId);
    return userConns ? Array.from(userConns) : [];
  }

  /**
   * Get connection info
   */
  getConnection(connectionId: string): ConnectionInfo | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Get all connections for a case excluding a specific connection
   */
  getOtherConnectionsForCase(caseId: string, excludeConnectionId: string): string[] {
    return this.getConnectionsForCase(caseId).filter((id) => id !== excludeConnectionId);
  }

  /**
   * Update last activity timestamp
   */
  updateActivity(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  /**
   * Get statistics for monitoring
   */
  getStats(): {
    totalConnections: number;
    totalUsers: number;
    totalCases: number;
  } {
    return {
      totalConnections: this.connections.size,
      totalUsers: this.userConnections.size,
      totalCases: this.caseConnections.size,
    };
  }

  /**
   * Cleanup stale connections (for periodic maintenance)
   */
  cleanupStaleConnections(maxIdleMs: number = 30 * 60 * 1000): string[] {
    const now = new Date().getTime();
    const staleConnections: string[] = [];

    for (const [connectionId, info] of this.connections) {
      if (now - info.lastActivity.getTime() > maxIdleMs) {
        staleConnections.push(connectionId);
      }
    }

    for (const connectionId of staleConnections) {
      this.unregister(connectionId);
    }

    return staleConnections;
  }
}

// Export singleton instance
export const connectionRegistry = new ConnectionRegistry();

// Export class for testing
export { ConnectionRegistry };
