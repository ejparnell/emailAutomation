import { Request, Response } from 'express';
import * as gmailService from '../services/gmail.service';
import { EmailFilters } from '../services/gmail.service';
import { IUser } from '../models/user.model';
import Logger from '../utils/logger';

/**
 * Email Controllers
 *
 * Handle email retrieval requests for Gmail integration.
 * All controllers require authenticated users with connected Google accounts.
 */

/**
 * GET /emails
 * Retrieve emails with optional filters
 *
 * Query params:
 * - isRead: 'true' | 'false' - filter by read/unread status
 * - timeRange: 'hours' | 'days' | 'weeks' | 'months'
 * - timeValue: number - how many units of timeRange to look back
 * - maxResults: number - max emails to return (default 50, max 500)
 */
export const getEmails = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as IUser;
        if (!user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }

        const filters: EmailFilters = {};

        if (req.query.isRead !== undefined) {
            filters.isRead = req.query.isRead === 'true';
        }

        if (req.query.timeRange) {
            const timeRange = req.query.timeRange as string;
            if (['hours', 'days', 'weeks', 'months'].includes(timeRange)) {
                filters.timeRange = timeRange as 'hours' | 'days' | 'weeks' | 'months';
            } else {
                res.status(400).json({
                    error: 'Invalid timeRange. Must be one of: hours, days, weeks, months',
                });
                return;
            }
        }

        if (req.query.timeValue) {
            const timeValue = parseInt(req.query.timeValue as string, 10);
            if (isNaN(timeValue) || timeValue <= 0) {
                res.status(400).json({ error: 'timeValue must be a positive number' });
                return;
            }
            filters.timeValue = timeValue;
        }

        if (req.query.maxResults) {
            const maxResults = parseInt(req.query.maxResults as string, 10);
            if (isNaN(maxResults) || maxResults <= 0 || maxResults > 500) {
                res.status(400).json({ error: 'maxResults must be between 1 and 500' });
                return;
            }
            filters.maxResults = maxResults;
        }

        if (filters.timeRange && !filters.timeValue) {
            res.status(400).json({ error: 'timeValue is required when timeRange is specified' });
            return;
        }

        if (filters.timeValue && !filters.timeRange) {
            res.status(400).json({ error: 'timeRange is required when timeValue is specified' });
            return;
        }

        Logger.info(`Fetching emails for user ${user.email} with filters:`, filters);

        const emails = await gmailService.getEmails(user, filters);

        res.json({
            success: true,
            count: emails.length,
            filters,
            emails,
        });
    } catch (error: any) {
        Logger.error('Error in getEmails controller:', {
            error: error.message,
            stack: error.stack,
            userId: (req.user as IUser)?._id,
        });

        if (error.message.includes('invalid_grant') || error.message.includes('Token')) {
            res.status(401).json({
                error: 'Google authentication expired. Please re-authenticate.',
                code: 'AUTH_EXPIRED',
            });
            return;
        }

        res.status(500).json({
            error: 'Failed to fetch emails',
            message: error.message,
        });
    }
};

/**
 * GET /emails/:id
 * Retrieve a single email by ID
 */
export const getEmailById = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as IUser;
        if (!user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }

        const emailId = req.params.id;
        if (!emailId) {
            res.status(400).json({ error: 'Email ID is required' });
            return;
        }

        Logger.info(`Fetching email ${emailId} for user ${user.email}`);

        const email = await gmailService.getEmailById(user, emailId);

        res.json({
            success: true,
            email,
        });
    } catch (error: any) {
        Logger.error('Error in getEmailById controller:', {
            error: error.message,
            stack: error.stack,
            userId: (req.user as IUser)?._id,
            emailId: req.params.id,
        });

        if (error.message.includes('invalid_grant') || error.message.includes('Token')) {
            res.status(401).json({
                error: 'Google authentication expired. Please re-authenticate.',
                code: 'AUTH_EXPIRED',
            });
            return;
        }

        if (error.message.includes('Not Found') || error.message.includes('404')) {
            res.status(404).json({
                error: 'Email not found',
                message: error.message,
            });
            return;
        }

        res.status(500).json({
            error: 'Failed to fetch email',
            message: error.message,
        });
    }
};
