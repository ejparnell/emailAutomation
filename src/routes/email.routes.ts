import { Router } from 'express';
import * as emailController from '../controllers/email.controller';
import { requireUser } from '../middleware/requireUser';
import { requireConnectedGoogle } from '../middleware/requireConnectedGoogle';
import { apiRateLimiter } from '../middleware/rateLimiter';

/**
 * Email Routes
 *
 * Routes for Gmail email retrieval.
 * All routes require authenticated users with connected Google accounts.
 * Protected by API rate limiter (200 requests per 15 minutes).
 */

const router = Router();

/**
 * GET /api/emails
 *
 * Retrieve emails with optional filters.
 *
 * Query Parameters:
 * - isRead: 'true' | 'false' - Filter by read/unread status
 * - timeRange: 'hours' | 'days' | 'weeks' | 'months' - Time range unit
 * - timeValue: number - Number of time range units to look back
 * - maxResults: number - Maximum emails to return (default: 50, max: 500)
 *
 * Examples:
 * - GET /api/emails?isRead=false - Get all unread emails
 * - GET /api/emails?timeRange=days&timeValue=7 - Get emails from last 7 days
 * - GET /api/emails?isRead=true&timeRange=hours&timeValue=24 - Get read emails from last 24 hours
 * - GET /api/emails?maxResults=100 - Get up to 100 emails
 *
 * Requires:
 * - Authenticated user (requireUser)
 * - Connected Google account with valid tokens (requireConnectedGoogle)
 * - API rate limit: 200 requests per 15 minutes
 *
 * Returns:
 * 200 OK:
 * {
 *   success: true,
 *   count: number,
 *   filters: EmailFilters,
 *   emails: EmailMessage[]
 * }
 *
 * 401 Unauthorized:
 * - User not authenticated
 * - Google tokens expired or invalid
 *
 * 400 Bad Request:
 * - Invalid query parameters
 *
 * 429 Too Many Requests:
 * - Rate limit exceeded
 *
 * 500 Internal Server Error:
 * - Gmail API error
 */
router.get(
    '/',
    apiRateLimiter,
    requireUser,
    requireConnectedGoogle,
    emailController.getEmails
);

/**
 * GET /api/emails/:id
 *
 * Retrieve a single email by ID.
 *
 * Path Parameters:
 * - id: string - Gmail message ID
 *
 * Requires:
 * - Authenticated user (requireUser)
 * - Connected Google account with valid tokens (requireConnectedGoogle)
 * - API rate limit: 200 requests per 15 minutes
 *
 * Returns:
 * 200 OK:
 * {
 *   success: true,
 *   email: EmailMessage
 * }
 *
 * 401 Unauthorized:
 * - User not authenticated
 * - Google tokens expired or invalid
 *
 * 404 Not Found:
 * - Email with specified ID not found
 *
 * 429 Too Many Requests:
 * - Rate limit exceeded
 *
 * 500 Internal Server Error:
 * - Gmail API error
 */
router.get(
    '/:id',
    apiRateLimiter,
    requireUser,
    requireConnectedGoogle,
    emailController.getEmailById
);

export default router;
