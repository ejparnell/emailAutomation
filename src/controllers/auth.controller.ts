import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { IUser } from '../models/user.model';
import Logger from '../utils/logger';

/**
 * Auth Controller
 * Handles Google OAuth authentication flow
 */

/**
 * Initiate Google OAuth login
 * Redirects user to Google's OAuth consent screen
 */
export const googleLogin = passport.authenticate('google', {
    scope: ['profile', 'email'],
});

/**
 * Google OAuth callback handler
 * Called after user authorizes the app on Google
 */
export const googleCallback = [
    passport.authenticate('google', {
        failureRedirect: '/auth/failure',
        successRedirect: '/auth/success',
    }),
];

/**
 * OAuth success handler
 * Called after successful authentication
 */
export const authSuccess = (req: Request, res: Response): void => {
    if (!req.user) {
        Logger.warn('Auth success called but no user in session');
        res.redirect('/auth/failure');
        return;
    }

    const user = req.user as IUser;
    Logger.info(`User authenticated successfully: ${user.email}`);

    res.status(200).json({
        success: true,
        message: 'Authentication successful',
        user: {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            timeZone: user.timeZone,
        },
    });
};

/**
 * OAuth failure handler
 * Called when authentication fails
 */
export const authFailure = (_req: Request, res: Response): void => {
    Logger.warn('Authentication failed');
    res.status(401).json({
        success: false,
        message: 'Authentication failed',
    });
};

/**
 * Logout handler
 * Destroys user session and logs out
 */
export const logout = (req: Request, res: Response): void => {
    const user = req.user as IUser | undefined;
    const userEmail = user?.email || 'unknown';

    req.logout((err) => {
        if (err) {
            Logger.error('Error during logout:', err);
            res.status(500).json({
                success: false,
                message: 'Error logging out',
            });
            return;
        }

        Logger.info(`User logged out: ${userEmail}`);
        res.status(200).json({
            success: true,
            message: 'Logged out successfully',
        });
    });
};

/**
 * Get current user
 * Returns the currently authenticated user's information
 */
export const getCurrentUser = (req: Request, res: Response): void => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: 'Not authenticated',
        });
        return;
    }

    const user = req.user as IUser;
    res.status(200).json({
        success: true,
        user: {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            timeZone: user.timeZone,
        },
    });
};

/**
 * Middleware to check if user is authenticated
 */
export const isAuthenticated = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (req.isAuthenticated()) {
        return next();
    }

    res.status(401).json({
        success: false,
        message: 'Authentication required',
    });
};
