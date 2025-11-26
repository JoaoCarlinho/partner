import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
import { ErrorCode } from '@steno/shared';

/**
 * Global error handling middleware
 * Transforms errors into consistent API response format
 */
export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Handle AppError (operational errors)
  if (err instanceof AppError) {
    res.status(err.statusCode).json(err.toResponse());
    return;
  }

  // Handle Prisma unique constraint violations
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as { code?: string; meta?: { target?: string[] } };
    if (prismaError.code === 'P2002') {
      const target = prismaError.meta?.target?.join(', ') || 'field';
      res.status(409).json({
        error: {
          code: ErrorCode.CONFLICT,
          message: `A record with this ${target} already exists`,
        },
      });
      return;
    }
  }

  // Log unexpected errors
  console.error('Unexpected error:', err);

  // Return generic error for unexpected errors (don't leak internal details)
  res.status(500).json({
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    },
  });
};
