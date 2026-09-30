# Task ID: 3

**Title:** Authentication System Integration

**Status:** done

**Dependencies:** 1 ⧖, 2 ⧖

**Priority:** high

**Description:** ARCHIVED 2025 wording. Implemented as local email/password + JWT (AUTH_SECRET / HS256), host/attendee roles on UserEntity. Auth0 was not used.

**Details:**

1. User entity with email/password (scrypt) and roles
2. Login, register, logout, and session cookie in Next.js
3. JwtAuthGuard on Nest using AUTH_SECRET (not Auth0 JWKS)
4. Role-based access control (host vs attendee)
5. Password reset is a first-party Nest flow (see master task 6), not Auth0 hosted email

**Test Strategy:**

Test authentication flows with mock users. Verify that protected routes require authentication. Test role-based access control to ensure hosts and attendees have appropriate permissions.

## Subtasks

### 3.1. Local auth configuration

**Status:** done  
**Dependencies:** None  

AUTH_SECRET, JWT issuer/audience, User entity for frontend and backend

**Details:**

Use AUTH_SECRET (32+ chars) to sign HS256 JWTs. No Auth0 tenant, callbacks, or JWKS. Store credentials in .env examples only.

### 3.2. Frontend Authentication Implementation

**Status:** done  
**Dependencies:** 3.1  

Implement login, signup, and logout flows in the Next.js frontend application

**Details:**

Local login/register pages and session cookie (frontend/lib/auth.tsx). No Auth0 SDK. Protected route wrappers redirect unauthenticated users.

### 3.3. Backend Authentication Middleware

**Status:** done  
**Dependencies:** 3.1  

Create protected routes and JWT guard in the NestJS backend

**Details:**

JwtAuthGuard verifies AUTH_SECRET HS256 tokens. Attach user id and roles from UserEntity. No FastAPI and no Auth0 JWKS.

### 3.4. Role-Based Access Control

**Status:** done  
**Dependencies:** 3.2, 3.3  

Implement role-based access control system for different user types (host vs. attendee)

**Details:**

JwtAuthGuard verifies HS256 JWTs with AUTH_SECRET. Roles live on UserEntity, not a third-party IdP. Frontend and backend both gate host vs attendee.

### 3.5. Password Reset and Email Verification

**Status:** cancelled  
**Dependencies:** 3.1, 3.2, 3.3  

Password reset and email verification as first-party Nest/Next flows (not Auth0)

**Details:**

Auth0-hosted password reset was cancelled. Local forgot-password / reset-password shipped later under master auth security. Email verification remains optional.
<info added on 2026-09-03T11:08:48Z>
Cancelled as an Auth0 feature. Do not add Auth0 email templates.
</info>
