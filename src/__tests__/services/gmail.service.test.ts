import { describe, it, expect, vi, beforeEach } from 'vitest';
import { google } from 'googleapis';
import * as gmailService from '../../services/gmail.service';
import { IUser } from '../../models/user.model';
import Logger from '../../utils/logger';

// Mock googleapis
vi.mock('googleapis');

// Mock logger
vi.mock('../../utils/logger', () => ({
    default: {
        debug: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
    },
}));

describe('Gmail Service', () => {
    const mockUser: Partial<IUser> = {
        email: 'test@example.com',
        googleAccessToken: 'mock_access_token',
        googleRefreshToken: 'mock_refresh_token',
    };

    const mockOAuth2Client = {
        setCredentials: vi.fn(),
    };

    const mockGmailList = vi.fn();
    const mockGmailGet = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock OAuth2 constructor
        const MockOAuth2 = vi.fn().mockImplementation(() => mockOAuth2Client);
        (google.auth as any).OAuth2 = MockOAuth2;

        // Mock Gmail API
        vi.mocked(google.gmail).mockReturnValue({
            users: {
                messages: {
                    list: mockGmailList,
                    get: mockGmailGet,
                },
            },
        } as any);
    });

    describe('getEmails', () => {
        it('should fetch emails successfully', async () => {
            const mockMessages = [
                { id: '1', threadId: 'thread1' },
                { id: '2', threadId: 'thread2' },
            ];

            const mockMessageData1 = {
                data: {
                    id: '1',
                    threadId: 'thread1',
                    snippet: 'Test email 1',
                    labelIds: ['INBOX'],
                    payload: {
                        headers: [
                            { name: 'Subject', value: 'Test Subject 1' },
                            { name: 'From', value: 'sender1@example.com' },
                            { name: 'To', value: 'recipient@example.com' },
                            { name: 'Date', value: 'Mon, 1 Jan 2024 10:00:00 GMT' },
                        ],
                        body: { data: Buffer.from('Email body 1').toString('base64') },
                    },
                },
            };

            const mockMessageData2 = {
                data: {
                    id: '2',
                    threadId: 'thread2',
                    snippet: 'Test email 2',
                    labelIds: ['INBOX', 'UNREAD'],
                    payload: {
                        headers: [
                            { name: 'Subject', value: 'Test Subject 2' },
                            { name: 'From', value: 'sender2@example.com' },
                            { name: 'To', value: 'recipient@example.com' },
                            { name: 'Date', value: 'Tue, 2 Jan 2024 10:00:00 GMT' },
                        ],
                        body: { data: Buffer.from('Email body 2').toString('base64') },
                    },
                },
            };

            mockGmailList.mockResolvedValue({ data: { messages: mockMessages } });
            mockGmailGet.mockResolvedValueOnce(mockMessageData1).mockResolvedValueOnce(mockMessageData2);

            const emails = await gmailService.getEmails(mockUser as IUser);

            expect(emails).toHaveLength(2);
            expect(emails[0].id).toBe('1');
            expect(emails[0].subject).toBe('Test Subject 1');
            expect(emails[0].from).toBe('sender1@example.com');
            expect(emails[0].body).toBe('Email body 1');
            expect(emails[0].isRead).toBe(true);

            expect(emails[1].id).toBe('2');
            expect(emails[1].subject).toBe('Test Subject 2');
            expect(emails[1].isRead).toBe(false);

            expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
                access_token: 'mock_access_token',
                refresh_token: 'mock_refresh_token',
            });
        });

        it('should handle empty results', async () => {
            mockGmailList.mockResolvedValue({ data: { messages: [] } });

            const emails = await gmailService.getEmails(mockUser as IUser);

            expect(emails).toHaveLength(0);
            expect(Logger.info).toHaveBeenCalledWith(
                expect.stringContaining('No emails found'),
                expect.anything()
            );
        });

        it('should apply read filter', async () => {
            mockGmailList.mockResolvedValue({ data: { messages: [] } });

            await gmailService.getEmails(mockUser as IUser, { isRead: false });

            expect(mockGmailList).toHaveBeenCalledWith({
                userId: 'me',
                q: 'is:unread',
                maxResults: 50,
            });
        });

        it('should apply time range filter - hours', async () => {
            mockGmailList.mockResolvedValue({ data: { messages: [] } });

            await gmailService.getEmails(mockUser as IUser, {
                timeRange: 'hours',
                timeValue: 24,
            });

            expect(mockGmailList).toHaveBeenCalledWith(
                expect.objectContaining({
                    q: expect.stringMatching(/after:\d{4}\/\d{2}\/\d{2}/),
                })
            );
        });

        it('should apply time range filter - days', async () => {
            mockGmailList.mockResolvedValue({ data: { messages: [] } });

            await gmailService.getEmails(mockUser as IUser, {
                timeRange: 'days',
                timeValue: 7,
            });

            expect(mockGmailList).toHaveBeenCalledWith(
                expect.objectContaining({
                    q: expect.stringMatching(/after:\d{4}\/\d{2}\/\d{2}/),
                })
            );
        });

        it('should apply time range filter - weeks', async () => {
            mockGmailList.mockResolvedValue({ data: { messages: [] } });

            await gmailService.getEmails(mockUser as IUser, {
                timeRange: 'weeks',
                timeValue: 2,
            });

            expect(mockGmailList).toHaveBeenCalledWith(
                expect.objectContaining({
                    q: expect.stringMatching(/after:\d{4}\/\d{2}\/\d{2}/),
                })
            );
        });

        it('should apply time range filter - months', async () => {
            mockGmailList.mockResolvedValue({ data: { messages: [] } });

            await gmailService.getEmails(mockUser as IUser, {
                timeRange: 'months',
                timeValue: 1,
            });

            expect(mockGmailList).toHaveBeenCalledWith(
                expect.objectContaining({
                    q: expect.stringMatching(/after:\d{4}\/\d{2}\/\d{2}/),
                })
            );
        });

        it('should combine filters', async () => {
            mockGmailList.mockResolvedValue({ data: { messages: [] } });

            await gmailService.getEmails(mockUser as IUser, {
                isRead: true,
                timeRange: 'days',
                timeValue: 7,
            });

            expect(mockGmailList).toHaveBeenCalledWith(
                expect.objectContaining({
                    q: expect.stringMatching(/is:read after:\d{4}\/\d{2}\/\d{2}/),
                })
            );
        });

        it('should respect maxResults parameter', async () => {
            mockGmailList.mockResolvedValue({ data: { messages: [] } });

            await gmailService.getEmails(mockUser as IUser, { maxResults: 100 });

            expect(mockGmailList).toHaveBeenCalledWith(
                expect.objectContaining({
                    maxResults: 100,
                })
            );
        });

        it('should handle multipart email bodies', async () => {
            const mockMessages = [{ id: '1', threadId: 'thread1' }];

            const mockMessageData = {
                data: {
                    id: '1',
                    threadId: 'thread1',
                    snippet: 'Multipart email',
                    labelIds: ['INBOX'],
                    payload: {
                        headers: [
                            { name: 'Subject', value: 'Multipart Email' },
                            { name: 'From', value: 'sender@example.com' },
                            { name: 'To', value: 'recipient@example.com' },
                            { name: 'Date', value: 'Mon, 1 Jan 2024 10:00:00 GMT' },
                        ],
                        parts: [
                            {
                                mimeType: 'text/plain',
                                body: { data: Buffer.from('Plain text body').toString('base64') },
                            },
                            {
                                mimeType: 'text/html',
                                body: { data: Buffer.from('<p>HTML body</p>').toString('base64') },
                            },
                        ],
                    },
                },
            };

            mockGmailList.mockResolvedValue({ data: { messages: mockMessages } });
            mockGmailGet.mockResolvedValue(mockMessageData);

            const emails = await gmailService.getEmails(mockUser as IUser);

            expect(emails[0].body).toBe('Plain text body');
        });

        it('should handle nested multipart email bodies', async () => {
            const mockMessages = [{ id: '1', threadId: 'thread1' }];

            const mockMessageData = {
                data: {
                    id: '1',
                    threadId: 'thread1',
                    snippet: 'Nested multipart email',
                    labelIds: ['INBOX'],
                    payload: {
                        headers: [
                            { name: 'Subject', value: 'Nested Email' },
                            { name: 'From', value: 'sender@example.com' },
                            { name: 'To', value: 'recipient@example.com' },
                            { name: 'Date', value: 'Mon, 1 Jan 2024 10:00:00 GMT' },
                        ],
                        parts: [
                            {
                                mimeType: 'multipart/alternative',
                                parts: [
                                    {
                                        mimeType: 'text/plain',
                                        body: { data: Buffer.from('Nested plain text').toString('base64') },
                                    },
                                ],
                            },
                        ],
                    },
                },
            };

            mockGmailList.mockResolvedValue({ data: { messages: mockMessages } });
            mockGmailGet.mockResolvedValue(mockMessageData);

            const emails = await gmailService.getEmails(mockUser as IUser);

            expect(emails[0].body).toBe('Nested plain text');
        });

        it('should handle API errors', async () => {
            mockGmailList.mockRejectedValue(new Error('API Error'));

            await expect(gmailService.getEmails(mockUser as IUser)).rejects.toThrow(
                'Failed to fetch emails: API Error'
            );

            expect(Logger.error).toHaveBeenCalled();
        });
    });

    describe('getEmailById', () => {
        it('should fetch a single email successfully', async () => {
            const mockMessageData = {
                data: {
                    id: '123',
                    threadId: 'thread123',
                    snippet: 'Test email',
                    labelIds: ['INBOX'],
                    payload: {
                        headers: [
                            { name: 'Subject', value: 'Test Subject' },
                            { name: 'From', value: 'sender@example.com' },
                            { name: 'To', value: 'recipient@example.com' },
                            { name: 'Date', value: 'Mon, 1 Jan 2024 10:00:00 GMT' },
                        ],
                        body: { data: Buffer.from('Email body').toString('base64') },
                    },
                },
            };

            mockGmailGet.mockResolvedValue(mockMessageData);

            const email = await gmailService.getEmailById(mockUser as IUser, '123');

            expect(email.id).toBe('123');
            expect(email.subject).toBe('Test Subject');
            expect(email.from).toBe('sender@example.com');
            expect(email.body).toBe('Email body');
            expect(email.isRead).toBe(true);

            expect(mockGmailGet).toHaveBeenCalledWith({
                userId: 'me',
                id: '123',
                format: 'full',
            });
        });

        it('should handle API errors', async () => {
            mockGmailGet.mockRejectedValue(new Error('Email not found'));

            await expect(gmailService.getEmailById(mockUser as IUser, '999')).rejects.toThrow(
                'Failed to fetch email: Email not found'
            );

            expect(Logger.error).toHaveBeenCalled();
        });
    });
});
