import { Request, Response, NextFunction } from 'express';

/**
 * Attach User from Session Middleware
 *
 * This middleware runs on every request and attaches the authenticated user
 * from the session to req.user. Passport.js handles the session management.
 *
 * This is a global middleware that should run after passport.session()
 */
export const attachUserFromSession = (
    req: Request,
    _res: Response,
    next: NextFunction
): void => {
    // Passport automatically attaches user to req.user if session exists
    // This middleware is just a placeholder for any additional user processing
    // we might want to do in the future (e.g., loading additional user data)

    if (req.user) {
        // User is already attached by Passport
        // We can add additional processing here if needed
        // Example: You could fetch fresh user data from DB here
        // Example: You could add computed properties
        // For now, we just pass through
    }

    next();
};
