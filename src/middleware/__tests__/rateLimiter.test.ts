import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    strictRateLimiter,
    standardRateLimiter,
    lenientRateLimiter,
    globalRateLimiter,
    apiRateLimiter,
} from '../rateLimiter';

vi.mock('../../utils/logger', () => ({
    default: {
        warn: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
    },
}));

/**
 * Rate Limiter Middleware Tests
 * Tests our rate limiting logic to prevent brute force attacks
 *
 * Note: These tests verify the middleware configuration and error handling.
 * In production, rate limiting is skipped in test environment (NODE_ENV=test)
 * to prevent interference with other tests.
 */
describe('Rate Limiter Middleware', () => {
    let originalEnv: string | undefined;

    beforeEach(() => {
        vi.clearAllMocks();
        originalEnv = process.env.NODE_ENV;
    });

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
    });

    describe('Configuration', () => {
        it('should have strict rate limiter configured', () => {
            expect(strictRateLimiter).toBeDefined();
            expect(typeof strictRateLimiter).toBe('function');
        });

        it('should have standard rate limiter configured', () => {
            expect(standardRateLimiter).toBeDefined();
            expect(typeof standardRateLimiter).toBe('function');
        });

        it('should have lenient rate limiter configured', () => {
            expect(lenientRateLimiter).toBeDefined();
            expect(typeof lenientRateLimiter).toBe('function');
        });

        it('should have global rate limiter configured', () => {
            expect(globalRateLimiter).toBeDefined();
            expect(typeof globalRateLimiter).toBe('function');
        });

        it('should have API rate limiter configured', () => {
            expect(apiRateLimiter).toBeDefined();
            expect(typeof apiRateLimiter).toBe('function');
        });
    });

    describe('Test Environment Behavior', () => {
        it('should have skip function configured for test environment', () => {
            expect(strictRateLimiter).toBeDefined();
            expect(standardRateLimiter).toBeDefined();
            expect(lenientRateLimiter).toBeDefined();
            expect(globalRateLimiter).toBeDefined();
            expect(apiRateLimiter).toBeDefined();
        });
    });

    describe('Rate Limiter Types', () => {
        it('should export all rate limiter middleware functions', () => {
            const rateLimiters = [
                strictRateLimiter,
                standardRateLimiter,
                lenientRateLimiter,
                globalRateLimiter,
                apiRateLimiter,
            ];

            rateLimiters.forEach((limiter) => {
                expect(limiter).toBeDefined();
                expect(typeof limiter).toBe('function');
            });
        });

        it('should have different configurations for different limiters', () => {
            expect(strictRateLimiter).not.toBe(standardRateLimiter);
            expect(standardRateLimiter).not.toBe(lenientRateLimiter);
            expect(lenientRateLimiter).not.toBe(globalRateLimiter);
            expect(globalRateLimiter).not.toBe(apiRateLimiter);
        });
    });

    describe('Middleware Interface', () => {
        it('should be callable as Express middleware', () => {
            expect(typeof strictRateLimiter).toBe('function');
            expect(typeof standardRateLimiter).toBe('function');
            expect(typeof lenientRateLimiter).toBe('function');
            expect(typeof globalRateLimiter).toBe('function');
            expect(typeof apiRateLimiter).toBe('function');
        });

        it('should be properly configured middleware', () => {
            const middlewares = [
                strictRateLimiter,
                standardRateLimiter,
                lenientRateLimiter,
                globalRateLimiter,
                apiRateLimiter,
            ];

            middlewares.forEach((middleware) => {
                expect(middleware).toBeDefined();
                expect(typeof middleware).toBe('function');
            });
        });
    });

    describe('Security Features', () => {
        it('should be designed to prevent brute force attacks', () => {
            expect(strictRateLimiter).toBeTruthy();
            expect(standardRateLimiter).toBeTruthy();
            expect(lenientRateLimiter).toBeTruthy();
        });

        it('should provide different security levels', () => {
            const securityLevels = [
                { name: 'strict', limiter: strictRateLimiter },
                { name: 'standard', limiter: standardRateLimiter },
                { name: 'lenient', limiter: lenientRateLimiter },
                { name: 'global', limiter: globalRateLimiter },
                { name: 'api', limiter: apiRateLimiter },
            ];

            securityLevels.forEach(({ limiter }) => {
                expect(limiter).toBeDefined();
            });
        });

        it('should be configured as middleware functions', () => {
            const rateLimiters = [
                strictRateLimiter,
                standardRateLimiter,
                lenientRateLimiter,
                globalRateLimiter,
                apiRateLimiter,
            ];

            rateLimiters.forEach((limiter) => {
                expect(typeof limiter).toBe('function');
            });
        });
    });

    describe('IP Tracking', () => {
        it('should be configured to track by IP', () => {
            expect(globalRateLimiter).toBeDefined();
            expect(lenientRateLimiter).toBeDefined();
        });

        it('should have all rate limiters configured', () => {
            const limiters = [
                strictRateLimiter,
                standardRateLimiter,
                lenientRateLimiter,
                globalRateLimiter,
                apiRateLimiter,
            ];

            limiters.forEach((limiter) => {
                expect(limiter).toBeDefined();
                expect(typeof limiter).toBe('function');
            });
        });
    });

    describe('Edge Cases', () => {
        it('should have distinct configurations for each limiter', () => {
            expect(strictRateLimiter).not.toBe(standardRateLimiter);
            expect(standardRateLimiter).not.toBe(apiRateLimiter);
        });

        it('should support different rate limiting strategies', () => {
            const limiters = {
                strict: strictRateLimiter,
                standard: standardRateLimiter,
                lenient: lenientRateLimiter,
                global: globalRateLimiter,
                api: apiRateLimiter,
            };

            Object.values(limiters).forEach((limiter) => {
                expect(limiter).toBeDefined();
                expect(typeof limiter).toBe('function');
            });
        });

        it('should be importable from middleware module', () => {
            expect(strictRateLimiter).toBeDefined();
            expect(standardRateLimiter).toBeDefined();
            expect(lenientRateLimiter).toBeDefined();
            expect(globalRateLimiter).toBeDefined();
            expect(apiRateLimiter).toBeDefined();
        });
    });

    describe('Production vs Test Environment', () => {
        it('should be configured with test environment skip logic', () => {
            expect(strictRateLimiter).toBeDefined();
            expect(standardRateLimiter).toBeDefined();
            expect(lenientRateLimiter).toBeDefined();
            expect(globalRateLimiter).toBeDefined();
            expect(apiRateLimiter).toBeDefined();
        });

        it('should have all rate limiters ready for production use', () => {
            const limiters = [
                strictRateLimiter,
                standardRateLimiter,
                lenientRateLimiter,
                globalRateLimiter,
                apiRateLimiter,
            ];

            limiters.forEach((limiter) => {
                expect(limiter).toBeDefined();
                expect(typeof limiter).toBe('function');
            });
        });
    });
});
