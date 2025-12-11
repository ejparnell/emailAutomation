import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
    authSuccess,
    authFailure,
    logout,
    getCurrentUser,
    isAuthenticated,
} from '../auth.controller';
import { IUser } from '../../models/user.model';
import Logger from '../../utils/logger';
import { Types } from 'mongoose';

vi.mock('../../utils/logger', () => ({
    default: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

describe('Auth Controller', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    const createMockUser = (overrides?: Partial<IUser>): Partial<IUser> => ({
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        email: 'test@example.com',
        name: 'Test User',
        timeZone: 'America/New_York',
        roles: ['USER'],
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    });

    beforeEach(() => {
        vi.clearAllMocks();

        mockRequest = {
            user: undefined,
            isAuthenticated: vi.fn() as any,
            logout: vi.fn() as any,
        };

        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
            redirect: vi.fn().mockReturnThis(),
        };

        mockNext = vi.fn();
    });

    describe('authSuccess', () => {
        it('should return user data when authentication is successful', () => {
            const mockUser = createMockUser();
            mockRequest.user = mockUser;

            authSuccess(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: 'Authentication successful',
                user: {
                    id: '507f1f77bcf86cd799439011',
                    email: 'test@example.com',
                    name: 'Test User',
                    timeZone: 'America/New_York',
                    roles: ['USER'],
                },
            });
            expect(Logger.info).toHaveBeenCalledWith(
                'User authenticated successfully: test@example.com'
            );
        });

        it('should include admin role if user is admin', () => {
            const mockAdmin = createMockUser({ roles: ['USER', 'ADMIN'] });
            mockRequest.user = mockAdmin;

            authSuccess(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: 'Authentication successful',
                user: expect.objectContaining({
                    roles: ['USER', 'ADMIN'],
                }),
            });
        });

        it('should redirect to failure if no user in session', () => {
            mockRequest.user = undefined;

            authSuccess(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(Logger.warn).toHaveBeenCalledWith(
                'Auth success called but no user in session'
            );
            expect(mockResponse.redirect).toHaveBeenCalledWith('/auth/failure');
        });

        it('should convert ObjectId to string in response', () => {
            const mockUser = createMockUser();
            mockRequest.user = mockUser;

            authSuccess(
                mockRequest as Request,
                mockResponse as Response
            );

            const responseCall = (mockResponse.json as any).mock.calls[0][0];
            expect(typeof responseCall.user.id).toBe('string');
            expect(responseCall.user.id).toBe('507f1f77bcf86cd799439011');
        });
    });

    describe('authFailure', () => {
        it('should return 401 with error message', () => {
            authFailure(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Authentication failed',
            });
        });

        it('should log authentication failure', () => {
            authFailure(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(Logger.warn).toHaveBeenCalledWith('Authentication failed');
        });
    });

    describe('logout', () => {
        it('should successfully logout authenticated user', () => {
            const mockUser = createMockUser();
            mockRequest.user = mockUser;
            (mockRequest.logout as any) = vi.fn((callback: (err?: any) => void) => {
                callback();
            });

            logout(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockRequest.logout).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: 'Logged out successfully',
            });
            expect(Logger.info).toHaveBeenCalledWith(
                'User logged out: test@example.com'
            );
        });

        it('should handle logout when user is undefined', () => {
            mockRequest.user = undefined;
            (mockRequest.logout as any) = vi.fn((callback: (err?: any) => void) => {
                callback();
            });

            logout(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockRequest.logout).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(Logger.info).toHaveBeenCalledWith('User logged out: unknown');
        });

        it('should handle logout errors', () => {
            const mockUser = createMockUser();
            mockRequest.user = mockUser;
            const logoutError = new Error('Session destruction failed');
            (mockRequest.logout as any) = vi.fn((callback: (err?: any) => void) => {
                callback(logoutError);
            });

            logout(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(Logger.error).toHaveBeenCalledWith(
                'Error during logout:',
                logoutError
            );
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Error logging out',
            });
        });
    });

    describe('getCurrentUser', () => {
        it('should return current user data when authenticated', () => {
            const mockUser = createMockUser();
            mockRequest.user = mockUser;

            getCurrentUser(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                user: {
                    id: '507f1f77bcf86cd799439011',
                    email: 'test@example.com',
                    name: 'Test User',
                    timeZone: 'America/New_York',
                    roles: ['USER'],
                },
            });
        });

        it('should return 401 when user is not authenticated', () => {
            mockRequest.user = undefined;

            getCurrentUser(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Not authenticated',
            });
        });

        it('should include all user roles in response', () => {
            const mockAdmin = createMockUser({ roles: ['USER', 'ADMIN'] });
            mockRequest.user = mockAdmin;

            getCurrentUser(
                mockRequest as Request,
                mockResponse as Response
            );

            const responseCall = (mockResponse.json as any).mock.calls[0][0];
            expect(responseCall.user.roles).toEqual(['USER', 'ADMIN']);
        });
    });

    describe('isAuthenticated (deprecated)', () => {
        it('should call next() when user is authenticated', () => {
            (mockRequest.isAuthenticated as any) = vi.fn().mockReturnValue(true);

            isAuthenticated(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockRequest.isAuthenticated).toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should return 401 when user is not authenticated', () => {
            (mockRequest.isAuthenticated as any) = vi.fn().mockReturnValue(false);

            isAuthenticated(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockRequest.isAuthenticated).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Authentication required',
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });
});
