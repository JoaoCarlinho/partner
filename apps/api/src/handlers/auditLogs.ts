import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { successResponse } from '../lib/response.js';
import { Errors } from '../lib/errors.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { auditLog } from '../middleware/auditLog.js';
import { AuditAction } from '@steno/shared';

const router = Router();

// All routes require FIRM_ADMIN authentication
router.use(authenticate);
router.use(tenantContext);
router.use(requireAdmin);

const querySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  userId: z.string().uuid().optional(),
  action: z.nativeEnum(AuditAction).optional(),
  resourceType: z.string().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * GET /api/v1/audit-logs
 * Query audit logs with filtering and pagination
 * Requires FIRM_ADMIN role
 */
router.get(
  '/',
  auditLog(AuditAction.AUDIT_LOGS_ACCESSED),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw Errors.unauthorized('Authentication required');
      }

      const validation = querySchema.safeParse(req.query);
      if (!validation.success) {
        throw Errors.validation('Invalid query parameters', validation.error.errors);
      }

      const { startDate, endDate, userId, action, resourceType, cursor, limit } = validation.data;

      // Build where clause
      const where: Record<string, unknown> = {
        organizationId: req.user.org_id,
      };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          (where.createdAt as Record<string, Date>).gte = new Date(startDate);
        }
        if (endDate) {
          (where.createdAt as Record<string, Date>).lte = new Date(endDate);
        }
      }

      if (userId) {
        where.userId = userId;
      }

      if (action) {
        where.action = action;
      }

      if (resourceType) {
        where.entityType = resourceType;
      }

      // Cursor-based pagination
      if (cursor) {
        where.id = { lt: cursor };
      }

      // Get total count for the query (without pagination)
      const totalCount = await prisma.auditLog.count({ where });

      // Fetch audit logs with user details
      const auditLogs = await prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1, // Fetch one extra to determine if there's a next page
      });

      // Determine if there's a next page
      const hasMore = auditLogs.length > limit;
      const results = hasMore ? auditLogs.slice(0, limit) : auditLogs;
      const nextCursor = hasMore ? results[results.length - 1].id : null;

      res.json(
        successResponse(
          results.map((log) => ({
            id: log.id,
            action: log.action,
            resourceType: log.entityType,
            resourceId: log.entityId,
            userId: log.userId,
            userEmail: log.user?.email ?? null,
            metadata: log.metadata,
            ipAddress: log.ipAddress,
            createdAt: log.createdAt.toISOString(),
          })),
          {
            nextCursor,
            totalCount,
            hasMore,
          }
        )
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/audit-logs/:id
 * Get a specific audit log entry
 * Requires FIRM_ADMIN role
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw Errors.unauthorized('Authentication required');
      }

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          id: req.params.id,
          organizationId: req.user.org_id,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      if (!auditLog) {
        throw Errors.notFound('Audit log entry not found');
      }

      res.json(
        successResponse({
          id: auditLog.id,
          action: auditLog.action,
          resourceType: auditLog.entityType,
          resourceId: auditLog.entityId,
          userId: auditLog.userId,
          userEmail: auditLog.user?.email ?? null,
          metadata: auditLog.metadata,
          ipAddress: auditLog.ipAddress,
          userAgent: auditLog.userAgent,
          createdAt: auditLog.createdAt.toISOString(),
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

export default router;
