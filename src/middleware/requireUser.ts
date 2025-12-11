import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/user.model';
import Logger from '../utils/logger';

/**
 * Require User Middleware
 *
 * Ensures that the request has an authenticated user.
 * Replaces the old isAuthenticated middleware with better typing.
 *
 * @returns 401 if user is not authenticated
 */
export const requireUser = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (!req.isAuthenticated() || !req.user) {
        Logger.warn(
            `Unauthenticated access attempt to ${req.method} ${req.path}`
        );
        res.status(401).json({
            success: false,
            message: 'Authentication required',
        });
        return;
    }

    const user = req.user as IUser;

    Logger.debug(
        `Authenticated request: ${user.email} -> ${req.method} ${req.path}`
    );

    next();
};
