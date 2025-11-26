import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../lib/response.js';
import { ErrorCode } from '../lib/errors.js';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

interface RateLimitConfig {
  windowMs: number;     // Time window in milliseconds
  maxRequests: number;  // Max requests per window
}

// In-memory store for rate limiting (per-instance in Lambda)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Default configuration
const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000,    // 1 minute
  maxRequests: 1000,      // 1000 requests per minute per org
};

/**
 * Clean up expired entries periodically
 */
function cleanupExpiredEntries(windowMs: number): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > windowMs) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every minute
setInterval(() => {
  cleanupExpiredEntries(DEFAULT_CONFIG.windowMs);
}, 60 * 1000);

/**
 * Get rate limit key from request
 * Uses organization ID if available, falls back to IP
 */
function getRateLimitKey(req: Request): string {
  // Use organization ID if authenticated
  if (req.user?.org_id) {
    return `org:${req.user.org_id}`;
  }

  // Fall back to IP address
  const forwarded = req.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;
  return `ip:${ip}`;
}

/**
 * Rate limiting middleware factory
 */
export function rateLimit(config: Partial<RateLimitConfig> = {}) {
  const { windowMs, maxRequests } = { ...DEFAULT_CONFIG, ...config };

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = getRateLimitKey(req);
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    // Create new entry if none exists or window has expired
    if (!entry || now - entry.windowStart >= windowMs) {
      entry = {
        count: 1,
        windowStart: now,
      };
      rateLimitStore.set(key, entry);
    } else {
      // Increment count
      entry.count++;
    }

    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetTime = Math.ceil((entry.windowStart + windowMs - now) / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime);

    // Check if rate limit exceeded
    if (entry.count > maxRequests) {
      res.setHeader('Retry-After', resetTime);
      res.status(429).json(
        errorResponse(
          ErrorCode.RATE_LIMITED,
          'Too many requests. Please try again later.',
          [{ retryAfter: resetTime }]
        )
      );
      return;
    }

    next();
  };
}

/**
 * Get current rate limit status (for testing)
 */
export function getRateLimitStatus(key: string): RateLimitEntry | undefined {
  return rateLimitStore.get(key);
}

/**
 * Clear rate limit store (for testing)
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}
