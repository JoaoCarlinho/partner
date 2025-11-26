import { Request, Response, NextFunction } from 'express';
import { Role, hasPermission, hasRoleOrHigher, requiresResourceCheck } from '@steno/shared';
import { Errors } from '../lib/errors.js';

/**
 * Authorization middleware factory
 * Creates middleware that checks if authenticated user has required permission
 *
 * Story 1-4 Acceptance Criteria:
 * AC4: Permission check middleware on all endpoints
 * AC5: Role hierarchy enforced (Admin > Attorney > Paralegal)
 * AC6: Debtor and Public Defender roles isolated
 */
export function authorize(requiredPermission: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // User context must be set by authenticate middleware
      if (!req.user) {
        throw Errors.unauthorized('Authentication required');
      }

      const userRole = req.user.role;

      // Check if user has required permission
      if (!hasPermission(userRole, requiredPermission)) {
        throw Errors.forbidden('Insufficient permissions for this action');
      }

      // Check if permission requires resource-level verification
      const resourceCheck = requiresResourceCheck(requiredPermission);
      if (resourceCheck.requires) {
        // Attach scope info for handlers to verify
        (req as Request & { resourceScope?: 'own' | 'assigned' }).resourceScope = resourceCheck.scope;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require specific role or higher in hierarchy
 * Useful for endpoints that require role-based access regardless of specific permission
 */
export function requireRole(requiredRole: Role) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw Errors.unauthorized('Authentication required');
      }

      const userRole = req.user.role;

      // Check if user role meets requirement
      if (!hasRoleOrHigher(userRole, requiredRole)) {
        throw Errors.forbidden(`Role ${requiredRole} or higher required`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require FIRM_ADMIN role specifically
 * Shorthand for admin-only endpoints
 */
export const requireAdmin = requireRole(Role.FIRM_ADMIN);

/**
 * Require at least ATTORNEY role
 */
export const requireAttorneyOrHigher = requireRole(Role.ATTORNEY);

/**
 * Require at least PARALEGAL role (any staff member)
 */
export const requireStaff = requireRole(Role.PARALEGAL);
