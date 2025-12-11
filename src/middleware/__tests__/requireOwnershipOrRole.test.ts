import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireOwnershipOrRole } from '../requireOwnershipOrRole';
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
 * requireOwnershipOrRole Middleware Tests
 * Tests our ownership and role-based authorization logic
 */
describe('requireOwnershipOrRole Middleware', () => {
    let mockReq: any;
    let mockRes: any;
    let mockNext: NextFunction;

    beforeEach(() => {
        vi.clearAllMocks();

        const jsonMock = vi.fn();
        const statusMock = vi.fn().mockReturnValue({ json: jsonMock });

        mockReq = {
            method: 'GET',
            path: '/api/users/123',
            params: {},
            user: undefined,
        };

        mockRes = {
            status: statusMock,
            json: jsonMock,
        };

        mockNext = vi.fn();
    });

    describe('Ownership Checks', () => {
        it('should allow user to access their own resource', () => {
            const userId = new Types.ObjectId();
            const mockUser: Partial<IUser> = {
                _id: userId,
                email: 'user@example.com',
                name: 'User',
                roles: ['USER'],
            };

            mockReq.user = mockUser as IUser;
            mockReq.params = { userId: userId.toString() };

            const middleware = requireOwnershipOrRole('userId', 'ADMIN');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
            expect(mockRes.status).not.toHaveBeenCalled();
            expect(Logger.debug).toHaveBeenCalledWith(
                expect.stringContaining('owns resource')
            );
        });

        it('should reject user accessing another users resource without required role', () => {
            const userId = new Types.ObjectId();
            const otherUserId = new Types.ObjectId();
            const mockUser: Partial<IUser> = {
                _id: userId,
                email: 'user@example.com',
                roles: ['USER'],
            };

            mockReq.user = mockUser as IUser;
            mockReq.params = { userId: otherUserId.toString() };

            const middleware = requireOwnershipOrRole('userId', 'ADMIN');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Access denied',
            });
        });

        it('should work with different parameter names', () => {
            const userId = new Types.ObjectId();
            const mockUser: Partial<IUser> = {
                _id: userId,
                email: 'user@example.com',
                roles: ['USER'],
            };

            mockReq.user = mockUser as IUser;
            mockReq.params = { id: userId.toString() };

            const middleware = requireOwnershipOrRole('id', 'ADMIN');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
        });
    });

    describe('Role Bypass', () => {
        it('should allow admin to access any users resource', () => {
            const userId = new Types.ObjectId();
            const otherUserId = new Types.ObjectId();
            const mockUser: Partial<IUser> = {
                _id: userId,
                email: 'admin@example.com',
                roles: ['USER', 'ADMIN'],
            };

            mockReq.user = mockUser as IUser;
            mockReq.params = { userId: otherUserId.toString() };

            const middleware = requireOwnershipOrRole('userId', 'ADMIN');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
            expect(mockRes.status).not.toHaveBeenCalled();
            expect(Logger.debug).toHaveBeenCalledWith(
                expect.stringContaining('has role')
            );
        });

        it('should allow multiple roles to bypass ownership', () => {
            const userId = new Types.ObjectId();
            const otherUserId = new Types.ObjectId();
            const mockUser: Partial<IUser> = {
                _id: userId,
                email: 'admin@example.com',
                roles: ['ADMIN'],
            };

            mockReq.user = mockUser as IUser;
            mockReq.params = { userId: otherUserId.toString() };

            const middleware = requireOwnershipOrRole('userId', 'ADMIN');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
        });
    });

    describe('Error Handling', () => {
        it('should return 401 when user is missing', () => {
            mockReq.user = undefined;
            mockReq.params = { userId: '123' };

            const middleware = requireOwnershipOrRole('userId', 'ADMIN');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Authentication required',
            });
        });

        it('should return 400 when parameter is missing', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                roles: ['USER'],
            };

            mockReq.user = mockUser as IUser;
            mockReq.params = {};

            const middleware = requireOwnershipOrRole('userId', 'ADMIN');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid request',
            });
        });

        it('should log error when parameter not found', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                roles: ['USER'],
            };

            mockReq.user = mockUser as IUser;
            mockReq.params = { wrongParam: '123' };

            const middleware = requireOwnershipOrRole('userId', 'ADMIN');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(Logger.error).toHaveBeenCalledWith(
                expect.stringContaining("Parameter 'userId' not found in route")
            );
        });

        it('should log error when called without user', () => {
            mockReq.user = null;
            mockReq.params = { userId: '123' };

            const middleware = requireOwnershipOrRole('userId', 'ADMIN');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(Logger.error).toHaveBeenCalledWith(
                expect.stringContaining('requireOwnershipOrRole middleware called without user')
            );
        });
    });

    describe('Edge Cases', () => {
        it('should handle ObjectId comparison correctly', () => {
            const userId = new Types.ObjectId();
            const mockUser: Partial<IUser> = {
                _id: userId,
                email: 'user@example.com',
                roles: ['USER'],
            };

            mockReq.user = mockUser as IUser;
            mockReq.params = { userId: userId.toString() };

            const middleware = requireOwnershipOrRole('userId', 'ADMIN');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
        });

        it('should reject when neither owner nor has role', () => {
            const userId = new Types.ObjectId();
            const otherUserId = new Types.ObjectId();
            const mockUser: Partial<IUser> = {
                _id: userId,
                email: 'user@example.com',
                roles: ['USER'],
            };

            mockReq.user = mockUser as IUser;
            mockReq.params = { userId: otherUserId.toString() };

            const middleware = requireOwnershipOrRole('userId', 'ADMIN');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it('should log authorization failure with details', () => {
            const userId = new Types.ObjectId();
            const otherUserId = new Types.ObjectId();
            const mockUser: Partial<IUser> = {
                _id: userId,
                email: 'user@example.com',
                roles: ['USER'],
            };

            mockReq.user = mockUser as IUser;
            mockReq.params = { userId: otherUserId.toString() };
            mockReq.method = 'DELETE';
            mockReq.path = '/api/users/123';

            const middleware = requireOwnershipOrRole('userId', 'ADMIN');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(Logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Authorization failed: user@example.com')
            );
        });

        it('should handle user with role accessing their own resource', () => {
            const userId = new Types.ObjectId();
            const mockUser: Partial<IUser> = {
                _id: userId,
                email: 'admin@example.com',
                roles: ['USER', 'ADMIN'],
            };

            mockReq.user = mockUser as IUser;
            mockReq.params = { userId: userId.toString() };

            const middleware = requireOwnershipOrRole('userId', 'ADMIN');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
        });

        it('should work across different routes', () => {
            const userId = new Types.ObjectId();
            const mockUser: Partial<IUser> = {
                _id: userId,
                email: 'user@example.com',
                roles: ['USER'],
            };

            mockReq.user = mockUser as IUser;

            const testCases = [
                { paramName: 'userId', paramValue: userId.toString() },
                { paramName: 'id', paramValue: userId.toString() },
                { paramName: 'accountId', paramValue: userId.toString() },
            ];

            testCases.forEach(({ paramName, paramValue }) => {
                vi.clearAllMocks();
                mockReq.params = { [paramName]: paramValue };

                const middleware = requireOwnershipOrRole(paramName, 'ADMIN');
                middleware(mockReq as Request, mockRes as Response, mockNext);

                expect(mockNext).toHaveBeenCalledOnce();
            });
        });
    });
});
