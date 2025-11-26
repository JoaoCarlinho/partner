import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, hashToken, JwtPayload } from '../lib/tokens.js';
import { prisma } from '../lib/prisma.js';
import { Errors } from '../lib/errors.js';
import { Role } from '@steno/shared';

// Extend Express Request to include user context
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        organizationId: string;
        role: Role;
        email: string;
        sessionId: string;
      };
    }
  }
}

const COOKIE_NAME = 'steno_token';

/**
 * Extract JWT from cookie or Authorization header
 */
function extractToken(req: Request): string | null {
  // First try cookie
  const cookieToken = req.cookies?.[COOKIE_NAME];
  if (cookieToken) {
    return cookieToken;
  }

  // Then try Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Authentication middleware
 * Validates JWT token and attaches user context to request
 *
 * AC1: Login with email/password validates credentials correctly (validates JWT)
 * AC2: JWT token generated with claims: sub (user_id), org_id, role, exp
 * AC3: HTTP-only secure cookies used for token storage
 * AC5: Logout clears session and invalidates tokens (session validation)
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (!token) {
      throw Errors.unauthorized('Authentication required');
    }

    // Verify JWT signature and expiration (AC2)
    let payload: JwtPayload;
    try {
      payload = verifyAccessToken(token);
    } catch (jwtError) {
      throw Errors.unauthorized('Invalid or expired token');
    }

    // Validate session exists in database (AC5 - can be invalidated on logout)
    const tokenHash = hashToken(token);
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session) {
      throw Errors.unauthorized('Session not found or has been invalidated');
    }

    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await prisma.session.delete({ where: { id: session.id } });
      throw Errors.unauthorized('Session has expired');
    }

    // Verify user still exists and matches JWT
    if (!session.user || session.user.id !== payload.sub) {
      throw Errors.unauthorized('Session user mismatch');
    }

    // Attach user context to request
    req.user = {
      id: session.user.id,
      organizationId: session.user.organizationId,
      role: session.user.role as Role,
      email: session.user.email,
      sessionId: session.id,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware
 * Attaches user context if valid token present, but doesn't require it
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (!token) {
      return next();
    }

    // Try to verify and attach user context
    let payload: JwtPayload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return next();
    }

    const tokenHash = hashToken(token);
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (session && session.user && session.expiresAt > new Date()) {
      req.user = {
        id: session.user.id,
        organizationId: session.user.organizationId,
        role: session.user.role as Role,
        email: session.user.email,
        sessionId: session.id,
      };
    }

    next();
  } catch {
    // Ignore errors for optional auth
    next();
  }
};
