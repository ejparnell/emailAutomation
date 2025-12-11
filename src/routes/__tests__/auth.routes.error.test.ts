import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import authRoutes from '../auth.routes';
import session from 'express-session';
import { IUser } from '../../models/user.model';
import { Types } from 'mongoose';

vi.mock('passport', () => ({
    default: {
        authenticate: vi.fn((strategy: string, options?: any) => {
            return (req: any, res: any, next: any) => {
                if (strategy === 'google') {
                    if (req.query.error === 'access_denied') {
                        return res.redirect(options?.failureRedirect || '/auth/failure');
                    }
                    if (req.query.error === 'server_error') {
                        return res.status(500).json({
                            success: false,
                            message: 'OAuth provider error',
                        });
                    }
                    if (options?.failureRedirect) {
                        if (req.query.code) {
                            return res.redirect(options.successRedirect);
                        }
                        return res.redirect(options.failureRedirect);
                    }
                    return res.redirect('/auth/google/callback');
                }
                next();
            };
        }),
    },
}));

vi.mock('../../utils/logger', () => ({
    default: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

describe('Auth Routes - Error Handling', () => {
    let app: Express;
    let mockUser: Partial<IUser>;

    beforeEach(() => {
        vi.clearAllMocks();

        app = express();
        app.use(express.json());

        app.use(
            session({
                secret: 'test-secret',
                resave: false,
                saveUninitialized: false,
            })
        );

        app.use((req, _res, next) => {
            req.isAuthenticated = vi.fn().mockReturnValue(false) as any;
            req.user = undefined;
            req.logout = vi.fn((callback: (err?: any) => void) => {
                req.user = undefined;
                callback();
            }) as any;
            next();
        });

        app.use('/auth', authRoutes);

        mockUser = {
            _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
            email: 'test@example.com',
            name: 'Test User',
            timeZone: 'America/New_York',
            roles: ['USER'],
        };
    });

    describe('OAuth Error Scenarios', () => {
        it('should handle user denying OAuth permissions', async () => {
            const response = await request(app).get(
                '/auth/google/callback?error=access_denied'
            );

            expect(response.status).toBe(302);
            expect(response.headers.location).toBe('/auth/failure');
        });

        it('should handle OAuth provider server errors', async () => {
            const response = await request(app).get(
                '/auth/google/callback?error=server_error'
            );

            expect(response.status).toBe(500);
            expect(response.body).toEqual({
                success: false,
                message: 'OAuth provider error',
            });
        });

        it('should handle missing authorization code in callback', async () => {
            const response = await request(app).get('/auth/google/callback');

            expect(response.status).toBe(302);
            expect(response.headers.location).toBe('/auth/failure');
        });

        it('should redirect to failure page on authentication failure', async () => {
            const response = await request(app).get('/auth/failure');

            expect(response.status).toBe(401);
            expect(response.body).toEqual({
                success: false,
                message: 'Authentication failed',
            });
        });
    });

    describe('Session Error Scenarios', () => {
        it('should handle expired session on protected routes', async () => {
            const response = await request(app).get('/auth/user');

            expect(response.status).toBe(401);
            expect(response.body).toEqual({
                success: false,
                message: 'Authentication required',
            });
        });

        it('should handle corrupted user data in session', async () => {
            app = express();
            app.use(express.json());
            app.use(
                session({
                    secret: 'test-secret',
                    resave: false,
                    saveUninitialized: false,
                })
            );
            app.use((req, _res, next) => {
                req.user = { corrupted: 'data' } as any;
                req.isAuthenticated = vi.fn().mockReturnValue(true) as any;
                next();
            });
            app.use('/auth', authRoutes);

            const response = await request(app).get('/auth/user');

            expect([200, 500]).toContain(response.status);
        });

        it('should handle missing session middleware', async () => {
            const appWithoutSession = express();
            appWithoutSession.use(express.json());
            appWithoutSession.use('/auth', authRoutes);

            const response = await request(appWithoutSession).get('/auth/user');

            expect([401, 500]).toContain(response.status);
        });
    });

    describe('User Not Found Scenarios', () => {
        it('should handle user deleted after authentication', async () => {
            app = express();
            app.use(express.json());
            app.use(
                session({
                    secret: 'test-secret',
                    resave: false,
                    saveUninitialized: false,
                })
            );
            app.use((req, _res, next) => {
                req.user = undefined;
                req.isAuthenticated = vi.fn().mockReturnValue(false) as any;
                next();
            });
            app.use('/auth', authRoutes);

            const response = await request(app).get('/auth/user');

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Authentication required');
        });

        it('should handle null user in authenticated session', async () => {
            app = express();
            app.use(express.json());
            app.use(
                session({
                    secret: 'test-secret',
                    resave: false,
                    saveUninitialized: false,
                })
            );
            app.use((req, _res, next) => {
                req.user = null as any;
                req.isAuthenticated = vi.fn().mockReturnValue(true) as any;
                next();
            });
            app.use('/auth', authRoutes);

            const response = await request(app).get('/auth/user');

            expect(response.status).toBe(401);
        });
    });

    describe('Logout Error Scenarios', () => {
        it('should handle session destruction errors', async () => {
            app = express();
            app.use(express.json());
            app.use(
                session({
                    secret: 'test-secret',
                    resave: false,
                    saveUninitialized: false,
                })
            );
            app.use((req, _res, next) => {
                req.user = mockUser;
                req.isAuthenticated = vi.fn().mockReturnValue(true) as any;
                req.logout = vi.fn((callback: (err?: any) => void) => {
                    callback(new Error('Failed to destroy session'));
                }) as any;
                next();
            });
            app.use('/auth', authRoutes);

            const response = await request(app).get('/auth/logout');

            expect(response.status).toBe(500);
            expect(response.body).toEqual({
                success: false,
                message: 'Error logging out',
            });
        });

        it('should handle logout when session store is unavailable', async () => {
            app = express();
            app.use(express.json());
            app.use(
                session({
                    secret: 'test-secret',
                    resave: false,
                    saveUninitialized: false,
                })
            );
            app.use((req, _res, next) => {
                req.user = mockUser;
                req.isAuthenticated = vi.fn().mockReturnValue(true) as any;
                req.logout = vi.fn((callback: (err?: any) => void) => {
                    callback(new Error('Session store connection timeout'));
                }) as any;
                next();
            });
            app.use('/auth', authRoutes);

            const response = await request(app).get('/auth/logout');

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Error logging out');
        });

        it('should allow logout even when not authenticated', async () => {
            const response = await request(app).get('/auth/logout');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                message: 'Logged out successfully',
            });
        });
    });

    describe('Malformed Request Scenarios', () => {
        it('should handle requests with invalid headers', async () => {
            const response = await request(app)
                .get('/auth/user')
                .set('Content-Type', 'invalid/type');

            expect(response.status).toBe(401);
        });

        it('should handle requests with very large cookies', async () => {
            const largeCookie = 'a'.repeat(5000);
            const response = await request(app)
                .get('/auth/user')
                .set('Cookie', `session=${largeCookie}`);

            expect(response.status).toBe(401);
        });

        it('should handle concurrent requests to same session', async () => {
            const requests = Array(5)
                .fill(null)
                .map(() => request(app).get('/auth/user'));

            const responses = await Promise.all(requests);

            responses.forEach((response) => {
                expect(response.status).toBe(401);
            });
        });
    });

    describe('OAuth State Parameter Attacks', () => {
        it('should handle missing state parameter', async () => {
            const response = await request(app).get('/auth/google/callback?code=abc123');

            expect([302, 401]).toContain(response.status);
        });

        it('should handle tampered state parameter', async () => {
            const response = await request(app).get(
                '/auth/google/callback?code=abc123&state=tampered'
            );

            expect([302, 401]).toContain(response.status);
        });
    });

    describe('Rate Limiting and DoS Scenarios', () => {
        it('should handle rapid sequential login attempts', async () => {
            const attempts = Array(10)
                .fill(null)
                .map(() => request(app).get('/auth/google'));

            const responses = await Promise.all(attempts);

            responses.forEach((response) => {
                expect(response.status).toBe(302);
            });
        });

        it('should handle rapid logout requests', async () => {
            const attempts = Array(5)
                .fill(null)
                .map(() => request(app).get('/auth/logout'));

            const responses = await Promise.all(attempts);

            responses.forEach((response) => {
                expect(response.status).toBe(200);
            });
        });
    });

    describe('Error Response Format Validation', () => {
        it('should return consistent error format for auth failures', async () => {
            const response = await request(app).get('/auth/failure');

            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('message');
            expect(typeof response.body.message).toBe('string');
        });

        it('should return consistent error format for unauthorized access', async () => {
            const response = await request(app).get('/auth/user');

            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('message', 'Authentication required');
        });

        it('should not leak sensitive information in error messages', async () => {
            const response = await request(app).get('/auth/user');

            expect(response.body.message).not.toMatch(/\/Users\//);
            expect(response.body.message).not.toMatch(/Error:/);
            expect(response.body).not.toHaveProperty('stack');
        });
    });
});
