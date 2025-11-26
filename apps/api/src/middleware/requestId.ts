import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// Augment Express Request type
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/**
 * Request ID middleware
 * Adds a unique correlation ID to each request for tracing
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  // Use existing request ID from header or generate new one
  const id = (req.get('x-request-id') as string) || randomUUID();

  req.requestId = id;
  res.setHeader('X-Request-ID', id);

  next();
}
