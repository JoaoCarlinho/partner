import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { Errors } from '../lib/errors.js';

const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = 'steno_csrf';
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * CSRF Protection Middleware (AC6)
 *
 * Implements double-submit cookie pattern:
 * 1. CSRF token stored in session and returned in response meta
 * 2. Client sends token in x-csrf-token header on state-changing requests
 * 3. Server validates header matches session token
 */
export const csrfProtection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Skip CSRF check for safe methods
    if (SAFE_METHODS.includes(req.method)) {
      return next();
    }

    // Skip CSRF check for unauthenticated requests (login, register, etc.)
    if (!req.user) {
      return next();
    }

    // Get CSRF token from header
    const csrfToken = req.headers[CSRF_HEADER] as string;
    if (!csrfToken) {
      throw Errors.forbidden('CSRF token required');
    }

    // Get session to validate CSRF token
    const session = await prisma.session.findUnique({
      where: { id: req.user.sessionId },
    });

    if (!session) {
      throw Errors.forbidden('Session not found');
    }

    // Validate CSRF token matches session
    if (session.csrfToken !== csrfToken) {
      throw Errors.forbidden('Invalid CSRF token');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * CSRF token cookie middleware
 * Sets CSRF token as a non-HTTP-only cookie for JavaScript access
 */
export const setCsrfCookie = (csrfToken: string, res: Response): void => {
  res.cookie(CSRF_COOKIE, csrfToken, {
    httpOnly: false, // JS needs to read this
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    path: '/',
  });
};
