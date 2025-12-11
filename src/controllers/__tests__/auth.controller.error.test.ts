import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { authSuccess, authFailure, logout, getCurrentUser } from '../auth.controller';
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

describe('Auth Controller - Error Handling', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

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
            logout: vi.fn() as any,
        };

        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
            redirect: vi.fn().mockReturnThis(),
        };
    });

    describe('authSuccess - Error Scenarios', () => {
        it('should handle missing user gracefully', () => {
            mockRequest.user = undefined;

            authSuccess(mockRequest as Request, mockResponse as Response);

            expect(Logger.warn).toHaveBeenCalledWith(
                'Auth success called but no user in session'
            );
            expect(mockResponse.redirect).toHaveBeenCalledWith('/auth/failure');
        });

        it('should handle user with missing email', () => {
            const invalidUser = createMockUser({ email: '' as any });
            mockRequest.user = invalidUser;

            authSuccess(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    user: expect.objectContaining({
                        email: '',
                    }),
                })
            );
        });

        it('should handle user with missing name', () => {
            const userWithoutName = createMockUser({ name: '' as any });
            mockRequest.user = userWithoutName;

            authSuccess(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    user: expect.objectContaining({
                        name: '',
                    }),
                })
            );
        });

        it('should handle user with null _id', () => {
            const userWithNullId = createMockUser({ _id: null as any });
            mockRequest.user = userWithNullId;

            expect(() => {
                authSuccess(mockRequest as Request, mockResponse as Response);
            }).toThrow();
        });

        it('should handle user with missing roles', () => {
            const userWithoutRoles = createMockUser({ roles: undefined as any });
            mockRequest.user = userWithoutRoles;

            authSuccess(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    user: expect.objectContaining({
                        roles: undefined,
                    }),
                })
            );
        });
    });

    describe('authFailure - Error Scenarios', () => {
        it('should always return 401 regardless of request state', () => {
            authFailure(mockRequest as Request, mockResponse as Response);
            expect(mockResponse.status).toHaveBeenCalledWith(401);

            vi.clearAllMocks();
            mockRequest.user = createMockUser();
            authFailure(mockRequest as Request, mockResponse as Response);
            expect(mockResponse.status).toHaveBeenCalledWith(401);
        });

        it('should log failure even without user context', () => {
            mockRequest.user = undefined;

            authFailure(mockRequest as Request, mockResponse as Response);

            expect(Logger.warn).toHaveBeenCalledWith('Authentication failed');
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Authentication failed',
            });
        });
    });

    describe('logout - Error Scenarios', () => {
        it('should handle logout callback errors', () => {
            const mockUser = createMockUser();
            mockRequest.user = mockUser;

            const logoutError = new Error('Session destruction failed');
            (mockRequest.logout as any) = vi.fn((callback: (err?: any) => void) => {
                callback(logoutError);
            });

            logout(mockRequest as Request, mockResponse as Response);

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

        it('should handle database connection errors during logout', () => {
            const mockUser = createMockUser();
            mockRequest.user = mockUser;

            const dbError = new Error('Database connection lost');
            (mockRequest.logout as any) = vi.fn((callback: (err?: any) => void) => {
                callback(dbError);
            });

            logout(mockRequest as Request, mockResponse as Response);

            expect(Logger.error).toHaveBeenCalledWith('Error during logout:', dbError);
            expect(mockResponse.status).toHaveBeenCalledWith(500);
        });

        it('should handle network timeout during logout', () => {
            const mockUser = createMockUser();
            mockRequest.user = mockUser;

            const timeoutError = new Error('Session store timeout');
            (mockRequest.logout as any) = vi.fn((callback: (err?: any) => void) => {
                callback(timeoutError);
            });

            logout(mockRequest as Request, mockResponse as Response);

            expect(Logger.error).toHaveBeenCalledWith(
                'Error during logout:',
                timeoutError
            );
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Error logging out',
            });
        });

        it('should handle undefined user during logout gracefully', () => {
            mockRequest.user = undefined;
            (mockRequest.logout as any) = vi.fn((callback: (err?: any) => void) => {
                callback();
            });

            logout(mockRequest as Request, mockResponse as Response);

            expect(Logger.info).toHaveBeenCalledWith('User logged out: unknown');
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: 'Logged out successfully',
            });
        });

        it('should handle malformed user object during logout', () => {
            mockRequest.user = { email: null } as any;
            (mockRequest.logout as any) = vi.fn((callback: (err?: any) => void) => {
                callback();
            });

            logout(mockRequest as Request, mockResponse as Response);

            expect(Logger.info).toHaveBeenCalledWith('User logged out: unknown');
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });

    describe('getCurrentUser - Error Scenarios', () => {
        it('should return 401 when user is not in session', () => {
            mockRequest.user = undefined;

            getCurrentUser(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Not authenticated',
            });
        });

        it('should return 401 when user is null', () => {
            mockRequest.user = null as any;

            getCurrentUser(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
        });

        it('should handle user with invalid _id', () => {
            const userWithInvalidId = createMockUser({ _id: 'invalid-id' as any });
            mockRequest.user = userWithInvalidId;

            getCurrentUser(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    user: expect.objectContaining({
                        id: 'invalid-id',
                    }),
                })
            );
        });

        it('should return user even with missing optional fields', () => {
            const minimalUser = {
                _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
                email: 'test@example.com',
                name: 'Test',
                timeZone: 'UTC',
                roles: ['USER'],
            };
            mockRequest.user = minimalUser as any;

            getCurrentUser(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                user: {
                    id: '507f1f77bcf86cd799439011',
                    email: 'test@example.com',
                    name: 'Test',
                    timeZone: 'UTC',
                    roles: ['USER'],
                },
            });
        });
    });

    describe('Edge Cases and Unexpected Scenarios', () => {
        it('should handle empty user object in authSuccess', () => {
            mockRequest.user = {} as any;

            expect(() => {
                authSuccess(mockRequest as Request, mockResponse as Response);
            }).toThrow();
        });

        it('should handle response object errors in authSuccess', () => {
            const mockUser = createMockUser();
            mockRequest.user = mockUser;

            mockResponse.json = vi.fn().mockImplementation(() => {
                throw new Error('Response serialization failed');
            });

            expect(() => {
                authSuccess(mockRequest as Request, mockResponse as Response);
            }).toThrow('Response serialization failed');
        });

        it('should handle response status errors in authFailure', () => {
            mockResponse.status = vi.fn().mockImplementation(() => {
                throw new Error('Cannot set status');
            });

            expect(() => {
                authFailure(mockRequest as Request, mockResponse as Response);
            }).toThrow('Cannot set status');
        });

        it('should handle multiple logout calls', () => {
            const mockUser = createMockUser();
            mockRequest.user = mockUser;

            let callCount = 0;
            (mockRequest.logout as any) = vi.fn((callback: (err?: any) => void) => {
                callCount++;
                if (callCount > 1) {
                    callback(new Error('Already logged out'));
                } else {
                    callback();
                }
            });

            logout(mockRequest as Request, mockResponse as Response);
            expect(mockResponse.status).toHaveBeenCalledWith(200);

            vi.clearAllMocks();

            logout(mockRequest as Request, mockResponse as Response);
            expect(mockResponse.status).toHaveBeenCalledWith(500);
        });

        it('should handle very long email addresses', () => {
            const longEmail = 'a'.repeat(500) + '@example.com';
            const userWithLongEmail = createMockUser({ email: longEmail });
            mockRequest.user = userWithLongEmail;

            authSuccess(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(Logger.info).toHaveBeenCalledWith(
                `User authenticated successfully: ${longEmail}`
            );
        });

        it('should handle special characters in user data', () => {
            const specialUser = createMockUser({
                name: "Test<script>alert('xss')</script>",
                email: 'test+special@example.com',
            });
            mockRequest.user = specialUser;

            getCurrentUser(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                user: expect.objectContaining({
                    name: "Test<script>alert('xss')</script>",
                    email: 'test+special@example.com',
                }),
            });
        });

        it('should handle array of empty roles', () => {
            const userWithEmptyRoles = createMockUser({ roles: [] as any });
            mockRequest.user = userWithEmptyRoles;

            getCurrentUser(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    user: expect.objectContaining({
                        roles: [],
                    }),
                })
            );
        });
    });
});
