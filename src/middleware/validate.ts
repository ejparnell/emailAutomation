import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import Logger from '../utils/logger';

/**
 * Validate Middleware
 *
 * Validates request data (body, query, or params) against a Zod schema.
 * Returns 400 with validation errors if validation fails.
 *
 * @param schema - Zod schema to validate against
 * @param source - Which part of the request to validate ('body', 'query', 'params')
 * @returns 400 if validation fails with detailed error messages
 *
 * @example
 * router.post('/users', validate(createUserSchema, 'body'), createUser)
 * router.get('/users/:id', validate(z.object({ id: z.string() }), 'params'), getUser)
 * router.get('/search', validate(searchSchema, 'query'), searchUsers)
 */
export const validate = (
    schema: ZodSchema,
    source: 'body' | 'query' | 'params' = 'body'
) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            const validated = schema.parse(req[source]);

            req[source] = validated;

            Logger.debug(
                `Validation passed: ${req.method} ${req.path} (${source})`
            );
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errors = error.issues.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));

                Logger.warn(
                    `Validation failed: ${req.method} ${req.path} (${source})`,
                    { errors }
                );

                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors,
                });
                return;
            }

            Logger.error('Unexpected error in validation middleware:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error during validation',
            });
        }
    };
};
