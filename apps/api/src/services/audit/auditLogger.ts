import { Request } from 'express';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../middleware/logger.js';
import { AuditAction, AuditResourceType, AuditMetadata } from '@steno/shared';
import { getTenantContextOrNull } from '../../middleware/tenantContext.js';

export interface AuditEventParams {
  action: AuditAction;
  resourceType?: AuditResourceType;
  resourceId?: string;
  metadata?: AuditMetadata;
  userId?: string; // Override for cases like failed login
  organizationId?: string; // Override for unauthenticated routes
}

/**
 * Log an audit event for compliance tracking
 * Uses fire-and-forget pattern to avoid blocking the request
 */
export function logAuditEvent(req: Request, params: AuditEventParams): void {
  const context = getTenantContextOrNull();

  // Get user and org from context or overrides
  const userId = params.userId ?? context?.userId ?? req.user?.id ?? null;
  const organizationId = params.organizationId ?? context?.organizationId ?? req.user?.organizationId ?? null;

  // Skip logging if we don't have an organization context
  // (shouldn't happen in normal flow, but prevents errors)
  if (!organizationId) {
    logger.warn('Audit log skipped: no organization context', { action: params.action });
    return;
  }

  // Extract request metadata
  const ipAddress = getClientIp(req);
  const userAgent = req.get('user-agent')?.slice(0, 500) ?? null;

  // Fire and forget - don't await
  prisma.auditLog
    .create({
      data: {
        organizationId,
        userId,
        action: params.action,
        entityType: params.resourceType ?? null,
        entityId: params.resourceId ?? null,
        metadata: params.metadata as object ?? null,
        ipAddress,
        userAgent,
      },
    })
    .catch((error: Error) => {
      // Log error but don't fail the request
      logger.error('Failed to create audit log', {
        error: error.message,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
      });
    });
}

/**
 * Log a successful login event
 */
export function logLoginSuccess(req: Request, userId: string, organizationId: string, email: string): void {
  logAuditEvent(req, {
    action: AuditAction.AUTH_LOGIN,
    resourceType: 'Session',
    userId,
    organizationId,
    metadata: {
      email,
      success: true,
    },
  });
}

/**
 * Log a failed login attempt
 */
export function logLoginFailure(req: Request, email: string, reason: string, organizationId?: string): void {
  logAuditEvent(req, {
    action: AuditAction.AUTH_FAILED_LOGIN,
    organizationId: organizationId ?? 'unknown',
    metadata: {
      email,
      success: false,
      reason,
    },
  });
}

/**
 * Log a logout event
 */
export function logLogout(req: Request): void {
  logAuditEvent(req, {
    action: AuditAction.AUTH_LOGOUT,
    resourceType: 'Session',
  });
}

/**
 * Log a role change event
 */
export function logRoleChange(
  req: Request,
  targetUserId: string,
  previousRole: string,
  newRole: string
): void {
  logAuditEvent(req, {
    action: AuditAction.USER_ROLE_CHANGED,
    resourceType: 'User',
    resourceId: targetUserId,
    metadata: {
      previousRole,
      newRole,
      changedBy: req.user?.id,
    },
  });
}

/**
 * Log data access event for compliance
 */
export function logDataAccess(
  req: Request,
  resourceType: AuditResourceType,
  resourceId: string,
  fields?: string[]
): void {
  logAuditEvent(req, {
    action: AuditAction.DEBTOR_DATA_ACCESSED,
    resourceType,
    resourceId,
    metadata: {
      fields,
    },
  });
}

/**
 * Get client IP address from request
 * Handles various proxy headers
 */
function getClientIp(req: Request): string | null {
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip ?? req.socket?.remoteAddress ?? null;
}
