import { Request, Response, NextFunction } from 'express';
import { AuditAction, AuditResourceType } from '@steno/shared';
import { logAuditEvent } from '../services/audit/auditLogger.js';

/**
 * Resource extractor function type
 * Used to extract resource details from the request
 */
export type ResourceExtractor = (req: Request, res: Response) => {
  resourceType?: AuditResourceType;
  resourceId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Audit logging middleware factory
 * Logs the action after the response is sent successfully
 */
export function auditLog(
  action: AuditAction,
  extractor?: ResourceExtractor
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json to intercept response
    res.json = function (body: unknown) {
      // Only log on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const extracted = extractor?.(req, res) ?? {};

        logAuditEvent(req, {
          action,
          resourceType: extracted.resourceType,
          resourceId: extracted.resourceId,
          metadata: extracted.metadata,
        });
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Audit logging middleware for failed operations
 * Logs when a request fails (useful for security-sensitive endpoints)
 */
export function auditLogOnFailure(
  action: AuditAction,
  extractor?: ResourceExtractor
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown) {
      // Only log on error responses
      if (res.statusCode >= 400) {
        const extracted = extractor?.(req, res) ?? {};

        logAuditEvent(req, {
          action,
          resourceType: extracted.resourceType,
          resourceId: extracted.resourceId,
          metadata: {
            ...extracted.metadata,
            statusCode: res.statusCode,
            error: typeof body === 'object' && body !== null && 'message' in body
              ? (body as { message: string }).message
              : undefined,
          },
        });
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Combined audit logging - logs both success and failure
 */
export function auditLogAll(
  successAction: AuditAction,
  failureAction: AuditAction,
  extractor?: ResourceExtractor
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown) {
      const extracted = extractor?.(req, res) ?? {};
      const isSuccess = res.statusCode >= 200 && res.statusCode < 300;

      logAuditEvent(req, {
        action: isSuccess ? successAction : failureAction,
        resourceType: extracted.resourceType,
        resourceId: extracted.resourceId,
        metadata: {
          ...extracted.metadata,
          ...(!isSuccess && {
            statusCode: res.statusCode,
            error: typeof body === 'object' && body !== null && 'message' in body
              ? (body as { message: string }).message
              : undefined,
          }),
        },
      });

      return originalJson(body);
    };

    next();
  };
}
