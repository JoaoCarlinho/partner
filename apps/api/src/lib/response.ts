import { Response } from 'express';
import { ApiResponse, PaginationMeta } from '@steno/shared';

/**
 * Send a successful JSON response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: { pagination?: PaginationMeta }
): void {
  const response: ApiResponse<T> = { data };
  if (meta) {
    response.meta = meta;
  }
  res.status(statusCode).json(response);
}

/**
 * Send a created response (201)
 */
export function sendCreated<T>(res: Response, data: T): void {
  sendSuccess(res, data, 201);
}

/**
 * Send a no content response (204)
 */
export function sendNoContent(res: Response): void {
  res.status(204).send();
}
