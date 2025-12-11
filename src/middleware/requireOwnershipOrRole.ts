import { Request, Response, NextFunction } from 'express';
import { IUser, Role } from '../models/user.model';
import Logger from '../utils/logger';

/**
 * Require Ownership or Role Middleware
 *
 * Allows access if:
 * 1. The user is accessing their own resource (user ID matches param), OR
 * 2. The user has one of the specified roles (e.g., ADMIN)
 *
 * Common pattern: Allow users to access their own data, or admins to access any data.
 *
 * Must be used after requireUser middleware.
 *
 * @param paramName - The name of the route parameter containing the user ID (e.g., 'userId', 'id')
 * @param roles - Roles that can bypass ownership check (typically ['ADMIN'])
 * @returns 403 if user doesn't own the resource and lacks required role
 *
 * @example
 * User can update their own profile, or admin can update any profile
 * router.put('/users/:userId', requireUser, requireOwnershipOrRole('userId', 'ADMIN'), updateUser)
 *
 * User can view their own emails, or admin can view any emails
 * router.get('/users/:id/emails', requireUser, requireOwnershipOrRole('id', 'ADMIN'), getEmails)
 */
export const requireOwnershipOrRole = (paramName: string, ...roles: Role[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const user = req.user as IUser;

        if (!user) {
            Logger.error(
                'requireOwnershipOrRole middleware called without user. Ensure requireUser runs first.'
            );
            res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }

        const resourceUserId = req.params[paramName];

        if (!resourceUserId) {
            Logger.error(
                `requireOwnershipOrRole: Parameter '${paramName}' not found in route`
            );
            res.status(400).json({
                success: false,
                message: 'Invalid request',
            });
            return;
        }

        const isOwner = user._id.toString() === resourceUserId;

        const hasRequiredRole = user.roles.some((userRole) =>
            roles.includes(userRole)
        );

        if (isOwner || hasRequiredRole) {
            Logger.debug(
                `Authorization granted: ${user.email} ${isOwner ? 'owns resource' : `has role ${user.roles.join(', ')}`} for ${req.method} ${req.path}`
            );
            next();
            return;
        }

        Logger.warn(
            `Authorization failed: ${user.email} attempted to access ${req.method} ${req.path} (resource: ${resourceUserId}) without ownership or required role`
        );
        res.status(403).json({
            success: false,
            message: 'Access denied',
        });
    };
};
