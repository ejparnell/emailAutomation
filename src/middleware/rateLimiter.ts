import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import Logger from '../utils/logger';

/**
 * Rateexport const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: 'API rate limit exceeded. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: shouldSkipRateLimit,
});ddleware
 *
 * Protects the application against brute force attacks by limiting
 * the number of requests from a single IP address.
 *
 * Multiple rate limiters are provided for different security levels:
 * - Strict: For authentication endpoints (login, OAuth callbacks)
 * - Standard: For general API endpoints
 * - Lenient: For public endpoints like health checks
 */

/**
 * Check if rate limiting should be skipped
 * Skip in test and development environments
 */
const shouldSkipRateLimit = (): boolean => {
    return process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
};

/**
 * Custom handler for rate limit exceeded
 */
const rateLimitHandler = (req: Request, res: Response): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    Logger.warn(
        `Rate limit exceeded: ${ip} -> ${req.method} ${req.path}`,
        {
            ip,
            method: req.method,
            path: req.path,
            userAgent: req.get('user-agent'),
        }
    );

    res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: res.getHeader('Retry-After'),
    });
};

/**
 * Strict Rate Limiter
 *
 * For authentication endpoints (login, OAuth callbacks, password reset)
 * Prevents brute force attacks on authentication.
 *
 * Limit: 5 requests per 15 minutes per IP
 *
 * @example
 * router.post('/login', strictRateLimiter, loginController)
 */
export const strictRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: shouldSkipRateLimit,
});

/**
 * Standard Rate Limiter
 *
 * For general API endpoints (CRUD operations, data fetching)
 * Prevents API abuse while allowing normal usage.
 *
 * Limit: 100 requests per 15 minutes per IP
 *
 * @example
 * router.get('/users', standardRateLimiter, getUsersController)
 */
export const standardRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: shouldSkipRateLimit,
});

/**
 * Lenient Rate Limiter
 *
 * For public endpoints (health checks, documentation, static assets)
 * Allows high traffic but still prevents DoS attacks.
 *
 * Limit: 1000 requests per 15 minutes per IP
 *
 * @example
 * router.get('/health', lenientRateLimiter, healthCheckController)
 */
export const lenientRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: 'Too many requests. Please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: shouldSkipRateLimit,
});

/**
 * Global Rate Limiter
 *
 * Applied to all routes as a baseline protection.
 * This is a safety net to prevent extreme abuse.
 *
 * Limit: 500 requests per 15 minutes per IP
 *
 * Use this as the default for all routes, then add stricter
 * limiters to specific routes as needed.
 */
export const globalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: 'Too many requests from this IP. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: shouldSkipRateLimit,
});

/**
 * API-specific Rate Limiter
 *
 * For API routes that need moderate protection.
 * This is useful for routes that are more resource-intensive
 * but not as critical as authentication.
 *
 * Limit: 200 requests per 15 minutes per IP
 */
export const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: 'Too many API requests. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: () => {
        return process.env.NODE_ENV === 'test';
    },
});
