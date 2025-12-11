# Server Configuration Guide

## Overview

This backend server is built with Express.js and TypeScript, providing a robust
foundation for the email automation API. The server is designed with
scalability, security, and maintainability in mind.

## Architecture

### Project Structure

```text
backend-emailAutomation/
├── src/
│   ├── app.ts              # Express app configuration
│   ├── server.ts           # Server startup and DB connection
│   ├── routes/             # API route definitions
│   ├── controllers/        # Route handlers and business logic
│   ├── models/             # Database models (Mongoose schemas)
│   └── middleware/         # Custom middleware functions
├── tests/
│   ├── routes/             # Route tests
│   ├── controllers/        # Controller tests
│   ├── models/             # Model tests
│   ├── middleware/         # Middleware tests
│   └── sample.test.ts      # Example test file
├── dist/                   # Compiled JavaScript (generated)
├── .env                    # Environment variables (not in git)
├── .env.example            # Environment template
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts
```

### File Responsibilities

#### `src/app.ts`

Creates and configures the Express application instance. This file:

- Sets up middleware (security, CORS, body parsing, logging)
- Defines the health check endpoint
- Configures route handlers
- Implements 404 and error handling
- Exports the app for use in server.ts and tests

**Key Features:**

- **Helmet**: Security headers to protect against common vulnerabilities
- **CORS**: Cross-Origin Resource Sharing configuration
- **Morgan**: HTTP request logging (disabled in test environment)
- **JSON/URL-encoded parsing**: Automatic request body parsing

#### `src/server.ts`

Handles server startup, database connection, and graceful shutdown. This file:

- Loads environment variables
- Connects to MongoDB
- Starts the HTTP server
- Handles shutdown signals (SIGTERM, SIGINT)
- Provides graceful shutdown functionality

**Key Features:**

- Database connection with error handling
- Graceful shutdown on process signals
- Development mode fallback (continues without DB in non-production)
- Only runs when executed directly (not when imported for tests)

## Environment Variables

Environment variables are stored in `.env` file. Use `.env.example` as a
template.

### Required Variables

| Variable         | Description          | Default       |
| ---------------- | -------------------- | ------------- |
| `PORT`           | Server port number   | `3000`        |
| `NODE_ENV`       | Environment mode     | `development` |
| `MONGODB_URI`    | MongoDB connection   | See below     |
| `CORS_ORIGIN`    | Allowed CORS origins | `*`           |
| `JWT_SECRET`     | Secret key for JWT   | (required)    |
| `JWT_EXPIRES_IN` | JWT expiration time  | `7d`          |

**Default MongoDB URI:**
`mongodb://localhost:27017/emailautomation`

### Setup

1. Copy the example file:

    ```bash
    cp .env.example .env
    ```

2. Edit `.env` with your configuration values

3. **Never commit `.env` to version control** (already in `.gitignore`)

## Running the Server

### Development Mode

Run the server with automatic restart on file changes:

```bash
npm run dev
```

This uses `ts-node-dev` which:

- Compiles TypeScript on the fly
- Watches for file changes
- Automatically restarts the server
- Provides fast development feedback

**Output:**

```text
[INFO] ts-node-dev ver. 2.0.0
✗ MongoDB connection error: [connection details]
  Server will continue without database connection for testing
✓ Server is running on port 3000
✓ Environment: development
✓ Health check: http://localhost:3000/health
```

### Production Mode

1. **Build the TypeScript code:**

    ```bash
    npm run build
    ```

    This compiles TypeScript to JavaScript in the `dist/` directory.

2. **Start the production server:**

    ```bash
    npm start
    ```

    This runs the compiled JavaScript from `dist/server.js`.

### Environment-Specific Behavior

- **Development**: Server continues without database if connection fails
- **Production**: Server exits if database connection fails
- **Test**: Logging is disabled, server can be imported without starting

## API Endpoints

### Health Check

**Endpoint:** `GET /health`

**Description:** Returns server health status and uptime

**Response:**

```json
{
    "status": "ok",
    "timestamp": "2025-12-11T15:57:27.425Z",
    "uptime": 78.016448084
}
```

**Status Code:** 200 OK

**Usage:**

```bash
curl http://localhost:3000/health
```

### 404 Handler

All undefined routes return a 404 error:

**Response:**

```json
{
    "error": "Not Found",
    "message": "Cannot GET /api/undefined-route"
}
```

**Status Code:** 404 Not Found

### Error Handler

Global error handler catches all unhandled errors:

**Response (Development):**

```json
{
    "error": "Internal Server Error",
    "message": "Detailed error message"
}
```

**Response (Production):**

```json
{
    "error": "Internal Server Error",
    "message": "Something went wrong"
}
```

**Status Code:** 500 Internal Server Error

## Database Configuration

### MongoDB Connection

The server uses Mongoose to connect to MongoDB:

```typescript
mongoose.connect(MONGODB_URI);
```

### Connection String Format

```text
mongodb://[username:password@]host[:port]/database[?options]
```

**Examples:**

- Local: `mongodb://localhost:27017/emailautomation`
- Atlas: `mongodb+srv://user:pass@cluster.mongodb.net/emailautomation`
- Auth: `mongodb://admin:password@localhost:27017/emailautomation`

### Connection Options

Mongoose 6+ uses sensible defaults. No additional options are typically needed.

### Graceful Shutdown

The server closes database connections cleanly on shutdown:

```text
Shutting down gracefully...
✓ MongoDB connection closed
```

## Middleware Stack

The middleware is executed in the following order:

