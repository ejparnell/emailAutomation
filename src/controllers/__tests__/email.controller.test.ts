import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import * as emailController from '../email.controller';
import * as gmailService from '../../services/gmail.service';
import { IUser } from '../../models/user.model';
import Logger from '../../utils/logger';

vi.mock('../../services/gmail.service');

vi.mock('../../utils/logger', () => ({
    default: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

describe('Email Controller', () => {
    const mockUser: Partial<IUser> = {
        _id: 'user123' as any,
        email: 'test@example.com',
        googleAccessToken: 'mock_token',
        googleRefreshToken: 'mock_refresh',
    };

    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let jsonMock: ReturnType<typeof vi.fn>;
    let statusMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();

        jsonMock = vi.fn();
        statusMock = vi.fn().mockReturnValue({ json: jsonMock });

        mockRequest = {
            user: mockUser as any,
            query: {},
            params: {},
        };

        mockResponse = {
            json: jsonMock,
            status: statusMock,
        };
    });

    describe('getEmails', () => {
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
                {
                    id: '2',
                    threadId: 'thread2',
                    subject: 'Test Email 2',
                    from: 'sender2@example.com',
                    to: ['recipient@example.com'],
                    date: new Date('2024-01-02'),
                    snippet: 'Test snippet 2',
                    body: 'Test body 2',
                    isRead: false,
                    labels: ['INBOX', 'UNREAD'],
                },
            ];

            vi.mocked(gmailService.getEmails).mockResolvedValue(mockEmails);

            await emailController.getEmails(mockRequest as Request, mockResponse as Response);

            expect(gmailService.getEmails).toHaveBeenCalledWith(mockUser, {});
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                count: 2,
                filters: {},
                emails: mockEmails,
            });
        });

        it('should apply isRead filter', async () => {
            mockRequest.query = { isRead: 'false' };
            vi.mocked(gmailService.getEmails).mockResolvedValue([]);

            await emailController.getEmails(mockRequest as Request, mockResponse as Response);

            expect(gmailService.getEmails).toHaveBeenCalledWith(mockUser, { isRead: false });
        });

        it('should apply time range filters', async () => {
            mockRequest.query = { timeRange: 'days', timeValue: '7' };
            vi.mocked(gmailService.getEmails).mockResolvedValue([]);

            await emailController.getEmails(mockRequest as Request, mockResponse as Response);

            expect(gmailService.getEmails).toHaveBeenCalledWith(mockUser, {
                timeRange: 'days',
                timeValue: 7,
            });
        });

        it('should apply maxResults filter', async () => {
            mockRequest.query = { maxResults: '100' };
            vi.mocked(gmailService.getEmails).mockResolvedValue([]);

            await emailController.getEmails(mockRequest as Request, mockResponse as Response);

            expect(gmailService.getEmails).toHaveBeenCalledWith(mockUser, { maxResults: 100 });
        });

        it('should combine multiple filters', async () => {
            mockRequest.query = {
                isRead: 'true',
                timeRange: 'hours',
                timeValue: '24',
                maxResults: '50',
            };
            vi.mocked(gmailService.getEmails).mockResolvedValue([]);

            await emailController.getEmails(mockRequest as Request, mockResponse as Response);

            expect(gmailService.getEmails).toHaveBeenCalledWith(mockUser, {
                isRead: true,
                timeRange: 'hours',
                timeValue: 24,
                maxResults: 50,
            });
        });

        it('should return 401 if user not authenticated', async () => {
            mockRequest.user = undefined;

            await emailController.getEmails(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'User not authenticated' });
        });

        it('should return 400 for invalid timeRange', async () => {
            mockRequest.query = { timeRange: 'invalid' };

            await emailController.getEmails(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Invalid timeRange. Must be one of: hours, days, weeks, months',
            });
        });

        it('should return 400 for invalid timeValue', async () => {
            mockRequest.query = { timeRange: 'days', timeValue: 'invalid' };

            await emailController.getEmails(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'timeValue must be a positive number' });
        });

        it('should return 400 for negative timeValue', async () => {
            mockRequest.query = { timeRange: 'days', timeValue: '-5' };

            await emailController.getEmails(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'timeValue must be a positive number' });
        });

        it('should return 400 for invalid maxResults', async () => {
            mockRequest.query = { maxResults: 'invalid' };

            await emailController.getEmails(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'maxResults must be between 1 and 500' });
        });

        it('should return 400 for maxResults > 500', async () => {
            mockRequest.query = { maxResults: '1000' };

            await emailController.getEmails(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'maxResults must be between 1 and 500' });
        });

        it('should return 400 if timeRange without timeValue', async () => {
            mockRequest.query = { timeRange: 'days' };

            await emailController.getEmails(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'timeValue is required when timeRange is specified',
            });
        });

        it('should return 400 if timeValue without timeRange', async () => {
            mockRequest.query = { timeValue: '7' };

            await emailController.getEmails(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'timeRange is required when timeValue is specified',
            });
        });

        it('should return 401 for expired Google tokens', async () => {
            vi.mocked(gmailService.getEmails).mockRejectedValue(new Error('invalid_grant'));

            await emailController.getEmails(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Google authentication expired. Please re-authenticate.',
                code: 'AUTH_EXPIRED',
            });
        });

        it('should return 500 for other errors', async () => {
            vi.mocked(gmailService.getEmails).mockRejectedValue(new Error('API Error'));

            await emailController.getEmails(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Failed to fetch emails',
                message: 'API Error',
            });
            expect(Logger.error).toHaveBeenCalled();
        });
    });

    describe('getEmailById', () => {
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

            mockRequest.params = { id: '123' };
            vi.mocked(gmailService.getEmailById).mockResolvedValue(mockEmail);

            await emailController.getEmailById(mockRequest as Request, mockResponse as Response);

            expect(gmailService.getEmailById).toHaveBeenCalledWith(mockUser, '123');
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                email: mockEmail,
            });
        });

        it('should return 401 if user not authenticated', async () => {
            mockRequest.user = undefined;
            mockRequest.params = { id: '123' };

            await emailController.getEmailById(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'User not authenticated' });
        });

        it('should return 400 if email ID missing', async () => {
            mockRequest.params = {};

            await emailController.getEmailById(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Email ID is required' });
        });

        it('should return 401 for expired Google tokens', async () => {
            mockRequest.params = { id: '123' };
            vi.mocked(gmailService.getEmailById).mockRejectedValue(new Error('Token expired'));

            await emailController.getEmailById(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Google authentication expired. Please re-authenticate.',
                code: 'AUTH_EXPIRED',
            });
        });

        it('should return 404 for not found errors', async () => {
            mockRequest.params = { id: '999' };
            vi.mocked(gmailService.getEmailById).mockRejectedValue(new Error('Not Found'));

            await emailController.getEmailById(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Email not found',
                message: 'Not Found',
            });
        });

        it('should return 500 for other errors', async () => {
            mockRequest.params = { id: '123' };
            vi.mocked(gmailService.getEmailById).mockRejectedValue(new Error('API Error'));

            await emailController.getEmailById(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Failed to fetch email',
                message: 'API Error',
            });
            expect(Logger.error).toHaveBeenCalled();
        });
    });
});
