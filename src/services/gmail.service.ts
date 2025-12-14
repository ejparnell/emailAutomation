import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { IUser } from '../models/user.model';
import Logger from '../utils/logger';

/**
 * Gmail Service
 *
 * Handles all Gmail API interactions using the user's OAuth tokens.
 * Provides methods to fetch, filter, and process emails.
 */

export interface EmailMessage {
    id: string;
    threadId: string;
    subject: string;
    from: string;
    to: string[];
    date: Date;
    snippet: string;
    body: string;
    isRead: boolean;
    labels: string[];
}

export interface EmailFilters {
    isRead?: boolean;
    timeRange?: 'hours' | 'days' | 'weeks' | 'months';
    timeValue?: number;
    maxResults?: number;
}

/**
 * Create OAuth2 client with user tokens
 */
const createOAuth2Client = (user: IUser): OAuth2Client => {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_CALLBACK_URL
    );

    oauth2Client.setCredentials({
        access_token: user.googleAccessToken,
        refresh_token: user.googleRefreshToken,
    });

    return oauth2Client;
};

/**
 * Build Gmail API query string from filters
 */
const buildQuery = (filters: EmailFilters): string => {
    const queryParts: string[] = [];

    if (filters.isRead !== undefined) {
        queryParts.push(filters.isRead ? 'is:read' : 'is:unread');
    }

    if (filters.timeRange && filters.timeValue) {
        const now = new Date();
        let afterDate: Date;

        switch (filters.timeRange) {
            case 'hours':
                afterDate = new Date(now.getTime() - filters.timeValue * 60 * 60 * 1000);
                break;
            case 'days':
                afterDate = new Date(now.getTime() - filters.timeValue * 24 * 60 * 60 * 1000);
                break;
            case 'weeks':
                afterDate = new Date(now.getTime() - filters.timeValue * 7 * 24 * 60 * 60 * 1000);
                break;
            case 'months':
                afterDate = new Date(now.getTime() - filters.timeValue * 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                afterDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }

        const year = afterDate.getFullYear();
        const month = String(afterDate.getMonth() + 1).padStart(2, '0');
        const day = String(afterDate.getDate()).padStart(2, '0');
        queryParts.push(`after:${year}/${month}/${day}`);
    }

    return queryParts.join(' ');
};

/**
 * Parse email headers to extract metadata
 */
const parseHeaders = (headers: any[]): { subject: string; from: string; to: string[]; date: Date } => {
    const getHeader = (name: string) => {
        const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
        return header?.value || '';
    };

    const subject = getHeader('Subject');
    const from = getHeader('From');
    const to = getHeader('To').split(',').map((email: string) => email.trim());
    const dateStr = getHeader('Date');
    const date = dateStr ? new Date(dateStr) : new Date();

    return { subject, from, to, date };
};

/**
 * Extract email body from message payload
 */
const extractBody = (payload: any): string => {
    let body = '';

    if (payload.body?.data) {
        body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    } else if (payload.parts) {
        for (const part of payload.parts) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
                body = Buffer.from(part.body.data, 'base64').toString('utf-8');
                break;
            } else if (part.mimeType === 'text/html' && part.body?.data && !body) {
                body = Buffer.from(part.body.data, 'base64').toString('utf-8');
            } else if (part.parts) {
                body = extractBody(part);
                if (body) break;
            }
        }
    }

    return body;
};

/**
 * Get emails from Gmail API
 */
export const getEmails = async (user: IUser, filters: EmailFilters = {}): Promise<EmailMessage[]> => {
    try {
        const auth = createOAuth2Client(user);
        const gmail = google.gmail({ version: 'v1', auth });

        const query = buildQuery(filters);
        const maxResults = filters.maxResults || 50;

        Logger.debug(`Fetching emails for ${user.email} with query: "${query}"`);

        const listResponse = await gmail.users.messages.list({
            userId: 'me',
            q: query || undefined,
            maxResults,
        });

        const messages = listResponse.data.messages || [];

        if (messages.length === 0) {
            Logger.info(`No emails found for ${user.email} with filters: ${JSON.stringify(filters)}`);
            return [];
        }

        const emailPromises = messages.map(async (message: { id?: string | null }) => {
            const messageData = await gmail.users.messages.get({
                userId: 'me',
                id: message.id!,
                format: 'full',
            });

            const msg = messageData.data;
            const headers = msg.payload?.headers || [];
            const { subject, from, to, date } = parseHeaders(headers);
            const body = extractBody(msg.payload);
            const isRead = !msg.labelIds?.includes('UNREAD');

            return {
                id: msg.id!,
                threadId: msg.threadId!,
                subject,
                from,
                to,
                date,
                snippet: msg.snippet || '',
                body,
                isRead,
                labels: msg.labelIds || [],
            };
        });

        const emails = await Promise.all(emailPromises);

        Logger.info(`Successfully fetched ${emails.length} emails for ${user.email}`);
        return emails;
    } catch (error: any) {
        Logger.error(`Error fetching emails for ${user.email}:`, {
            error: error.message,
            stack: error.stack,
        });
        throw new Error(`Failed to fetch emails: ${error.message}`);
    }
};

/**
 * Get a single email by ID
 */
export const getEmailById = async (user: IUser, emailId: string): Promise<EmailMessage> => {
    try {
        const auth = createOAuth2Client(user);
        const gmail = google.gmail({ version: 'v1', auth });

        Logger.debug(`Fetching email ${emailId} for ${user.email}`);

        const messageData = await gmail.users.messages.get({
            userId: 'me',
            id: emailId,
            format: 'full',
        });

        const msg = messageData.data;
        const headers = msg.payload?.headers || [];
        const { subject, from, to, date } = parseHeaders(headers);
        const body = extractBody(msg.payload);
        const isRead = !msg.labelIds?.includes('UNREAD');

        const email: EmailMessage = {
            id: msg.id!,
            threadId: msg.threadId!,
            subject,
            from,
            to,
            date,
            snippet: msg.snippet || '',
            body,
            isRead,
            labels: msg.labelIds || [],
        };

        Logger.info(`Successfully fetched email ${emailId} for ${user.email}`);
        return email;
    } catch (error: any) {
        Logger.error(`Error fetching email ${emailId} for ${user.email}:`, {
            error: error.message,
            stack: error.stack,
        });
        throw new Error(`Failed to fetch email: ${error.message}`);
    }
};
