import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Application } from 'express';
import session from 'express-session';
import emailRoutes from '../email.routes';
import * as gmailService from '../../services/gmail.service';
import { IUser } from '../../models/user.model';

// Mock Gmail service
vi.mock('../../services/gmail.service');

// Mock rate limiter
vi.mock('../../middleware/rateLimiter', () => ({
    apiRateLimiter: (_req: any, _res: any, next: any) => next(),
}));

// Mock middleware
vi.mock('../../middleware/requireUser', () => ({
    requireUser: (req: any, res: any, next: any) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        next();
    },
}));

vi.mock('../../middleware/requireConnectedGoogle', () => ({
    requireConnectedGoogle: (req: any, res: any, next: any) => {
        if (!req.user.googleAccessToken) {
            return res.status(401).json({ error: 'Google account not connected' });
        }
        next();
    },
}));

describe('Email Routes', () => {
    let app: Application;

    const mockUser: Partial<IUser> = {
        _id: 'user123' as any,
        email: 'test@example.com',
        name: 'Test User',
        googleAccessToken: 'mock_token',
        googleRefreshToken: 'mock_refresh',
        roles: ['USER'],
    };

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

        // Mock authentication
        app.use((req, _res, next) => {
            req.user = mockUser as any;
            next();
        });

        app.use('/api/emails', emailRoutes);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('GET /api/emails', () => {
        it('should fetch emails successfully', async () => {
            const mockEmails = [
                {
                    id: '1',
                    threadId: 'thread1',
                    subject: 'Test Email 1',
                    from: 'sender1@example.com',
                    to: ['recipient@example.com'],
                    date: new Date('2024-01-01'),
                    snippet: 'Test snippet 1',
                    body: 'Test body 1',
                    isRead: true,
                    labels: ['INBOX'],
                },
            ];

            vi.mocked(gmailService.getEmails).mockResolvedValue(mockEmails);

            const response = await request(app).get('/api/emails').expect(200);

            expect(response.body).toEqual({
                success: true,
                count: 1,
                filters: {},
                emails: expect.arrayContaining([
                    expect.objectContaining({
                        id: '1',
                        subject: 'Test Email 1',
                    }),
                ]),
            });
        });

        it('should fetch unread emails', async () => {
            vi.mocked(gmailService.getEmails).mockResolvedValue([]);

            await request(app).get('/api/emails?isRead=false').expect(200);

            expect(gmailService.getEmails).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({ isRead: false })
            );
        });

        it('should fetch read emails', async () => {
            vi.mocked(gmailService.getEmails).mockResolvedValue([]);

            await request(app).get('/api/emails?isRead=true').expect(200);

            expect(gmailService.getEmails).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({ isRead: true })
            );
        });

        it('should fetch emails from last 24 hours', async () => {
            vi.mocked(gmailService.getEmails).mockResolvedValue([]);

            await request(app).get('/api/emails?timeRange=hours&timeValue=24').expect(200);

            expect(gmailService.getEmails).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    timeRange: 'hours',
                    timeValue: 24,
                })
            );
        });

        it('should fetch emails from last 7 days', async () => {
            vi.mocked(gmailService.getEmails).mockResolvedValue([]);

            await request(app).get('/api/emails?timeRange=days&timeValue=7').expect(200);

            expect(gmailService.getEmails).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    timeRange: 'days',
                    timeValue: 7,
                })
            );
        });

        it('should fetch emails from last 2 weeks', async () => {
            vi.mocked(gmailService.getEmails).mockResolvedValue([]);

            await request(app).get('/api/emails?timeRange=weeks&timeValue=2').expect(200);

            expect(gmailService.getEmails).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    timeRange: 'weeks',
                    timeValue: 2,
                })
            );
        });

        it('should fetch emails from last month', async () => {
            vi.mocked(gmailService.getEmails).mockResolvedValue([]);

            await request(app).get('/api/emails?timeRange=months&timeValue=1').expect(200);

            expect(gmailService.getEmails).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    timeRange: 'months',
                    timeValue: 1,
                })
            );
        });

        it('should limit results with maxResults', async () => {
            vi.mocked(gmailService.getEmails).mockResolvedValue([]);

            await request(app).get('/api/emails?maxResults=100').expect(200);

            expect(gmailService.getEmails).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({ maxResults: 100 })
            );
        });

        it('should combine multiple filters', async () => {
            vi.mocked(gmailService.getEmails).mockResolvedValue([]);

            await request(app)
                .get('/api/emails?isRead=true&timeRange=days&timeValue=7&maxResults=50')
                .expect(200);

            expect(gmailService.getEmails).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    isRead: true,
                    timeRange: 'days',
                    timeValue: 7,
                    maxResults: 50,
                })
            );
        });

        it('should return 400 for invalid timeRange', async () => {
            const response = await request(app)
                .get('/api/emails?timeRange=invalid&timeValue=7')
                .expect(400);

            expect(response.body).toEqual({
                error: 'Invalid timeRange. Must be one of: hours, days, weeks, months',
            });
        });

        it('should return 400 for invalid timeValue', async () => {
            const response = await request(app)
                .get('/api/emails?timeRange=days&timeValue=invalid')
                .expect(400);

            expect(response.body).toEqual({
                error: 'timeValue must be a positive number',
            });
        });

        it('should return 400 for invalid maxResults', async () => {
            const response = await request(app).get('/api/emails?maxResults=1000').expect(400);

            expect(response.body).toEqual({
                error: 'maxResults must be between 1 and 500',
            });
        });

        it('should return 400 if timeRange without timeValue', async () => {
            const response = await request(app).get('/api/emails?timeRange=days').expect(400);

            expect(response.body).toEqual({
                error: 'timeValue is required when timeRange is specified',
            });
        });

        it('should return 400 if timeValue without timeRange', async () => {
            const response = await request(app).get('/api/emails?timeValue=7').expect(400);

            expect(response.body).toEqual({
                error: 'timeRange is required when timeValue is specified',
            });
        });

        it('should handle service errors', async () => {
            vi.mocked(gmailService.getEmails).mockRejectedValue(new Error('Gmail API error'));

            const response = await request(app).get('/api/emails').expect(500);

            expect(response.body).toEqual({
                error: 'Failed to fetch emails',
                message: 'Gmail API error',
            });
        });

        it('should handle expired tokens', async () => {
            vi.mocked(gmailService.getEmails).mockRejectedValue(new Error('invalid_grant'));

            const response = await request(app).get('/api/emails').expect(401);

            expect(response.body).toEqual({
                error: 'Google authentication expired. Please re-authenticate.',
                code: 'AUTH_EXPIRED',
            });
        });
    });

    describe('GET /api/emails/:id', () => {
        it('should fetch email by ID successfully', async () => {
            const mockEmail = {
                id: '123',
                threadId: 'thread123',
                subject: 'Test Email',
                from: 'sender@example.com',
                to: ['recipient@example.com'],
                date: new Date('2024-01-01'),
                snippet: 'Test snippet',
                body: 'Test body',
                isRead: true,
                labels: ['INBOX'],
            };

            vi.mocked(gmailService.getEmailById).mockResolvedValue(mockEmail);

            const response = await request(app).get('/api/emails/123').expect(200);

            expect(response.body).toEqual({
                success: true,
                email: expect.objectContaining({
                    id: '123',
                    subject: 'Test Email',
                }),
            });

            expect(gmailService.getEmailById).toHaveBeenCalledWith(expect.any(Object), '123');
        });

        it('should return 404 for not found emails', async () => {
            vi.mocked(gmailService.getEmailById).mockRejectedValue(new Error('Not Found'));

            const response = await request(app).get('/api/emails/999').expect(404);

            expect(response.body).toEqual({
                error: 'Email not found',
                message: 'Not Found',
            });
        });

        it('should handle expired tokens', async () => {
            vi.mocked(gmailService.getEmailById).mockRejectedValue(new Error('Token expired'));

            const response = await request(app).get('/api/emails/123').expect(401);

            expect(response.body).toEqual({
                error: 'Google authentication expired. Please re-authenticate.',
                code: 'AUTH_EXPIRED',
            });
        });

        it('should handle service errors', async () => {
            vi.mocked(gmailService.getEmailById).mockRejectedValue(new Error('Gmail API error'));

            const response = await request(app).get('/api/emails/123').expect(500);

            expect(response.body).toEqual({
                error: 'Failed to fetch email',
                message: 'Gmail API error',
            });
        });
    });

    describe('Middleware Protection', () => {
        it('should require authentication', async () => {
            const unauthApp = express();
            unauthApp.use(express.json());
            unauthApp.use((req, _res, next) => {
                req.user = undefined;
                next();
            });
            unauthApp.use('/api/emails', emailRoutes);

            await request(unauthApp).get('/api/emails').expect(401);
        });

        it('should require Google connection', async () => {
            const noGoogleApp = express();
            noGoogleApp.use(express.json());
            noGoogleApp.use((req, _res, next) => {
                req.user = {
                    ...mockUser,
                    googleAccessToken: undefined,
                } as any;
                next();
            });
            noGoogleApp.use('/api/emails', emailRoutes);

            await request(noGoogleApp).get('/api/emails').expect(401);
        });
    });
});
