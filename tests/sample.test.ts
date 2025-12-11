import { describe, it, expect } from 'vitest';

describe('Sample Test Suite', () => {
    it('should perform basic arithmetic correctly', () => {
        expect(2 + 2).toBe(4);
        expect(10 - 5).toBe(5);
        expect(3 * 4).toBe(12);
        expect(8 / 2).toBe(4);
    });

    it('should handle string operations', () => {
        const greeting = 'Hello, World!';
        expect(greeting).toContain('World');
        expect(greeting.toLowerCase()).toBe('hello, world!');
        expect(greeting.length).toBe(13);
    });

    it('should work with arrays', () => {
        const numbers = [1, 2, 3, 4, 5];
        expect(numbers).toHaveLength(5);
        expect(numbers).toContain(3);
        expect(numbers[0]).toBe(1);
    });

    it('should work with objects', () => {
        const user = {
            name: 'John Doe',
            email: 'john@example.com',
            age: 30,
        };
        expect(user).toHaveProperty('name');
        expect(user.email).toMatch(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/);
        expect(user.age).toBeGreaterThan(18);
    });

    it('should handle async operations', async () => {
        const asyncFunction = async () => {
            return new Promise((resolve) => {
                setTimeout(() => resolve('async result'), 100);
            });
        };

        const result = await asyncFunction();
        expect(result).toBe('async result');
    });
});
