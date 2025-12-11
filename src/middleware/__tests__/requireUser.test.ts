import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireUser } from '../requireUser';
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
 * requireUser Middleware Tests
 * Tests our authentication check logic (not Passport OAuth flow)
 */
describe('requireUser Middleware', () => {
    let mockReq: any;
    let mockRes: any;
    let mockNext: NextFunction;

    beforeEach(() => {
        vi.clearAllMocks();

        const jsonMock = vi.fn();
        const statusMock = vi.fn().mockReturnValue({ json: jsonMock });

        mockReq = {
            method: 'GET',
            path: '/api/test',
            isAuthenticated: vi.fn(),
        };

        mockRes = {
            status: statusMock,
            json: jsonMock,
        };

        mockNext = vi.fn();
    });

    describe('Authenticated Requests', () => {
        it('should allow authenticated user with valid session', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                name: 'Test User',
                roles: ['USER'],
            };

            mockReq.isAuthenticated = vi.fn().mockReturnValue(true);
            mockReq.user = mockUser as IUser;

            requireUser(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
            expect(mockRes.status).not.toHaveBeenCalled();
            expect(mockRes.json).not.toHaveBeenCalled();
            expect(Logger.debug).toHaveBeenCalledWith(
                expect.stringContaining('Authenticated request: user@example.com')
            );
        });

        it('should allow admin user', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'admin@example.com',
                name: 'Admin User',
                roles: ['USER', 'ADMIN'],
            };

            mockReq.isAuthenticated = vi.fn().mockReturnValue(true);
            mockReq.user = mockUser as IUser;

            requireUser(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
            expect(mockRes.status).not.toHaveBeenCalled();
        });

        it('should log request method and path', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                name: 'Test User',
                roles: ['USER'],
            };

            mockReq.isAuthenticated = vi.fn().mockReturnValue(true);
            mockReq.user = mockUser as IUser;
            mockReq.method = 'POST';
            mockReq.path = '/api/emails/send';

            requireUser(mockReq as Request, mockRes as Response, mockNext);

            expect(Logger.debug).toHaveBeenCalledWith(
                'Authenticated request: user@example.com -> POST /api/emails/send'
            );
        });
    });

    describe('Unauthenticated Requests', () => {
        it('should reject request when user is not authenticated', () => {
            mockReq.isAuthenticated = vi.fn().mockReturnValue(false);
            mockReq.user = undefined;

            requireUser(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Authentication required',
            });
        });

        it('should reject when isAuthenticated returns true but user is missing', () => {
            mockReq.isAuthenticated = vi.fn().mockReturnValue(true);
            mockReq.user = undefined;

            requireUser(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Authentication required',
            });
        });

        it('should reject when isAuthenticated returns false even with user object', () => {
            mockReq.isAuthenticated = vi.fn().mockReturnValue(false);
            mockReq.user = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
            } as IUser;

            requireUser(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(401);
        });

        it('should log warning on unauthenticated access attempt', () => {
            mockReq.isAuthenticated = vi.fn().mockReturnValue(false);
            mockReq.method = 'GET';
            mockReq.path = '/api/protected';

            requireUser(mockReq as Request, mockRes as Response, mockNext);

            expect(Logger.warn).toHaveBeenCalledWith(
                'Unauthenticated access attempt to GET /api/protected'
            );
        });
    });

    describe('Response Format', () => {
        it('should return correct JSON structure on rejection', () => {
            mockReq.isAuthenticated = vi.fn().mockReturnValue(false);

            requireUser(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Authentication required',
            });
        });

        it('should set 401 status code on rejection', () => {
            mockReq.isAuthenticated = vi.fn().mockReturnValue(false);

            requireUser(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
        });

        it('should not modify response on success', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                name: 'Test User',
                roles: ['USER'],
            };

            mockReq.isAuthenticated = vi.fn().mockReturnValue(true);
            mockReq.user = mockUser as IUser;

            requireUser(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).not.toHaveBeenCalled();
            expect(mockRes.json).not.toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        it('should handle null user', () => {
            mockReq.isAuthenticated = vi.fn().mockReturnValue(false);
            mockReq.user = null as any;

            requireUser(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(401);
        });

        it('should handle user with minimal data', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'minimal@example.com',
                roles: ['USER'],
            } as IUser;

            mockReq.isAuthenticated = vi.fn().mockReturnValue(true);
            mockReq.user = mockUser as IUser;

            requireUser(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
        });

        it('should handle multiple rapid calls', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                roles: ['USER'],
            } as IUser;

            mockReq.isAuthenticated = vi.fn().mockReturnValue(true);
            mockReq.user = mockUser as IUser;

            requireUser(mockReq as Request, mockRes as Response, mockNext);
            requireUser(mockReq as Request, mockRes as Response, mockNext);
            requireUser(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledTimes(3);
        });

        it('should handle request without method or path', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                roles: ['USER'],
            } as IUser;

            mockReq.isAuthenticated = vi.fn().mockReturnValue(true);
            mockReq.user = mockUser as IUser;
            mockReq.method = undefined;
            mockReq.path = undefined;

            requireUser(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
        });
    });
});
