import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response, NextFunction } from 'express';

interface TenantContext {
  organizationId: string;
  userId: string;
}

// AsyncLocalStorage for request-scoped tenant context
export const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Get the current tenant context
 * @throws Error if called outside of a request context
 */
export function getTenantContext(): TenantContext {
  const context = tenantStorage.getStore();
  if (!context) {
    throw new Error('Tenant context not set. Ensure tenantContext middleware is applied.');
  }
  return context;
}

/**
 * Safely get the current tenant context (returns undefined if not set)
 */
export function getTenantContextOrNull(): TenantContext | undefined {
  return tenantStorage.getStore();
}

/**
 * Middleware to set tenant context from authenticated user
 * Must be applied AFTER authenticate middleware
 */
export function tenantContext(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    // No user context, continue without tenant scope
    // (unauthenticated routes like login/register)
    return next();
  }

  const context: TenantContext = {
    organizationId: req.user.org_id,
    userId: req.user.sub,
  };

  // Run the rest of the request in the tenant context
  tenantStorage.run(context, () => {
    next();
  });
}
