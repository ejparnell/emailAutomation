# Google OAuth Authentication

This document describes the Google OAuth 2.0 authentication flow
implemented in this application.

## Overview

The application uses **Passport.js** with the
**Google OAuth 2.0 strategy** to authenticate users. When a user
successfully authenticates via Google, a new user account is
automatically created in the database (if it doesn't already exist).

## Setup Instructions

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API**:
    - Navigate to "APIs & Services" > "Library"
    - Search for "Google+ API"
    - Click "Enable"
4. Create OAuth 2.0 credentials:
    - Go to "APIs & Services" > "Credentials"
    - Click "Create Credentials" > "OAuth 2.0 Client ID"
    - Configure the OAuth consent screen if prompted
    - Application type: "Web application"
    - Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
    - For production, add your production URL: `https://yourdomain.com/auth/google/callback`
5. Copy the **Client ID** and **Client Secret**

### 2. Configure Environment Variables

Add the following variables to your `.env` file:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Session Secret (generate a random string)
# You can generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=your_random_session_secret_here
```

### 3. Generate Session Secret

Run this command to generate a secure session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as your `SESSION_SECRET` in the `.env` file.

## Authentication Flow

### User Login Flow

1. **User initiates login**: User visits `/auth/google`
2. **Redirect to Google**: User is redirected to Google's
   OAuth consent screen
3. **User authorizes**: User logs in with their Google account
   and authorizes the app
4. **Callback**: Google redirects back to `/auth/google/callback`
   with authorization code
5. **User creation/retrieval**:
    - If user email exists in database: Log them in
    - If user email doesn't exist: Create new user with:
        - Email from Google profile
        - Name from Google profile (defaults to email prefix if not available)
        - Default timezone: "America/New_York"
6. **Success**: User is redirected to `/auth/success` with user data

### Session Management

- Sessions are stored in memory (development) or can be configured
  for Redis/MongoDB (production)
- Session cookie expires after **24 hours**
- Cookies are:
  - **httpOnly**: Cannot be accessed via JavaScript (XSS protection)
  - **secure**: Only sent over HTTPS in production
  - **sameSite**: CSRF protection

## API Endpoints

### Public Endpoints

#### `GET /auth/google`

Initiates Google OAuth login flow

**Response**: Redirects to Google OAuth consent screen

**Example**:

```bash
# In browser, navigate to:
http://localhost:3000/auth/google
```

---

#### `GET /auth/google/callback`

OAuth callback endpoint (called by Google after user authorization)

**Response**: Redirects to `/auth/success` or `/auth/failure`

**Note**: This endpoint is called automatically by Google.
You should not call it directly.

---

#### `GET /auth/success`

OAuth success handler

**Response**:

```json
{
    "success": true,
    "message": "Authentication successful",
    "user": {
        "id": "507f1f77bcf86cd799439011",
        "email": "user@example.com",
        "name": "John Doe",
        "timeZone": "America/New_York"
    }
}
```

---

#### `GET /auth/failure`

OAuth failure handler

**Response**:

```json
{
    "success": false,
    "message": "Authentication failed"
}
```

---

### Protected Endpoints

These endpoints require authentication. The user must be logged in.

#### `GET /auth/user`

Get current authenticated user's information

**Response** (authenticated):

```json
{
    "success": true,
    "user": {
        "id": "507f1f77bcf86cd799439011",
        "email": "user@example.com",
        "name": "John Doe",
        "timeZone": "America/New_York"
    }
}
```

**Response** (not authenticated):

```json
{
    "success": false,
    "message": "Not authenticated"
}
```

---

#### `GET /auth/logout`

Logout current user and destroy session

**Response**:

```json
{
    "success": true,
    "message": "Logged out successfully"
}
```

## Security Features

### OAuth-Only Authentication

This application uses **OAuth-only authentication** through Google.
Users cannot create accounts or login with email and password.

When a user is created via OAuth:

1. User's email is obtained from their Google profile
2. User's name is obtained from Google profile, or defaults to the
   email prefix if not provided
3. **No password** is stored - users can only authenticate via Google OAuth
4. User can update their name and timezone in their profile settings

This approach:

- Eliminates password-related security concerns
- Leverages Google's secure authentication
- Provides seamless login experience
- Requires users to have a valid Google account

### User Data Privacy

When user data is returned in API responses:

- Only safe fields are returned: `id`, `email`, `name`, `timeZone`,
  `createdAt`, `updatedAt`
- MongoDB's `_id` is converted to `id` for consistency
- `__v` version field is removed

### Session Security

- Sessions use a secret key (must be configured in production)
- Cookies are httpOnly (not accessible via JavaScript)
- Cookies are secure in production (HTTPS only)
- Sessions expire after 24 hours
- Sessions are destroyed on logout

## Testing the OAuth Flow

### Manual Testing (Browser)

1. Ensure your `.env` file has valid Google OAuth credentials
2. Start the server: `npm run dev`
3. Open browser and navigate to: `http://localhost:3000/auth/google`
4. You'll be redirected to Google's login page
5. After successful login, you'll be redirected back to your app
6. Check the response at `/auth/success`

### Check Current User

After logging in, you can check your session:

```bash
curl -X GET http://localhost:3000/auth/user \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

### Logout

```bash
curl -X GET http://localhost:3000/auth/logout \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

## Production Deployment

### Required Changes for Production

1. **Update OAuth Callback URL**:
    - Add your production domain to Google Cloud Console
    - Update `GOOGLE_CALLBACK_URL` in `.env`:

        ```bash
        GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
        ```

2. **Session Store**:
    - Current implementation uses memory store (not suitable for production)
    - Use Redis or MongoDB for session storage:

        ```bash
        npm install connect-redis redis
        # or
        npm install connect-mongo
        ```

3. **Session Secret**:
    - Generate a strong, random secret
    - Never commit this to version control
    - Use environment variables or secret management service

4. **HTTPS**:
    - Enable HTTPS in production
    - Session cookies will automatically be secure

5. **CORS**:
    - Update `CORS_ORIGIN` to your frontend domain
    - Don't use `*` in production

## Troubleshooting

### "Google OAuth credentials not configured" Warning

**Cause**: Missing `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` in `.env`

**Solution**: Add the credentials from Google Cloud Console to your `.env` file

---

### "Authentication failed" Error

**Possible causes**:

- Invalid OAuth credentials
- Callback URL mismatch
- User denied authorization
- Google+ API not enabled

**Solution**: Check logs for specific error message

---

### "Not authenticated" on Protected Routes

**Cause**: User session not established or expired

**Solution**: Login again via `/auth/google`

---

### Session Not Persisting

**Cause**: Missing session secret or cookie not being sent

**Solution**:

- Ensure `SESSION_SECRET` is set in `.env`
- Check that cookies are being sent in requests
- For cross-origin requests, set `credentials: 'include'` in fetch/axios

## File Structure

```text
src/
├── config/
│   └── passport.ts          # Passport configuration and Google OAuth strategy
├── controllers/
│   └── auth.controller.ts   # Authentication handlers
├── routes/
│   └── auth.routes.ts       # Authentication routes
├── models/
│   └── user.model.ts        # User model (with OAuth support)
└── app.ts                   # Express app with session and passport middleware
```

## Additional Resources

- [Passport.js Documentation](http://www.passportjs.org/)
- [Passport Google OAuth20 Strategy](https://github.com/jaredhanson/passport-google-oauth2)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Express Session Documentation](https://github.com/expressjs/session)
