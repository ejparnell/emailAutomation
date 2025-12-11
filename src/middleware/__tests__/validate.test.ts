import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { validate } from '../validate';
import { z } from 'zod';
import Logger from '../../utils/logger';

vi.mock('../../utils/logger', () => ({
    default: {
        warn: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
    },
}));

/**
 * validate Middleware Tests
 * Tests our Zod schema validation logic
 */
describe('validate Middleware', () => {
    let mockReq: any;
    let mockRes: any;
    let mockNext: NextFunction;

    beforeEach(() => {
        vi.clearAllMocks();

        const jsonMock = vi.fn();
        const statusMock = vi.fn().mockReturnValue({ json: jsonMock });

        mockReq = {
            method: 'POST',
            path: '/api/users',
            body: {},
            query: {},
            params: {},
        };

        mockRes = {
            status: statusMock,
            json: jsonMock,
        };

        mockNext = vi.fn();
    });

    describe('Body Validation', () => {
        it('should validate valid request body', () => {
            const schema = z.object({
                email: z.string().email(),
                name: z.string(),
            });

            mockReq.body = {
                email: 'user@example.com',
                name: 'Test User',
            };

            const middleware = validate(schema, 'body');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
            expect(mockRes.status).not.toHaveBeenCalled();
            expect(Logger.debug).toHaveBeenCalledWith(
                expect.stringContaining('Validation passed')
            );
        });

        it('should reject invalid email format', () => {
            const schema = z.object({
                email: z.string().email(),
            });

            mockReq.body = {
                email: 'invalid-email',
            };

            const middleware = validate(schema, 'body');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Validation failed',
                errors: expect.arrayContaining([
                    expect.objectContaining({
                        field: 'email',
                        message: expect.stringContaining('Invalid email'),
                    }),
                ]),
            });
        });

        it('should reject missing required fields', () => {
            const schema = z.object({
                email: z.string(),
                name: z.string(),
            });

            mockReq.body = {
                email: 'user@example.com',
            };

            const middleware = validate(schema, 'body');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should transform data according to schema', () => {
            const schema = z.object({
                age: z.coerce.number(),
                name: z.string().trim(),
            });

            mockReq.body = {
                age: '25',
                name: '  Test User  ',
            };

            const middleware = validate(schema, 'body');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
            expect(mockReq.body.age).toBe(25);
            expect(mockReq.body.name).toBe('Test User');
        });
    });

    describe('Query Validation', () => {
        it('should validate query parameters', () => {
            const schema = z.object({
                page: z.coerce.number(),
                limit: z.coerce.number(),
            });

            mockReq.query = {
                page: '1',
                limit: '10',
            };

            const middleware = validate(schema, 'query');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
            expect(mockReq.query.page).toBe(1);
            expect(mockReq.query.limit).toBe(10);
        });

        it('should reject invalid query parameters', () => {
            const schema = z.object({
                page: z.coerce.number().positive(),
            });

            mockReq.query = {
                page: '-1',
            };

            const middleware = validate(schema, 'query');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
    });

    describe('Params Validation', () => {
        it('should validate route parameters', () => {
            const schema = z.object({
                id: z.string().regex(/^[a-f\d]{24}$/i),
            });

            mockReq.params = {
                id: '507f1f77bcf86cd799439011',
            };

            const middleware = validate(schema, 'params');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
        });

        it('should reject invalid route parameters', () => {
            const schema = z.object({
                id: z.string().regex(/^[a-f\d]{24}$/i),
            });

            mockReq.params = {
                id: 'invalid-id',
            };

            const middleware = validate(schema, 'params');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
    });

    describe('Default Behavior', () => {
        it('should default to body validation when source not specified', () => {
            const schema = z.object({
                name: z.string(),
            });

            mockReq.body = {
                name: 'Test',
            };

            const middleware = validate(schema);
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
        });
    });

    describe('Error Response Format', () => {
        it('should return detailed validation errors', () => {
            const schema = z.object({
                email: z.string().email(),
                age: z.number().min(18),
                name: z.string().min(2),
            });

            mockReq.body = {
                email: 'invalid',
                age: 15,
                name: 'A',
            };

            const middleware = validate(schema, 'body');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Validation failed',
                errors: expect.arrayContaining([
                    expect.objectContaining({ field: 'email' }),
                    expect.objectContaining({ field: 'age' }),
                    expect.objectContaining({ field: 'name' }),
                ]),
            });
        });

        it('should include field paths in error messages', () => {
            const schema = z.object({
                user: z.object({
                    email: z.string().email(),
                }),
            });

            mockReq.body = {
                user: {
                    email: 'invalid',
                },
            };

            const middleware = validate(schema, 'body');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    errors: expect.arrayContaining([
                        expect.objectContaining({
                            field: 'user.email',
                        }),
                    ]),
                })
            );
        });

        it('should log validation failures', () => {
            const schema = z.object({
                email: z.string().email(),
            });

            mockReq.body = {
                email: 'invalid',
            };

            const middleware = validate(schema, 'body');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(Logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Validation failed'),
                expect.any(Object)
            );
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty objects', () => {
            const schema = z.object({});

            mockReq.body = {};

            const middleware = validate(schema, 'body');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
        });

        it('should handle optional fields', () => {
            const schema = z.object({
                email: z.string().email(),
                age: z.number().optional(),
            });

            mockReq.body = {
                email: 'user@example.com',
            };

            const middleware = validate(schema, 'body');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
        });

        it('should handle default values', () => {
            const schema = z.object({
                limit: z.number().default(10),
            });

            mockReq.query = {};

            const middleware = validate(schema, 'query');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
            expect(mockReq.query.limit).toBe(10);
        });

        it('should strip unknown fields when using strict mode', () => {
            const schema = z.object({
                name: z.string(),
            }).strict();

            mockReq.body = {
                name: 'Test',
                unknownField: 'should be rejected',
            };

            const middleware = validate(schema, 'body');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should handle arrays in schema', () => {
            const schema = z.object({
                tags: z.array(z.string()),
            });

            mockReq.body = {
                tags: ['tag1', 'tag2'],
            };

            const middleware = validate(schema, 'body');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
        });

        it('should handle nested objects', () => {
            const schema = z.object({
                user: z.object({
                    profile: z.object({
                        name: z.string(),
                    }),
                }),
            });

            mockReq.body = {
                user: {
                    profile: {
                        name: 'Test User',
                    },
                },
            };

            const middleware = validate(schema, 'body');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
        });

        it('should handle non-ZodError exceptions gracefully', () => {
            const schema = z.any().refine(() => {
                throw new Error('Unexpected error');
            });

            mockReq.body = { test: 'data' };

            const middleware = validate(schema, 'body');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Internal server error during validation',
            });
            expect(Logger.error).toHaveBeenCalled();
        });
    });
});
