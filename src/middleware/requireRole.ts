import { Request, Response, NextFunction } from 'express';
import { IUser, Role } from '../models/user.model';
import Logger from '../utils/logger';

/**
 * Require Role Middleware
 *
 * Ensures that the authenticated user has one of the required roles.
 * Must be used after requireUser middleware.
 *
 * @param roles - Array of roles that are allowed to access the route
 * @returns 403 if user doesn't have required role
 *
 * @example
 * router.get('/admin', requireUser, requireRole('ADMIN'), adminController)
 * router.post('/users', requireUser, requireRole('ADMIN', 'USER'), createUser)
 */
export const requireRole = (...roles: Role[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const user = req.user as IUser;

        if (!user) {
            Logger.error(
                'requireRole middleware called without user. Ensure requireUser runs first.'
            );
            res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }

        const hasRequiredRole = user.roles.some((userRole) =>
            roles.includes(userRole)
        );

        if (!hasRequiredRole) {
            Logger.warn(
                `Authorization failed: ${user.email} attempted to access ${req.method} ${req.path} but lacks required role(s): ${roles.join(', ')}`
            );
            res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
            });
            return;
        }

        Logger.debug(
            `Authorization granted: ${user.email} has required role for ${req.method} ${req.path}`
        );
        next();
    };
};
