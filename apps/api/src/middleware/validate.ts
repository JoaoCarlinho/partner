import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { Errors } from '../lib/errors.js';

/**
 * Validation targets for request
 */
export type ValidationTarget = 'body' | 'params' | 'query';

interface ValidationConfig {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

/**
 * Sanitize a string value
 * - Trim whitespace
 * - Remove null bytes
 */
function sanitizeString(value: string): string {
  return value.trim().replace(/\0/g, '');
}

/**
 * Recursively sanitize an object's string values
 */
function sanitizeObject(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Convert Zod errors to field-level error details
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    const key = path || '_root';
    if (!details[key]) {
      details[key] = [];
    }
    details[key].push(issue.message);
  }

  return details;
}

/**
 * Validation middleware factory
 * Validates and sanitizes request body, params, and/or query
 *
 * @example
 * router.post('/users',
 *   validate({ body: createUserSchema }),
 *   createUserHandler
 * );
 *
 * @example
 * router.get('/users/:id',
 *   validate({ params: userIdSchema, query: paginationSchema }),
 *   getUserHandler
 * );
 */
export function validate(config: ValidationConfig) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors: Record<string, string[]> = {};

      // Validate and sanitize body
      if (config.body) {
        req.body = sanitizeObject(req.body);
        const result = config.body.safeParse(req.body);
        if (!result.success) {
          Object.assign(errors, formatZodErrors(result.error));
        } else {
          req.body = result.data;
        }
      }

      // Validate params
      if (config.params) {
        const result = config.params.safeParse(req.params);
        if (!result.success) {
          const paramErrors = formatZodErrors(result.error);
          for (const [key, value] of Object.entries(paramErrors)) {
            errors[`params.${key}`] = value;
          }
        }
      }

      // Validate and sanitize query
      if (config.query) {
        req.query = sanitizeObject(req.query) as typeof req.query;
        const result = config.query.safeParse(req.query);
        if (!result.success) {
          const queryErrors = formatZodErrors(result.error);
          for (const [key, value] of Object.entries(queryErrors)) {
            errors[`query.${key}`] = value;
          }
        }
      }

      // If any validation failed, throw error
      if (Object.keys(errors).length > 0) {
        throw Errors.validation('Request validation failed', Object.values(errors).flat());
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Simple body validation helper
 */
export function validateBody(schema: ZodSchema) {
  return validate({ body: schema });
}

/**
 * Simple params validation helper
 */
export function validateParams(schema: ZodSchema) {
  return validate({ params: schema });
}

/**
 * Simple query validation helper
 */
export function validateQuery(schema: ZodSchema) {
  return validate({ query: schema });
}
