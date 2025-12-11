import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireConnectedGoogle } from '../requireConnectedGoogle';
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
 * requireConnectedGoogle Middleware Tests
 * Tests our Google OAuth token validation logic
 */
describe('requireConnectedGoogle Middleware', () => {
    let mockReq: any;
    let mockRes: any;
    let mockNext: NextFunction;

    beforeEach(() => {
        vi.clearAllMocks();

        const jsonMock = vi.fn();
        const statusMock = vi.fn().mockReturnValue({ json: jsonMock });

        mockReq = {
            method: 'GET',
            path: '/api/emails',
            user: undefined,
        };

        mockRes = {
            status: statusMock,
            json: jsonMock,
        };

        mockNext = vi.fn();
    });

    describe('Google Connection Validation', () => {
        it('should allow user with Google access token', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                name: 'User',
                roles: ['USER'],
                googleAccessToken: 'valid-access-token',
            };

            mockReq.user = mockUser as IUser;

            requireConnectedGoogle(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
            expect(mockRes.status).not.toHaveBeenCalled();
            expect(Logger.debug).toHaveBeenCalledWith(
                expect.stringContaining('Google connection verified')
            );
        });

        it('should reject user without Google access token', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                name: 'User',
                roles: ['USER'],
                googleAccessToken: undefined,
            };

            mockReq.user = mockUser as IUser;

            requireConnectedGoogle(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Google account connection required. Please connect your Google account to access Gmail features.',
                code: 'GOOGLE_NOT_CONNECTED',
            });
        });

        it('should log warning when Google connection is missing', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                roles: ['USER'],
            };

            mockReq.user = mockUser as IUser;
            mockReq.method = 'POST';
            mockReq.path = '/api/emails/send';

            requireConnectedGoogle(mockReq as Request, mockRes as Response, mockNext);

            expect(Logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Google connection required: user@example.com')
            );
        });
    });

    describe('Error Handling', () => {
        it('should return 401 when user is missing', () => {
            mockReq.user = undefined;

            requireConnectedGoogle(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Authentication required',
            });
        });

        it('should log error when called without user', () => {
            mockReq.user = null;

            requireConnectedGoogle(mockReq as Request, mockRes as Response, mockNext);

            expect(Logger.error).toHaveBeenCalledWith(
                expect.stringContaining('requireConnectedGoogle middleware called without user')
            );
        });

        it('should reject user with empty string token', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                roles: ['USER'],
                googleAccessToken: '',
            };

            mockReq.user = mockUser as IUser;

            requireConnectedGoogle(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it('should reject user with null token', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                roles: ['USER'],
                googleAccessToken: null as any,
            };

            mockReq.user = mockUser as IUser;

            requireConnectedGoogle(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });
    });

    describe('Response Format', () => {
        it('should return correct error response structure', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                roles: ['USER'],
            };

            mockReq.user = mockUser as IUser;

            requireConnectedGoogle(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Google account connection required. Please connect your Google account to access Gmail features.',
                code: 'GOOGLE_NOT_CONNECTED',
            });
        });

        it('should include GOOGLE_NOT_CONNECTED code in response', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                roles: ['USER'],
            };

            mockReq.user = mockUser as IUser;

            requireConnectedGoogle(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({ code: 'GOOGLE_NOT_CONNECTED' })
            );
        });
    });

    describe('Edge Cases', () => {
        it('should handle user with refresh token but no access token', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                roles: ['USER'],
                googleAccessToken: undefined,
                googleRefreshToken: 'refresh-token',
            };

            mockReq.user = mockUser as IUser;

            requireConnectedGoogle(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it('should allow user with both access and refresh tokens', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                roles: ['USER'],
                googleAccessToken: 'access-token',
                googleRefreshToken: 'refresh-token',
            };

            mockReq.user = mockUser as IUser;

            requireConnectedGoogle(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
        });

        it('should work for admin users with Google connection', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'admin@example.com',
                roles: ['USER', 'ADMIN'],
                googleAccessToken: 'admin-access-token',
            };

            mockReq.user = mockUser as IUser;

            requireConnectedGoogle(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
        });

        it('should reject admin users without Google connection', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'admin@example.com',
                roles: ['USER', 'ADMIN'],
            };

            mockReq.user = mockUser as IUser;

            requireConnectedGoogle(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it('should log correct path and method in debug message', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                roles: ['USER'],
                googleAccessToken: 'token',
            };

            mockReq.user = mockUser as IUser;
            mockReq.method = 'POST';
            mockReq.path = '/api/gmail/send';

            requireConnectedGoogle(mockReq as Request, mockRes as Response, mockNext);

            expect(Logger.debug).toHaveBeenCalledWith(
                'Google connection verified: user@example.com -> POST /api/gmail/send'
            );
        });
    });
});
