import { ErrorCode, ErrorStatusMap } from '@steno/shared';

/**
 * Application error class for consistent error handling
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, string[]>;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, string[]>
  ) {
    super(message);
    this.code = code;
    this.statusCode = ErrorStatusMap[code] || 500;
    this.details = details;
    this.isOperational = true;

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert to API response format
   */
  toResponse() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

// Convenience factory functions
export const Errors = {
  validation: (message: string, details?: Record<string, string[]>) =>
    new AppError(ErrorCode.VALIDATION_ERROR, message, details),

  notFound: (resource: string) =>
    new AppError(ErrorCode.NOT_FOUND, `${resource} not found`),

  unauthorized: (message = 'Unauthorized') =>
    new AppError(ErrorCode.UNAUTHORIZED, message),

  forbidden: (message = 'Access denied') =>
    new AppError(ErrorCode.FORBIDDEN, message),

  conflict: (message: string) =>
    new AppError(ErrorCode.CONFLICT, message),

  tokenExpired: () =>
    new AppError(ErrorCode.TOKEN_EXPIRED, 'Token has expired'),

  tokenInvalid: () =>
    new AppError(ErrorCode.TOKEN_INVALID, 'Invalid token'),

  internal: (message = 'Internal server error') =>
    new AppError(ErrorCode.INTERNAL_ERROR, message),
};
