# JWT Session Refresh Implementation

## Overview

This document describes the implementation of JWT refresh tokens to solve the "Invalid token" error that occurred when users returned to a session after the access token had expired.

## Problem

The original implementation had several issues:
1. **No refresh token mechanism**: Only access tokens were issued with a 7-day expiration
2. **Token expiration handling**: When tokens expired, users got "Invalid token" errors instead of automatic refresh
3. **No automatic token refresh**: NextAuth was configured to use JWT strategy but didn't handle token refresh
4. **Existing sessions**: Users with existing sessions don't have refresh tokens and need to re-authenticate

## Solution

### Backend Changes

#### 1. Updated Auth Controller (`backend/src/controllers/auth.controller.ts`)

- **Modified `verifyOTP` function**:
  - Now generates both access token (1 hour expiration) and refresh token (7 days expiration)
  - Stores refresh token in Redis for blacklisting capability
  - Returns both tokens in the response

- **Added `refreshToken` function**:
  - Validates refresh token and checks if it's blacklisted
  - Generates new access token if refresh token is valid
  - Returns new access token and same refresh token

- **Added `logout` function**:
  - Blacklists refresh token on logout

#### 2. Updated Auth Routes (`backend/src/routes/auth.ts`)

- **Added `/refresh` endpoint**: Handles token refresh requests
- **Added `/logout` endpoint**: Handles user logout and token blacklisting
- **Updated `/otp/verify` endpoint**: Returns both access and refresh tokens

#### 3. Updated Types (`backend/src/types/index.ts`)

- **Modified `AuthResponse` interface**: Now includes both `accessToken` and `refreshToken`

### Frontend Changes

#### 1. Updated NextAuth Configuration (`frontend/src/app/api/auth/[...nextauth]/route.ts`)

- **Enhanced JWT callback**: 
  - Stores refresh token in JWT
  - Tracks access token expiration time
  - Automatically refreshes tokens when expired
  - Handles cases where refresh token is missing
- **Added `refreshAccessToken` function**: Handles token refresh logic
- **Updated session callback**: Includes refresh token in session and handles errors

#### 2. Updated Type Definitions (`frontend/src/types/next-auth.d.ts`)

- **Extended interfaces**: Added `refreshToken` and `accessTokenExpires` to JWT and Session types
- **Fixed userType consistency**: Made all userType declarations consistent

#### 3. Created API Client (`frontend/src/lib/api-client.ts`)

- **Automatic token management**: 
  - Adds access token to all requests automatically
  - Handles 401 errors by attempting token refresh
  - Retries failed requests with new tokens
  - Signs out user if refresh fails
- **Request/Response interceptors**: Handle authentication and error responses
- **Raw request method**: For special cases like blob downloads

#### 4. Updated Middleware (`frontend/src/middleware.ts`)

- **Enhanced authorization checks**: 
  - Validates token existence and refresh token presence
  - Redirects to login for invalid or expired sessions
  - Handles refresh token errors gracefully

#### 5. Updated All Pages

- **Dashboard page**: Uses new API client instead of direct axios calls
- **Security dashboard**: Updated for automatic token refresh
- **Admin pages**: Updated for automatic token refresh
- **Security history**: Updated for automatic token refresh

## Handling Existing Sessions

### Problem
Users with existing sessions (created before the refresh token implementation) don't have refresh tokens stored in their JWT. When their access tokens expire, the refresh mechanism fails.

### Solution
1. **Middleware Check**: The middleware now checks for the presence of `refreshToken` in the JWT
2. **Automatic Redirect**: Users without refresh tokens are automatically redirected to login
3. **Session Clear Page**: A `/clear-session` page is available to manually clear sessions

### Migration Steps
1. **For existing users**: They will be automatically redirected to login when their session expires
2. **For new users**: They will get both access and refresh tokens from the start
3. **Manual clearing**: Users can visit `/clear-session` to force re-authentication

## Token Flow

### 1. Initial Authentication
```
User Login → OTP Verification → Backend generates:
- Access Token (1 hour)
- Refresh Token (7 days)
```

### 2. Normal API Requests
```
Frontend Request → API Client adds access token → Backend validates → Response
```

### 3. Token Expiration Handling
```
API Request → 401 Error → API Client detects → Refresh token request → New access token → Retry original request
```

### 4. Refresh Token Expiration
```
Refresh attempt → 401 Error → Sign out user → Redirect to login
```

### 5. Missing Refresh Token (Existing Sessions)
```
Session check → No refresh token → Redirect to login → Re-authenticate
```

## Security Features

1. **Short-lived access tokens**: 1 hour expiration reduces risk
2. **Long-lived refresh tokens**: 7 days for user convenience
3. **Token blacklisting**: Refresh tokens are invalidated on logout
4. **Automatic cleanup**: Expired tokens are handled gracefully
5. **Secure storage**: Tokens stored in NextAuth session
6. **Session validation**: Middleware ensures valid sessions

## Configuration

### Environment Variables
- `JWT_SECRET`: Secret key for token signing
- `NEXT_PUBLIC_API_URL`: Backend API URL

### Token Expiration Times
- **Access Token**: 1 hour (configurable in auth controller)
- **Refresh Token**: 7 days (configurable in auth controller)

## Testing

### Manual Testing
1. Login to the application
2. Wait for access token to expire (1 hour)
3. Perform any action (should automatically refresh)
4. Check browser network tab for refresh requests

### Testing Existing Sessions
1. Login with an existing session
2. Wait for token expiration or visit `/clear-session`
3. Verify redirect to login page
4. Re-authenticate to get new tokens

### Automated Testing
- Test token refresh flow
- Test logout and token blacklisting
- Test expired refresh token handling
- Test existing session migration

## Benefits

1. **Improved UX**: Users don't get logged out unexpectedly
2. **Better Security**: Short-lived access tokens with automatic refresh
3. **Seamless Experience**: No manual token management required
4. **Robust Error Handling**: Graceful degradation when tokens expire
5. **Scalable**: Works across all pages and components
6. **Backward Compatible**: Handles existing sessions gracefully

## Future Improvements

1. **Refresh token rotation**: Generate new refresh tokens on each refresh
2. **Token revocation**: Add endpoint to revoke specific tokens
3. **Session management**: Add ability to view and manage active sessions
4. **Rate limiting**: Add rate limiting to refresh endpoint
5. **Audit logging**: Log token refresh events for security monitoring
6. **Progressive migration**: Gradually migrate existing sessions to new system 