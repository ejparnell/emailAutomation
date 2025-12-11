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
                    if (options?.failureRedirect) {
                        if (req.query.error) {
                            return res.redirect(options.failureRedirect);
                        }
                        return res.redirect(options.successRedirect);
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

describe('Auth Routes', () => {
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

    describe('Public Routes', () => {
        describe('GET /auth/google', () => {
            it('should redirect to Google OAuth', async () => {
                const response = await request(app).get('/auth/google');

                expect(response.status).toBe(302);
            });

            it('should not allow POST requests', async () => {
                const response = await request(app).post('/auth/google');

                expect(response.status).toBe(404);
            });
        });

        describe('GET /auth/google/callback', () => {
            it('should handle OAuth callback and redirect', async () => {
                const response = await request(app).get('/auth/google/callback');

                expect(response.status).toBe(302);
                expect(
                    response.headers.location === '/auth/success' ||
                        response.headers.location === '/auth/failure'
                ).toBe(true);
            });

            it('should not allow POST requests', async () => {
                const response = await request(app).post('/auth/google/callback');

                expect(response.status).toBe(404);
            });
        });

        describe('GET /auth/success', () => {
            it('should return 302 redirect when no user in session', async () => {
                const response = await request(app).get('/auth/success');

                expect(response.status).toBe(302);
                expect(response.headers.location).toBe('/auth/failure');
            });

            it('should return user data when authenticated', async () => {
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
                    next();
                });
                app.use('/auth', authRoutes);

                const response = await request(app).get('/auth/success');

                expect(response.status).toBe(200);
                expect(response.body).toEqual({
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
            });
        });

        describe('GET /auth/failure', () => {
            it('should return 401 authentication failed', async () => {
                const response = await request(app).get('/auth/failure');

                expect(response.status).toBe(401);
                expect(response.body).toEqual({
                    success: false,
                    message: 'Authentication failed',
                });
            });

            it('should not allow POST requests', async () => {
                const response = await request(app).post('/auth/failure');

                expect(response.status).toBe(404);
            });
        });
    });

    describe('Protected Routes', () => {
        describe('GET /auth/user', () => {
            it('should return 401 when not authenticated', async () => {
                const response = await request(app).get('/auth/user');

                expect(response.status).toBe(401);
                expect(response.body).toEqual({
                    success: false,
                    message: 'Authentication required',
                });
            });

            it('should return user data when authenticated', async () => {
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
                    next();
                });
                app.use('/auth', authRoutes);

                const response = await request(app).get('/auth/user');

                expect(response.status).toBe(200);
                expect(response.body).toEqual({
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

            it('should not allow POST requests', async () => {
                const response = await request(app).post('/auth/user');

                expect(response.status).toBe(404);
            });

            it('should verify requireUser middleware is applied', async () => {
                const response = await request(app).get('/auth/user');

                expect(response.status).toBe(401);
                expect(response.body.message).toBe('Authentication required');
            });
        });

        describe('GET /auth/logout', () => {
            it('should logout authenticated user', async () => {
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
                        req.user = undefined;
                        callback();
                    }) as any;
                    next();
                });
                app.use('/auth', authRoutes);

                const response = await request(app).get('/auth/logout');

                expect(response.status).toBe(200);
                expect(response.body).toEqual({
                    success: true,
                    message: 'Logged out successfully',
                });
            });

            it('should handle logout when not authenticated', async () => {
                const response = await request(app).get('/auth/logout');

                expect(response.status).toBe(200);
                expect(response.body).toEqual({
                    success: true,
                    message: 'Logged out successfully',
                });
            });

            it('should not allow POST requests', async () => {
                const response = await request(app).post('/auth/logout');

                expect(response.status).toBe(404);
            });
        });
    });

    describe('Route Method Restrictions', () => {
        it('should only accept GET requests for all routes', async () => {
            const routes = [
                '/auth/google',
                '/auth/google/callback',
                '/auth/success',
                '/auth/failure',
                '/auth/logout',
                '/auth/user',
            ];

            for (const route of routes) {
                const postResponse = await request(app).post(route);
                expect(postResponse.status).toBe(404);

                const putResponse = await request(app).put(route);
                expect(putResponse.status).toBe(404);

                const deleteResponse = await request(app).delete(route);
                expect(deleteResponse.status).toBe(404);

                const patchResponse = await request(app).patch(route);
                expect(patchResponse.status).toBe(404);
            }
        });
    });

    describe('Route Configuration', () => {
        it('should mount all routes under /auth prefix', async () => {
            const routes = [
                '/auth/google',
                '/auth/google/callback',
                '/auth/success',
                '/auth/failure',
                '/auth/logout',
                '/auth/user',
            ];

            for (const route of routes) {
                const response = await request(app).get(route);
                expect(response.status).not.toBe(404);
            }
        });

        it('should return 404 for non-existent auth routes', async () => {
            const response = await request(app).get('/auth/nonexistent');

            expect(response.status).toBe(404);
        });
    });
});
