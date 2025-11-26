import { Response } from 'express';
import { ApiResponse, PaginationMeta } from '@steno/shared';

interface ResponseMeta {
  pagination?: PaginationMeta;
  csrfToken?: string;
  [key: string]: unknown;
}

/**
 * Send a successful JSON response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  meta?: ResponseMeta,
  statusCode = 200
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
  sendSuccess(res, data, undefined, 201);
}

/**
 * Send a no content response (204)
 */
export function sendNoContent(res: Response): void {
  res.status(204).send();
}

/**
 * Success response helper - can be used in two ways:
 * 1. As a wrapper: res.json(successResponse(data, meta)) - returns { data, meta? }
 * 2. As a sender: successResponse(res, data, statusCode) - sends response directly
 */
export function successResponse<T>(
  dataOrRes: T | Response,
  metaOrData?: ResponseMeta | T,
  statusCode?: number
): ApiResponse<T> | void {
  // Check if first arg is a Response object (has status method)
  if (dataOrRes && typeof dataOrRes === 'object' && 'status' in dataOrRes && typeof (dataOrRes as Response).status === 'function') {
    // Direct send mode: successResponse(res, data, statusCode)
    const res = dataOrRes as Response;
    const data = metaOrData as T;
    const code = statusCode ?? 200;
    res.status(code).json({ data });
    return;
  }

  // Wrapper mode: successResponse(data, meta?)
  const data = dataOrRes as T;
  const meta = metaOrData as ResponseMeta | undefined;
  const response: ApiResponse<T> = { data };
  if (meta) {
    response.meta = meta;
  }
  return response;
}

/**
 * Error response helper - can be used in two ways:
 * 1. As a wrapper: res.json(errorResponse(message, code)) - returns { error: { code, message } }
 * 2. As a sender: errorResponse(res, code, message, statusCode) - sends response directly
 */
export function errorResponse(
  messageOrRes: string | Response,
  codeOrMessage?: string,
  messageOrStatusCode?: string | number,
  statusCodeOrDetails?: number | Record<string, string[]>,
  details?: Record<string, string[]>
): { error: { code: string; message: string; details?: Record<string, string[]> } } | void {
  // Check if first arg is a Response object
  if (messageOrRes && typeof messageOrRes === 'object' && 'status' in messageOrRes && typeof (messageOrRes as Response).status === 'function') {
    // Direct send mode: errorResponse(res, code, message, statusCode?, details?)
    const res = messageOrRes as Response;
    const code = codeOrMessage as string;
    const message = messageOrStatusCode as string;
    const statusCode = (typeof statusCodeOrDetails === 'number' ? statusCodeOrDetails : 400);
    const detailsObj = typeof statusCodeOrDetails === 'object' ? statusCodeOrDetails : details;
    res.status(statusCode).json({
      error: {
        code,
        message,
        ...(detailsObj && { details: detailsObj }),
      },
    });
    return;
  }

  // Wrapper mode: errorResponse(message, code, details?)
  const message = messageOrRes as string;
  const code = codeOrMessage as string;
  const detailsObj = typeof messageOrStatusCode === 'object' ? messageOrStatusCode as unknown as Record<string, string[]> : undefined;
  return {
    error: {
      code: code || 'ERROR',
      message,
      ...(detailsObj && { details: detailsObj }),
    },
  };
}
