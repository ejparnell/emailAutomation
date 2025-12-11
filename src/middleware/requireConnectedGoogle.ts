import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/user.model';
import Logger from '../utils/logger';

/**
 * Require Connected Google Middleware
 *
 * Ensures that the authenticated user has connected their Google account
 * and has valid OAuth tokens for Gmail access.
 *
 * This is required for any routes that need to access Gmail API on behalf of the user.
 *
 * Must be used after requireUser middleware.
 *
 * @returns 403 if user hasn't connected Google account
 *
 * @example
 * router.get('/emails', requireUser, requireConnectedGoogle, getEmails)
 * router.post('/send-email', requireUser, requireConnectedGoogle, sendEmail)
 */
export const requireConnectedGoogle = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const user = req.user as IUser;

    if (!user) {
        Logger.error(
            'requireConnectedGoogle middleware called without user. Ensure requireUser runs first.'
        );
        res.status(401).json({
            success: false,
            message: 'Authentication required',
        });
        return;
    }

    if (!user.googleAccessToken) {
        Logger.warn(
            `Google connection required: ${user.email} attempted to access ${req.method} ${req.path} without Google connection`
        );
        res.status(403).json({
            success: false,
            message:
                'Google account connection required. Please connect your Google account to access Gmail features.',
            code: 'GOOGLE_NOT_CONNECTED',
        });
        return;
    }

    Logger.debug(
        `Google connection verified: ${user.email} -> ${req.method} ${req.path}`
    );
    next();
};
