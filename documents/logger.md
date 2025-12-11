# Logging Guide

## Overview

This project uses [Winston](https://github.com/winstonjs/winston), a versatile
logging library for Node.js, to provide comprehensive logging capabilities.
Logs are written to both the console and files, making it easy to monitor
application behavior during development and troubleshoot issues in production.

## Why Use a Logger?

Using a proper logging system instead of `console.log` provides several
benefits:

- **Log Levels**: Different severity levels (error, warn, info, http, debug)
- **Structured Output**: Consistent formatting across all logs
- **File Persistence**: Logs are saved to files for later analysis
- **Environment Awareness**: Different log levels for dev vs production
- **Performance**: Better performance than console logging
- **Centralization**: All logging goes through one configured system

## Log Levels

The application uses five log levels, from highest to lowest priority:

| Level   | Priority | Usage                                 | Color   |
| ------- | -------- | ------------------------------------- | ------- |
| `error` | 0        | Error messages, exceptions, failures  | Red     |
| `warn`  | 1        | Warning messages, deprecated features | Yellow  |
| `info`  | 2        | General information, server startup   | Green   |
| `http`  | 3        | HTTP request/response logs            | Magenta |
| `debug` | 4        | Detailed debugging information        | White   |

### Log Level Behavior by Environment

- **Development**: All levels shown (debug and above)
- **Production**: Only warnings and errors (warn and above)
- **Test**: All levels shown (debug and above)

## Log Files

Logs are automatically written to the `logs/` directory in the project root:

### `logs/all.log`

Contains **all log messages** from all levels. This is your primary log file
for reviewing application behavior.

**Example content:**

```text
2025-12-11 11:08:03:83 error: MongoDB connection error: connect ECONNREFUSED
2025-12-11 11:08:03:83 warn: Server will continue without database connection
2025-12-11 11:08:03:83 info: Server is running on port 3000
2025-12-11 11:08:03:83 info: Environment: development
2025-12-11 11:08:03:83 info: Health check: http://localhost:3000/health
2025-12-11 11:09:19:919 http: GET /health 200 77 - 2.154 ms
2025-12-11 11:09:24:924 http: GET /api/test 404 54 - 0.539 ms
```

### `logs/error.log`

Contains **only error messages**. This file is useful for quickly identifying
problems without sifting through other log levels.

**Example content:**

```text
2025-12-11 11:08:03:83 error: MongoDB connection error: connect ECONNREFUSED
```

### Log File Management

- Log files are created automatically when the application starts
- Files are appended to (not overwritten) each time the server runs
- **Important**: Log files can grow large over time. Consider implementing
  log rotation in production (see [Advanced Configuration](#advanced-configuration))

## Viewing Logs

### During Development

Logs appear in the console with color coding when running the server:

```bash
npm run dev
```

You'll see colored output like:

- 🔴 Red for errors
- 🟡 Yellow for warnings
- 🟢 Green for info
- 🟣 Magenta for HTTP requests
- ⚪ White for debug

### Checking Log Files

View all logs:

```bash
cat logs/all.log
```

View only errors:

```bash
cat logs/error.log
```

Follow logs in real-time (like `tail -f`):

```bash
tail -f logs/all.log
```

View last 50 lines:

```bash
tail -50 logs/all.log
```

Search for specific content:

```bash
grep "error" logs/all.log
grep "MongoDB" logs/all.log
```

## Using the Logger in Code

The logger is available via `src/utils/logger.ts`:

### Basic Import

```typescript
import Logger from './utils/logger';
```

### Log Methods

#### Error Messages

Use for exceptions, failures, and critical issues:

```typescript
Logger.error('Failed to connect to database');
Logger.error('User authentication failed:', error);
Logger.error(`Error processing request: ${error.message}`, {
    stack: error.stack,
});
```

#### Warning Messages

Use for deprecation notices, recoverable issues:

```typescript
Logger.warn('API key is not set, using default configuration');
Logger.warn('Request rate limit approaching threshold');
```

#### Info Messages

Use for general application flow, successful operations:

```typescript
Logger.info('Server started successfully');
Logger.info(`User ${userId} logged in`);
Logger.info('Email sent to ' + email);
```

#### HTTP Request Logs

Automatically logged by Morgan middleware. You can also log manually:

```typescript
Logger.http('GET /api/users 200 45ms');
```

#### Debug Messages

Use for detailed debugging during development:

```typescript
Logger.debug('Processing user data:', userData);
Logger.debug(`Cache hit for key: ${cacheKey}`);
```

## Logger Configuration

The logger is configured in `src/utils/logger.ts`:

### Key Configuration Options

```typescript
// Log directory
const logDir = 'logs';

// Timestamp format
format: 'YYYY-MM-DD HH:mm:ss:ms'

// Console colors
colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
}

// Transports (output destinations)
transports: [
    new winston.transports.Console(),           // Console output
    new winston.transports.File({               // All logs file
        filename: 'logs/all.log'
    }),
    new winston.transports.File({               // Errors only file
        filename: 'logs/error.log',
        level: 'error'
    })
]
```

## HTTP Request Logging

HTTP requests are automatically logged using Morgan middleware integrated with
Winston. Each request is logged with:

- HTTP method (GET, POST, etc.)
- Request path
- Status code
- Response size
- Response time in milliseconds

**Example:**

```text
2025-12-11 11:09:19:919 http: GET /health 200 77 - 2.154 ms
2025-12-11 11:09:24:924 http: GET /api/test 404 54 - 0.539 ms
```

### Morgan Configuration

Located in `src/app.ts`:

```typescript
const morganFormat =
    ':method :url :status :res[content-length] - :response-time ms';

app.use(
    morgan(morganFormat, {
        stream: {
            write: (message: string) => {
                Logger.http(message.trim());
            },
        },
    })
);
```

HTTP logging is **disabled in test environment** to keep test output clean.

## Best Practices

### 1. Use Appropriate Log Levels

```typescript
// ✓ Good
Logger.error('Database connection failed', error);
Logger.info('User created successfully');
Logger.debug('Validating user input', inputData);

// ✗ Bad
Logger.error('User logged in'); // This is not an error
Logger.info('Critical system failure'); // This should be an error
```

### 2. Include Context

```typescript
// ✓ Good - includes context
Logger.error(`Failed to process order ${orderId}`, { error, userId });

// ✗ Bad - no context
Logger.error('Order failed');
```

### 3. Don't Log Sensitive Data

```typescript
// ✗ Bad - logging sensitive data
Logger.info('User password:', password);
Logger.info('Credit card:', creditCard);

// ✓ Good - sanitized
Logger.info(`User ${userId} updated password`);
Logger.info(`Payment processed for order ${orderId}`);
```

### 4. Use Structured Logging

```typescript
// ✓ Good - structured with metadata
Logger.info('User action completed', {
    action: 'update_profile',
    userId: user.id,
    timestamp: new Date(),
});
```

### 5. Log at Application Boundaries

Log at key points:

- Application startup
- Database connections
- API requests/responses
- Error conditions
- Important state changes

## Troubleshooting

### Logs Not Appearing in Files

**Issue:** Console shows logs but files are empty

**Solutions:**

1. Check file permissions on `logs/` directory:

    ```bash
    ls -la logs/
    ```

2. Ensure the application has write permissions
3. Check if disk space is available

### Log Files Growing Too Large

**Issue:** Log files consuming too much disk space

**Solutions:**

1. Implement log rotation (see Advanced Configuration)
2. Archive old logs periodically
3. Adjust log level in production to `warn` or `error` only

### Colors Not Showing in Console

**Issue:** Console output is not colored

**Solutions:**

1. Ensure terminal supports colors
2. Check if `colorize` is enabled in logger configuration
3. Some CI/CD environments don't support colors

## Advanced Configuration

### Log Rotation

For production, implement log rotation to prevent files from growing too large:

```bash
npm install winston-daily-rotate-file
```

```typescript
import DailyRotateFile from 'winston-daily-rotate-file';

const transport = new DailyRotateFile({
    filename: 'logs/application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
});
```

### Custom Log Formats

Modify the format in `src/utils/logger.ts`:

```typescript
// JSON format for production
const jsonFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
);

// Custom format
const customFormat = winston.format.printf(({ level, message, timestamp }) => {
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
});
```

### Remote Logging

Send logs to external services (Loggly, Papertrail, etc.):

```bash
npm install winston-loggly-bulk
```

```typescript
import { Loggly } from 'winston-loggly-bulk';

const logglyTransport = new Loggly({
    token: process.env.LOGGLY_TOKEN,
    subdomain: process.env.LOGGLY_SUBDOMAIN,
    tags: ['backend', 'email-automation'],
    json: true,
});
```

## Testing with Logs

When writing tests, you may want to suppress logs:

```typescript
// In test setup
Logger.transports.forEach((t) => (t.silent = true));

// Or mock the logger
jest.mock('./utils/logger', () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    http: jest.fn(),
    debug: jest.fn(),
}));
```

## Environment Variables

Control logging behavior with environment variables in `.env`:

```bash
# Set log level explicitly
LOG_LEVEL=info

# Disable file logging
LOG_TO_FILE=false

# Change log directory
LOG_DIR=./app-logs
```

Then update `src/utils/logger.ts` to use these variables:

```typescript
const logDir = process.env.LOG_DIR || 'logs';
const level = process.env.LOG_LEVEL || level();
```

## Monitoring Logs in Production

### Real-time Monitoring

```bash
# Watch all logs
tail -f logs/all.log

# Watch only errors
tail -f logs/error.log

# Watch with grep filter
tail -f logs/all.log | grep ERROR
```

### Log Analysis

```bash
# Count errors today
grep "2025-12-11" logs/error.log | wc -l

# Find specific errors
grep "MongoDB" logs/error.log

# Get last 100 HTTP requests
grep "http:" logs/all.log | tail -100
```

## Migration from Console.log

The project has been fully migrated from `console.log` to Winston:

| Old Code          | New Code         |
| ----------------- | ---------------- |
| `console.log()`   | `Logger.info()`  |
| `console.error()` | `Logger.error()` |
| `console.warn()`  | `Logger.warn()`  |
| `console.debug()` | `Logger.debug()` |

All `console.*` calls in `app.ts` and `server.ts` have been replaced with
appropriate Logger methods.

## Resources

- [Winston Documentation](https://github.com/winstonjs/winston)
- [Winston Transports](https://github.com/winstonjs/winston/blob/master/docs/transports.md)
- [Morgan Documentation](https://github.com/expressjs/morgan)
- [Log Levels Best Practices](https://www.dataset.com/blog/the-10-commandments-of-logging/)

## Summary

- **Logger Location**: `src/utils/logger.ts`
- **Log Files**: `logs/all.log` and `logs/error.log`
- **Usage**: Import and use `Logger.info()`, `Logger.error()`, etc.
- **HTTP Logs**: Automatically captured via Morgan middleware
- **Viewing**: Use `cat`, `tail`, or `grep` commands
- **Environment**: Different log levels for dev vs production
