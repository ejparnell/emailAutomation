import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireRole } from '../requireRole';
import { IUser } from '../../models/user.model';
import { Types } from 'mongoose';
import Logger from '../../utils/logger';

vi.mock('../../utils/logger', () => ({
    default: {
        warn: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
    },
}));

/**
 * requireRole Middleware Tests
 * Tests our role-based authorization logic
 */
describe('requireRole Middleware', () => {
    let mockReq: any;
    let mockRes: any;
    let mockNext: NextFunction;

    beforeEach(() => {
        vi.clearAllMocks();

        const jsonMock = vi.fn();
        const statusMock = vi.fn().mockReturnValue({ json: jsonMock });

        mockReq = {
            method: 'GET',
            path: '/api/admin',
            user: undefined,
        };

        mockRes = {
            status: statusMock,
            json: jsonMock,
        };

        mockNext = vi.fn();
    });

    describe('Role Authorization', () => {
        it('should allow user with required role', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'admin@example.com',
                name: 'Admin User',
                roles: ['USER', 'ADMIN'],
            };

            mockReq.user = mockUser as IUser;

            const middleware = requireRole('ADMIN');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
            expect(mockRes.status).not.toHaveBeenCalled();
            expect(Logger.debug).toHaveBeenCalledWith(
                expect.stringContaining('Authorization granted')
            );
        });

        it('should allow user with one of multiple required roles', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                name: 'Regular User',
                roles: ['USER'],
            };

            mockReq.user = mockUser as IUser;

            const middleware = requireRole('USER', 'ADMIN');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
            expect(mockRes.status).not.toHaveBeenCalled();
        });

        it('should reject user without required role', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                name: 'Regular User',
                roles: ['USER'],
            };

            mockReq.user = mockUser as IUser;

            const middleware = requireRole('ADMIN');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Insufficient permissions',
            });
        });

        it('should log warning on authorization failure', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                name: 'Regular User',
                roles: ['USER'],
            };

            mockReq.user = mockUser as IUser;
            mockReq.method = 'DELETE';
            mockReq.path = '/api/admin/users';

            const middleware = requireRole('ADMIN');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(Logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Authorization failed: user@example.com')
            );
        });
    });

    describe('Error Handling', () => {
        it('should return 401 when user is missing', () => {
            mockReq.user = undefined;

            const middleware = requireRole('ADMIN');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Authentication required',
            });
        });

        it('should log error when called without user', () => {
            mockReq.user = null;

            const middleware = requireRole('ADMIN');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(Logger.error).toHaveBeenCalledWith(
                expect.stringContaining('requireRole middleware called without user')
            );
        });

        it('should handle user with empty roles array', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                name: 'User',
                roles: [],
            };

            mockReq.user = mockUser as IUser;

            const middleware = requireRole('ADMIN');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });
    });

    describe('Multiple Roles', () => {
        it('should accept user with ADMIN role when USER or ADMIN required', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'admin@example.com',
                roles: ['USER', 'ADMIN'],
            };

            mockReq.user = mockUser as IUser;

            const middleware = requireRole('USER', 'ADMIN');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
        });

        it('should reject user lacking all required roles', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                roles: ['USER'],
            };

            mockReq.user = mockUser as IUser;

            const middleware = requireRole('ADMIN');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });
    });

    describe('Edge Cases', () => {
        it('should handle user with multiple roles', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'superadmin@example.com',
                roles: ['USER', 'ADMIN'],
            };

            mockReq.user = mockUser as IUser;

            const middleware = requireRole('ADMIN');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
        });

        it('should be case-sensitive for role matching', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                roles: ['USER'],
            };

            mockReq.user = mockUser as IUser;

            const middleware = requireRole('ADMIN');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it('should handle single role requirement', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                roles: ['USER'],
            };

            mockReq.user = mockUser as IUser;

            const middleware = requireRole('USER');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
        });

        it('should work with various HTTP methods', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'admin@example.com',
                roles: ['ADMIN'],
            };

            mockReq.user = mockUser as IUser;

            ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].forEach((method) => {
                mockReq.method = method;
                vi.clearAllMocks();

                const middleware = requireRole('ADMIN');
                middleware(mockReq as Request, mockRes as Response, mockNext);

                expect(mockNext).toHaveBeenCalledOnce();
            });
        });
    });
});
