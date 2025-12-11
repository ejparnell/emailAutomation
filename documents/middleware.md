# Middleware Documentation

Complete guide to authentication, authorization, and validation middleware.

## Overview

This application uses a layered middleware approach for security and validation:

- **Global Middleware**: Runs on every request
- **Route-level Middleware**: Applied to specific routes or route groups
- **Validation Middleware**: Validates request data using Zod schemas

## Middleware Stack

### Global Middleware (Applied to All Routes)

1. **`helmet()`** - Security headers
2. **`cors()`** - Cross-origin resource sharing
3. **`express.json()`** - Parse JSON bodies
4. **`session()`** - Session management
5. **`passport.initialize()`** - Initialize Passport
6. **`passport.session()`** - Load user from session
7. **`attachUserFromSession`** - Custom user attachment (extensible)

### Route-level Middleware

Applied to specific routes as needed:

- [`requireUser`](#requireuser) - Require authentication
- [`requireRole(...roles)`](#requirerole) - Require specific role(s)
- [`requireOwnershipOrRole(param, ...roles)`](#requireownershiporrole) - Self or admin access
- [`requireConnectedGoogle`](#requireconnectedgoogle) - Require Gmail connection
- [`validate(schema, source)`](#validate) - Validate request data

---

## Middleware Reference

### `attachUserFromSession`

**Type**: Global Middleware  
**File**: `src/middleware/attachUserFromSession.ts`

Automatically runs after `passport.session()` to attach the user from session.

**Usage**:
```typescript
// Already applied globally in app.ts
app.use(attachUserFromSession);
```

**Purpose**: Provides a hook for additional user processing if needed in the future
(e.g., loading user preferences, checking account status).

---

### `requireUser`

**Type**: Route-level Middleware  
**File**: `src/middleware/requireUser.ts`

Ensures the request has an authenticated user. Returns 401 if not authenticated.

**Usage**:
```typescript
import { requireUser } from '../middleware';

router.get('/profile', requireUser, getProfile);
router.post('/emails', requireUser, sendEmail);
```

**Response (401)**:
```json
{
    "success": false,
    "message": "Authentication required"
}
```

**Logging**:
- Warns on unauthenticated access attempts
- Logs authenticated requests in debug mode

---

### `requireRole`

**Type**: Route-level Middleware  
**File**: `src/middleware/requireRole.ts`

Ensures user has at least one of the specified roles. Must be used after
[`requireUser`](#requireuser).

**Parameters**:
- `...roles: Role[]` - One or more roles (e.g., `'ADMIN'`, `'USER'`)

**Usage**:
```typescript
import { requireUser, requireRole } from '../middleware';

// Only admins can access
router.get('/admin/users', requireUser, requireRole('ADMIN'), getAllUsers);

// Admins OR users with special permission
router.post('/reports', requireUser, requireRole('ADMIN', 'USER'), createReport);
```

**Response (403)**:
```json
{
    "success": false,
    "message": "Insufficient permissions"
}
```

**Logging**:
- Warns when authorization fails with user email and required roles
- Logs successful authorizations in debug mode

---

### `requireOwnershipOrRole`

**Type**: Route-level Middleware  
**File**: `src/middleware/requireOwnershipOrRole.ts`

Allows access if user owns the resource OR has specified role(s).  
Common pattern: Users access their own data, admins access any data.

**Parameters**:
- `paramName: string` - Route parameter containing user ID
- `...roles: Role[]` - Roles that can bypass ownership (typically `'ADMIN'`)

**Usage**:
```typescript
import { requireUser, requireOwnershipOrRole } from '../middleware';

// Users can update their own profile, admins can update any profile
router.put(
    '/users/:userId',
    requireUser,
    requireOwnershipOrRole('userId', 'ADMIN'),
    updateUser
);

// Users can view their own emails, admins can view any emails
router.get(
    '/users/:id/emails',
    requireUser,
    requireOwnershipOrRole('id', 'ADMIN'),
    getUserEmails
);
```

**How it works**:
1. Extracts user ID from route parameter (e.g., `:userId`, `:id`)
2. Checks if authenticated user owns the resource (`user._id === paramId`)
3. If not owner, checks if user has required role(s)
4. Grants access if either condition is true

**Response (403)**:
```json
{
    "success": false,
    "message": "Access denied"
}
```

**Response (400)** - Missing parameter:
```json
{
    "success": false,
    "message": "Invalid request"
}
```

**Logging**:
- Logs whether access was granted due to ownership or role
- Warns when authorization fails

---

### `requireConnectedGoogle`

**Type**: Route-level Middleware  
**File**: `src/middleware/requireConnectedGoogle.ts`

Ensures user has connected their Google account with valid OAuth tokens.  
Required for routes that access Gmail API.

**Usage**:
```typescript
import { requireUser, requireConnectedGoogle } from '../middleware';

// Get user's emails from Gmail
router.get(
    '/emails',
    requireUser,
    requireConnectedGoogle,
    getEmails
);

// Send email via Gmail
router.post(
    '/send',
    requireUser,
    requireConnectedGoogle,
    sendEmail
);
```

**Response (403)**:
```json
{
    "success": false,
    "message": "Google account connection required. Please connect your Google account to access Gmail features.",
    "code": "GOOGLE_NOT_CONNECTED"
}
```

**Logging**:
- Warns when user attempts Gmail access without connection
- Verifies connection in debug logs

---

### `validate`

**Type**: Route-level Middleware  
**File**: `src/middleware/validate.ts`

Validates request data against a Zod schema. Returns 400 with detailed errors
if validation fails.

**Parameters**:
- `schema: ZodSchema` - Zod schema to validate against
- `source: 'body' | 'query' | 'params'` - Which part of request to validate
  (default: `'body'`)

**Usage**:
```typescript
import { validate } from '../middleware';
import { updateUserSchema } from '../schemas/user.schema';
import { z } from 'zod';

// Validate request body
router.put(
    '/profile',
    requireUser,
    validate(updateUserSchema, 'body'),
    updateProfile
);

// Validate route params
const userIdSchema = z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/) });
router.get(
    '/users/:id',
    requireUser,
    validate(userIdSchema, 'params'),
    getUser
);

// Validate query parameters
const searchSchema = z.object({
    query: z.string().min(1),
    limit: z.string().regex(/^\d+$/).optional(),
});
router.get(
    '/search',
    validate(searchSchema, 'query'),
    search
);
```

**Response (400)**:
```json
{
    "success": false,
    "message": "Validation failed",
    "errors": [
        {
            "field": "email",
            "message": "Invalid email address"
        },
        {
            "field": "name",
            "message": "String must contain at least 1 character(s)"
        }
    ]
}
```

**Features**:
- Transforms data according to schema (e.g., defaults, coercion)
- Replaces `req[source]` with validated/transformed data
- Detailed error messages for each invalid field

**Logging**:
- Logs validation success in debug mode
- Warns on validation failures with error details

---

## User Roles

### Role Types

```typescript
type Role = 'USER' | 'ADMIN';
```

### Role Assignment

- **Default**: All users get `['USER']` role on registration
- **Admin**: Must be manually assigned in database
- **Future**: Admin dashboard to manage roles

### Checking Roles in Code

```typescript
const user = req.user as IUser;

// Check if user has admin role
const isAdmin = user.roles.includes('ADMIN');

// Check for any of multiple roles
const hasAccess = user.roles.some(role => ['ADMIN', 'MODERATOR'].includes(role));
```

---

## Common Patterns

### Public Route

No middleware needed:

```typescript
router.get('/health', healthCheck);
```

### Authenticated Users Only

```typescript
router.get('/profile', requireUser, getProfile);
```

### Admins Only

```typescript
router.delete('/users/:id', requireUser, requireRole('ADMIN'), deleteUser);
```

### Self or Admin

```typescript
router.put(
    '/users/:userId/settings',
    requireUser,
    requireOwnershipOrRole('userId', 'ADMIN'),
    updateSettings
);
```

### Gmail Access Required

```typescript
router.post(
    '/send-email',
    requireUser,
    requireConnectedGoogle,
    sendEmail
);
```

### With Validation

```typescript
router.post(
    '/users',
    requireUser,
    requireRole('ADMIN'),
    validate(createUserSchema, 'body'),
    createUser
);
```

### Complex Example

```typescript
// Users can update their own email settings
// Admins can update anyone's settings
// Requires Gmail connection
// Validates request body
router.put(
    '/users/:userId/email-settings',
    requireUser,
    requireOwnershipOrRole('userId', 'ADMIN'),
    requireConnectedGoogle,
    validate(emailSettingsSchema, 'body'),
    updateEmailSettings
);
```

---

## Middleware Order

**Critical**: Middleware order matters!

### Correct Order

```typescript
router.put(
    '/users/:id',
    requireUser,                    // 1. Authenticate first
    requireOwnershipOrRole('id', 'ADMIN'),  // 2. Then authorize
    validate(updateUserSchema),     // 3. Then validate
    updateUser                      // 4. Finally, controller
);
```

### Incorrect Order ❌

```typescript
router.put(
    '/users/:id',
    requireRole('ADMIN'),   // ❌ Wrong! requireUser must come first
    requireUser,
    updateUser
);
```

### Global Order

```typescript
// In app.ts - order is critical
app.use(express.json());           // 1. Parse body
app.use(session({ ... }));         // 2. Setup session
app.use(passport.initialize());    // 3. Init Passport
app.use(passport.session());       // 4. Load user from session
app.use(attachUserFromSession);    // 5. Custom user processing
```

---

## Error Responses

All middleware follows consistent error format:

### 401 Unauthorized

```json
{
    "success": false,
    "message": "Authentication required"
}
```

### 403 Forbidden

```json
{
    "success": false,
    "message": "Insufficient permissions"
}
```

```json
{
    "success": false,
    "message": "Access denied"
}
```

```json
{
    "success": false,
    "message": "Google account connection required...",
    "code": "GOOGLE_NOT_CONNECTED"
}
```

### 400 Bad Request

```json
{
    "success": false,
    "message": "Validation failed",
    "errors": [...]
}
```

---

## Type Definitions

### User Model

```typescript
interface IUser extends Document {
    email: string;
    name: string;
    timeZone: string;
    roles: Role[];
    googleAccessToken?: string;
    googleRefreshToken?: string;
    createdAt: Date;
    updatedAt: Date;
}
```

### Accessing User in Controller

```typescript
import { Request, Response } from 'express';
import { IUser } from '../models/user.model';

export const getProfile = (req: Request, res: Response): void => {
    const user = req.user as IUser;
    
    // Now fully typed!
    console.log(user.email);
    console.log(user.roles);
};
```

---

## Testing

### Mock User for Tests

```typescript
const mockUser: Partial<IUser> = {
    _id: 'mock-user-id',
    email: 'test@example.com',
    name: 'Test User',
    roles: ['USER'],
};

req.user = mockUser;
```

### Mock Admin

```typescript
const mockAdmin: Partial<IUser> = {
    _id: 'mock-admin-id',
    email: 'admin@example.com',
    name: 'Admin User',
    roles: ['ADMIN'],
};
```

---

## Future Enhancements

- [ ] Add `requireScope` for fine-grained permissions
- [ ] Add rate limiting middleware
- [ ] Add API key authentication middleware
- [ ] Add audit logging middleware
- [ ] Implement permission caching
