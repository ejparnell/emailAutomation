# Testing Guide

## Overview

This project uses a comprehensive testing setup to ensure code quality and
reliability. Testing is an essential part of the development workflow,
allowing you to verify that your routes, controllers, and other components
work as expected.

## Testing Libraries

### Vitest

[Vitest](https://vitest.dev/) is our primary testing framework. It's a
blazing-fast unit test framework powered by Vite, designed for modern
JavaScript/TypeScript projects.

**Key Features:**

- Fast execution with instant watch mode
- Out-of-the-box TypeScript support
- Jest-compatible API
- Built-in code coverage
- ESM, TypeScript, JSX support out of the box

### Supertest

[Supertest](https://github.com/ladjs/supertest) is used for HTTP assertion
testing. It allows you to test Express routes and middleware by making
HTTP requests.

**Key Features:**

- Test HTTP endpoints without starting a server
- Fluent API for assertions
- Works seamlessly with Express applications
- Support for all HTTP methods (GET, POST, PUT, DELETE, etc.)

### Additional Testing Tools

- **@vitest/ui**: Optional UI interface for running and viewing tests
- **mongodb-memory-server**: In-memory MongoDB for testing database operations
  without affecting your real database

## Running Tests

### Run All Tests (Once)

To run all tests once and exit:

```bash
npm test
```

This is useful for CI/CD pipelines and pre-commit checks.

### Run Tests in Watch Mode

To run tests continuously and re-run on file changes:

```bash
npm run test:watch
```

This is ideal for development when you want immediate feedback as you write
code.

### Run Tests with Coverage

To run tests and generate a code coverage report:

```bash
npm run test:coverage
```

Coverage reports will be generated in the `coverage/` directory and show:

- Line coverage
- Branch coverage
- Function coverage
- Statement coverage

### Run Tests with UI

To run tests with an interactive UI in your browser:

```bash
npm run test:ui
```

This provides a visual interface to view test results, filter tests, and
explore coverage.

## Test File Organization

Tests are organized in the `tests/` directory at the root of the project.

### File Naming Conventions

- Test files should end with `.test.ts` or `.spec.ts`
- Name test files to match the file being tested:
  - `userController.ts` → `userController.test.ts`
  - `authRoutes.ts` → `authRoutes.test.ts`

### Directory Structure

```text
backend-emailAutomation/
├── src/
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   └── middleware/
├── tests/
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   ├── middleware/
│   └── sample.test.ts
└── vitest.config.ts
```

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest';

describe('Feature Name', () => {
    it('should do something specific', () => {
        // Arrange: Set up test data
        const input = 'test';

        // Act: Execute the code being tested
        const result = input.toUpperCase();

        // Assert: Verify the result
        expect(result).toBe('TEST');
    });
});
```

### Testing Express Routes

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('POST /api/users', () => {
    it('should create a new user', async () => {
        const response = await request(app)
            .post('/api/users')
            .send({
                name: 'John Doe',
                email: 'john@example.com',
            })
            .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe('John Doe');
    });
});
```

### Testing with Database (MongoDB Memory Server)

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '../src/models/User';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('User Model', () => {
    it('should create a user successfully', async () => {
        const userData = {
            name: 'Jane Doe',
            email: 'jane@example.com',
        };
        const user = await User.create(userData);
        expect(user.name).toBe('Jane Doe');
        expect(user.email).toBe('jane@example.com');
    });
});
```

## Common Matchers

Vitest provides many matchers for different assertion types:

### Equality

- `expect(value).toBe(expected)` - Strict equality (===)
- `expect(value).toEqual(expected)` - Deep equality for objects/arrays
- `expect(value).not.toBe(expected)` - Negation

### Truthiness

- `expect(value).toBeTruthy()` - Truthy value
- `expect(value).toBeFalsy()` - Falsy value
- `expect(value).toBeNull()` - Null value
- `expect(value).toBeUndefined()` - Undefined value

### Numbers

- `expect(number).toBeGreaterThan(3)`
- `expect(number).toBeLessThan(5)`
- `expect(number).toBeCloseTo(0.3)` - Floating point comparison

### Strings

- `expect(string).toMatch(/pattern/)` - Regex match
- `expect(string).toContain('substring')` - Contains substring

### Arrays/Objects

- `expect(array).toHaveLength(3)` - Array length
- `expect(array).toContain(item)` - Array contains item
- `expect(object).toHaveProperty('key')` - Object has property

### Async

- `await expect(promise).resolves.toBe(value)` - Promise resolves to value
- `await expect(promise).rejects.toThrow()` - Promise rejects

## Best Practices

### Test Organization

- **Use descriptive test names**: Clearly describe what the test verifies
- **One assertion concept per test**: Keep tests focused and specific
- **Group related tests**: Use `describe` blocks to organize related tests
- **Follow AAA pattern**: Arrange, Act, Assert

### Test Independence

- **Tests should be independent**: One test shouldn't depend on another
- **Clean up after tests**: Use `afterEach` or `afterAll` to clean up
- **Use fresh data**: Don't rely on shared state between tests

### Coverage Goals

- **Aim for high coverage**: Target 80%+ code coverage
- **Focus on critical paths**: Prioritize testing important business logic
- **Don't chase 100%**: Some code (like config files) doesn't need tests

### Writing Testable Code

- **Keep functions small**: Easier to test and understand
- **Avoid side effects**: Pure functions are easier to test
- **Use dependency injection**: Makes mocking easier
- **Separate concerns**: Business logic separate from framework code

## Configuration

The testing configuration is defined in `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true, // Use global test functions
        environment: 'node', // Node.js environment for backend
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
        },
        include: ['**/*.test.ts', '**/*.spec.ts'],
        exclude: ['node_modules/', 'dist/'],
    },
});
```

## Continuous Integration

When setting up CI/CD, include these commands:

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Ensure coverage meets minimum thresholds (configure in vitest.config.ts)
```

## Example Test File

A complete example test file is available at `tests/sample.test.ts` that
demonstrates:

- Basic arithmetic and type testing
- String operations
- Array manipulation
- Object property testing
- Async operation testing

You can use this as a reference when creating your own tests.

## Troubleshooting

### Tests Running Slowly

- Check for unnecessary async operations
- Use `beforeAll` instead of `beforeEach` when possible
- Mock external dependencies

### Tests Failing Intermittently

- Ensure tests are independent
- Check for race conditions in async code
- Use proper cleanup in `afterEach`/`afterAll`

### Import Errors

- Ensure TypeScript is configured correctly
- Check that file paths are correct
- Verify that dependencies are installed

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)
- [Jest API (Vitest Compatible)](https://jestjs.io/docs/api)