1. **Helmet** - Security headers
2. **CORS** - Cross-origin resource sharing
3. **express.json()** - Parse JSON request bodies
4. **express.urlencoded()** - Parse URL-encoded bodies
5. **Morgan** - HTTP request logging (development only)
6. **Routes** - Your API routes
7. **404 Handler** - Catch undefined routes
8. **Error Handler** - Global error handling

## Adding Routes

To add new API routes:

1. **Create a route file** in `src/routes/`:

    ```typescript
    // src/routes/user.routes.ts
    import { Router } from 'express';
    import { getUsers, createUser } from '../controllers/user.controller';

    const router = Router();

    router.get('/', getUsers);
    router.post('/', createUser);

    export default router;
    ```

2. **Import and use in `src/app.ts`:**

    ```typescript
    import userRoutes from './routes/user.routes';

    // Add after health check endpoint
    app.use('/api/users', userRoutes);
    ```

3. **Create corresponding controller** in `src/controllers/`:

    ```typescript
    // src/controllers/user.controller.ts
    import { Request, Response } from 'express';

    export const getUsers = async (req: Request, res: Response) => {
        // Your logic here
        res.json({ users: [] });
    };

    export const createUser = async (req: Request, res: Response) => {
        // Your logic here
        res.status(201).json({ message: 'User created' });
    };
    ```

## TypeScript Configuration

The `tsconfig.json` is configured for Node.js backend development:

**Key Settings:**

- `target: ES2020` - Modern JavaScript features
- `module: commonjs` - Node.js module system
- `strict: true` - All strict type checking enabled
- `outDir: ./dist` - Compiled output directory
- `rootDir: ./src` - Source code directory
- `esModuleInterop: true` - Better ES module compatibility

## Security Features

### Helmet

Automatically sets secure HTTP headers:

- `X-DNS-Prefetch-Control`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Strict-Transport-Security`
- And more...

### CORS

Configurable cross-origin resource sharing:

```typescript
cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
});
```

**Production Recommendation:** Set specific allowed origins in `.env`

### Error Handling

- Development: Detailed error messages for debugging
- Production: Generic messages to avoid information leakage

## Monitoring and Logging

### Morgan Logging

HTTP request logs in development:

```text
::1 - - [11/Dec/2025:15:57:27 +0000] "GET /health HTTP/1.1" 200 - "-" "curl/7.88.1"
```

### Custom Logging

Add your own logging:

```typescript
console.log('✓ Success message');
console.error('✗ Error message');
console.warn('⚠ Warning message');
```

## Testing the Server

### Manual Testing

1. **Start the server:**

    ```bash
    npm run dev
    ```

2. **Test health endpoint:**

    ```bash
    curl http://localhost:3000/health
    ```

3. **Test 404 handler:**

    ```bash
    curl http://localhost:3000/invalid-route
    ```

### Automated Testing

Use Supertest for route testing:

```typescript
import request from 'supertest';
import app from '../src/app';

describe('GET /health', () => {
    it('should return health status', async () => {
        const response = await request(app).get('/health').expect(200);

        expect(response.body).toHaveProperty('status', 'ok');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('uptime');
    });
});
```

See [testing.md](./testing.md) for complete testing documentation.

## Troubleshooting

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**

1. Find the process:

    ```bash
    lsof -i :3000
    ```

2. Kill it:

    ```bash
    kill -9 <PID>
    ```

3. Or change the port in `.env`

### MongoDB Connection Failed

**Error:** `MongoServerError: connect ECONNREFUSED`

**Solutions:**

- Ensure MongoDB is running: `mongod` or `brew services start mongodb-community`
- Check connection string in `.env`
- Verify network/firewall settings
- In development, server continues without DB

### TypeScript Errors

**Error:** Type checking errors during development

**Solutions:**

- Run `npm run build` to see all errors
- Check `tsconfig.json` settings
- Ensure all `@types/*` packages are installed
- Use `// @ts-ignore` sparingly for quick fixes

### Module Not Found

**Error:** `Cannot find module 'express'`

**Solution:**

```bash
npm install
```

## Performance Tips

### Production Optimization

1. **Use environment variables** for configuration
2. **Enable compression** middleware for responses
3. **Set up reverse proxy** (nginx) for static files
4. **Use PM2** or similar for process management
5. **Enable clustering** for multi-core utilization

### Development Speed

1. **Use `ts-node-dev`** for fast restarts (already configured)
2. **Disable unnecessary middleware** in development
3. **Use MongoDB indexes** for faster queries
4. **Implement caching** for frequently accessed data

## Deployment

### Prerequisites

- Node.js 18+ installed
- MongoDB instance available
- Environment variables configured

### Deployment Steps

1. **Build the application:**

    ```bash
    npm run build
    ```

2. **Set environment to production:**

    ```bash
    export NODE_ENV=production
    ```

3. **Configure production environment variables** in `.env`

4. **Start the server:**

    ```bash
    npm start
    ```

### Recommended Production Setup

- **Process Manager**: PM2, systemd, or Docker
- **Reverse Proxy**: nginx or Apache
- **Database**: MongoDB Atlas or managed instance
- **Monitoring**: Application Performance Monitoring (APM)
- **Logging**: Centralized logging service

## Next Steps

1. **Add your first route** in `src/routes/`
2. **Create corresponding controller** in `src/controllers/`
3. **Define data models** in `src/models/`
4. **Write tests** in `tests/` directory
5. **Implement authentication** middleware
6. **Add input validation** with Zod
7. **Set up email service** integration

## Resources

- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [MongoDB Documentation](https://www.mongodb.com/docs/)
