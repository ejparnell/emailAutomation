import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { attachUserFromSession } from '../attachUserFromSession';
import { IUser } from '../../models/user.model';
import { Types } from 'mongoose';

/**
 * attachUserFromSession Middleware Tests
 * Tests our session user attachment logic (passthrough)
 */
describe('attachUserFromSession Middleware', () => {
    let mockReq: any;
    let mockRes: any;
    let mockNext: NextFunction;

    beforeEach(() => {
        vi.clearAllMocks();

        mockReq = {
            user: undefined,
        };

        mockRes = {};

        mockNext = vi.fn();
    });

    describe('User Attachment', () => {
        it('should call next when user is attached by Passport', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                name: 'Test User',
                roles: ['USER'],
            };

            mockReq.user = mockUser as IUser;

            attachUserFromSession(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
        });

        it('should call next when user is not in session', () => {
            mockReq.user = undefined;

            attachUserFromSession(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
        });

        it('should not modify the user object', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                name: 'Test User',
                roles: ['USER'],
            };

            mockReq.user = mockUser as IUser;

            const userBefore = { ...mockReq.user };

            attachUserFromSession(mockReq as Request, mockRes as Response, mockNext);

            expect(mockReq.user).toEqual(userBefore);
        });

        it('should not modify the response', () => {
            mockReq.user = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
            } as IUser;

            const resBefore = { ...mockRes };

            attachUserFromSession(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes).toEqual(resBefore);
        });
    });

    describe('Passthrough Behavior', () => {
        it('should always call next regardless of user presence', () => {
            const testCases = [
                { user: undefined, description: 'no user' },
                { user: null, description: 'null user' },
                {
                    user: {
                        _id: new Types.ObjectId(),
                        email: 'user@example.com',
                        roles: ['USER'],
                    } as IUser,
                    description: 'regular user',
                },
                {
                    user: {
                        _id: new Types.ObjectId(),
                        email: 'admin@example.com',
                        roles: ['USER', 'ADMIN'],
                    } as IUser,
                    description: 'admin user',
                },
            ];

            testCases.forEach(({ user }) => {
                vi.clearAllMocks();
                mockReq.user = user;

                attachUserFromSession(mockReq as Request, mockRes as Response, mockNext);

                expect(mockNext).toHaveBeenCalledOnce();
            });
        });

        it('should be middleware agnostic', () => {
            mockReq.user = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
            } as IUser;

            mockReq.method = 'POST';
            mockReq.path = '/api/test';
            mockReq.headers = { 'content-type': 'application/json' };

            attachUserFromSession(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
        });
    });

    describe('Future Extensibility', () => {
        it('should maintain user data for future processing', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                name: 'Test User',
                roles: ['USER'],
                googleAccessToken: 'token',
            };

            mockReq.user = mockUser as IUser;

            attachUserFromSession(mockReq as Request, mockRes as Response, mockNext);

            expect(mockReq.user).toBeDefined();
            expect(mockReq.user!.email).toBe('user@example.com');
            expect(mockReq.user!.googleAccessToken).toBe('token');
        });

        it('should preserve all user properties', () => {
            const mockUser: Partial<IUser> = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
                name: 'Full User',
                timeZone: 'America/New_York',
                roles: ['USER', 'ADMIN'],
                googleAccessToken: 'access-token',
                googleRefreshToken: 'refresh-token',
            };

            mockReq.user = mockUser as IUser;

            attachUserFromSession(mockReq as Request, mockRes as Response, mockNext);

            expect(mockReq.user).toMatchObject(mockUser);
        });
    });

    describe('Edge Cases', () => {
        it('should handle rapid sequential calls', () => {
            const mockUser = {
                _id: new Types.ObjectId(),
                email: 'user@example.com',
            } as IUser;

            mockReq.user = mockUser;

            attachUserFromSession(mockReq as Request, mockRes as Response, mockNext);
            attachUserFromSession(mockReq as Request, mockRes as Response, mockNext);
            attachUserFromSession(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledTimes(3);
        });

        it('should not throw errors with malformed requests', () => {
            mockReq = {};

            expect(() => {
                attachUserFromSession(mockReq as Request, mockRes as Response, mockNext);
            }).not.toThrow();

            expect(mockNext).toHaveBeenCalledOnce();
        });

        it('should handle empty user object', () => {
            mockReq.user = {} as IUser;

            attachUserFromSession(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
        });
    });
});
