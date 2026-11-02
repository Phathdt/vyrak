/**
 * Mock Artifact Content for Workflow Execution Tests
 */

export const MOCK_PRD_CONTENT = `# Product Requirements Document: User Authentication System

## 1. Overview
**Purpose:** Implement secure user authentication with JWT tokens
**Goals:** Enable users to register, login, and access protected resources
**Target Users:** End users of the application

## 2. Scope
**In Scope:**
- User registration with email/password
- Login with JWT token generation
- Token validation middleware
- Password hashing with bcrypt

**Out of Scope:**
- OAuth/Social login
- Two-factor authentication
- Password reset functionality

## 3. User Stories
As a user, I want to register with email and password so that I can access the application.
As a user, I want to login and receive a token so that I can make authenticated requests.
As a developer, I want to protect routes with authentication so that only logged-in users can access them.

## 4. Functional Requirements
| ID | Requirement | Priority |
|---|---|---|
| FR-01 | System shall validate email format | Must |
| FR-02 | System shall hash passwords with bcrypt | Must |
| FR-03 | System shall generate JWT tokens on login | Must |
| FR-04 | System shall validate JWT tokens on protected routes | Must |
| FR-05 | System shall return 401 for invalid/missing tokens | Must |

## 5. Non-Functional Requirements
- Performance: Login < 500ms
- Security: Passwords never stored in plain text
- Security: JWT tokens expire after 24 hours

## 6. Acceptance Criteria
**Feature must satisfy:**
- User can register with valid email and password
- User can login and receive JWT token
- Protected routes reject requests without valid tokens
- Password is hashed before storage
- Tests cover registration, login, and authentication flows
`

export const MOCK_ADR_CONTENT = `# ADR-001: Use JWT for Authentication

**Status:** Accepted
**Date:** 2026-11-02
**Decision Makers:** Engineering Team
**Tags:** #authentication #security

## Context
We need a stateless authentication mechanism for our REST API that supports distributed deployments without requiring session storage.

## Decision
Use JSON Web Tokens (JWT) with HS256 algorithm for authentication.

## Alternatives Considered

### Option 1: JWT with HS256 (Chosen)
**Pros:**
- Stateless authentication
- Easy to implement
- Works across distributed systems
- No server-side session storage needed

**Cons:**
- Cannot revoke tokens before expiration
- Slightly larger request payload

### Option 2: Session-based authentication
**Pros:**
- Easy to revoke sessions
- Smaller cookie size

**Cons:**
- Requires session store (Redis)
- Adds infrastructure complexity
- Doesn't scale as easily

## Consequences

**Positive:**
- Simplified architecture without session store
- Better horizontal scalability
- JWT tokens can contain user claims

**Negative:**
- Must wait for token expiration to "revoke" access
- Need to implement token refresh mechanism

## Implementation Notes
- Use jsonwebtoken library
- Store secret in environment variables
- Set expiration to 24 hours
- Include user ID and role in token payload
`

export const MOCK_IMPLEMENTATION_PLAN_CONTENT = `# Implementation Plan: User Authentication System

**Created:** 2026-11-02
**Status:** Draft
**Estimated Effort:** 8 hours

## Goals
- Implement secure user registration
- Implement JWT-based login
- Protect routes with authentication middleware

## Phases

### Phase 1: Database Schema
**Goal:** Create User model
**Duration:** 1 hour

**Tasks:**
1. [ ] Create User model with email, passwordHash, createdAt
2. [ ] Add unique constraint on email
3. [ ] Create Prisma migration

### Phase 2: Registration Endpoint
**Goal:** Allow users to register
**Duration:** 2 hours

**Tasks:**
1. [ ] Create AuthService with register method
2. [ ] Hash password with bcrypt
3. [ ] Validate email format
4. [ ] Create POST /auth/register endpoint
5. [ ] Add registration tests

### Phase 3: Login Endpoint
**Goal:** Generate JWT tokens
**Duration:** 2 hours

**Tasks:**
1. [ ] Create AuthService login method
2. [ ] Verify password with bcrypt.compare
3. [ ] Generate JWT token with user payload
4. [ ] Create POST /auth/login endpoint
5. [ ] Add login tests

### Phase 4: Authentication Middleware
**Goal:** Protect routes
**Duration:** 2 hours

**Tasks:**
1. [ ] Create JWT verification middleware
2. [ ] Extract and validate token from Authorization header
3. [ ] Attach user to request object
4. [ ] Handle token expiration and invalid tokens
5. [ ] Add middleware tests

### Phase 5: Integration Testing
**Goal:** Verify end-to-end flow
**Duration:** 1 hour

**Tasks:**
1. [ ] Test registration -> login -> protected route flow
2. [ ] Test error cases (invalid credentials, expired tokens)
3. [ ] Test security (password not returned in responses)
`

export const MOCK_CODE_REVIEW_REPORT = `# Code Review Report: User Authentication System

**Reviewed:** 2026-11-02
**Reviewer:** AI Code Review Agent
**Workflow:** User Authentication System

## Summary
Overall code quality is good with a few minor improvements needed. No critical security issues found.

## Findings

### 1. Password Hashing - PASSED ✅
**Severity:** N/A
**File:** src/auth/auth.service.ts
**Finding:** Passwords are correctly hashed with bcrypt (10 rounds). Good security practice.

### 2. JWT Secret Management - WARNING ⚠️
**Severity:** Medium
**File:** src/auth/auth.service.ts
**Line:** 45
**Finding:** JWT secret is loaded from environment variable but no validation that it exists on startup.
**Recommendation:** Add startup validation to ensure JWT_SECRET is set before application starts.

### 3. Token Expiration - PASSED ✅
**Severity:** N/A
**File:** src/auth/auth.service.ts
**Finding:** JWT tokens have 24h expiration as per requirements.

### 4. Error Handling - MINOR 🔵
**Severity:** Low
**File:** src/auth/auth.controller.ts
**Line:** 67
**Finding:** Generic error messages could leak information about user existence.
**Recommendation:** Return same error message for "user not found" and "invalid password" to prevent user enumeration.

### 5. Input Validation - PASSED ✅
**Severity:** N/A
**File:** src/auth/auth.dto.ts
**Finding:** Email validation uses proper Zod schema with email format check.

### 6. Test Coverage - PASSED ✅
**Severity:** N/A
**Finding:** All major paths have unit tests. Integration test covers full registration -> login flow.

## Statistics
- Files Reviewed: 8
- Critical Issues: 0
- High Issues: 0
- Medium Issues: 1
- Low Issues: 1
- Passed Checks: 4

## Recommendations
1. Add JWT_SECRET validation on application startup
2. Unify error messages in login to prevent user enumeration
3. Consider adding rate limiting on auth endpoints (future work)

## Approval Status
**Recommended for approval** with minor fixes applied.
`

export const MOCK_QA_REPORT = `# QA Verification Report: User Authentication System

**Tested:** 2026-11-02
**QA Agent:** AI QA Verification Agent
**Workflow:** User Authentication System

## Summary
All acceptance criteria PASSED. Implementation meets requirements with full test coverage.

## Acceptance Criteria Verification

### FR-01: System shall validate email format
**Status:** ✅ PASS
**Evidence:** Email validation tested with valid/invalid formats. Invalid formats are rejected with 400 error.

### FR-02: System shall hash passwords with bcrypt
**Status:** ✅ PASS
**Evidence:** Passwords stored as bcrypt hashes. Plain text password never appears in database or logs.

### FR-03: System shall generate JWT tokens on login
**Status:** ✅ PASS
**Evidence:** Login endpoint returns valid JWT token. Token contains user ID and expiration.

### FR-04: System shall validate JWT tokens on protected routes
**Status:** ✅ PASS
**Evidence:** Protected routes reject requests without tokens (401). Valid tokens allow access.

### FR-05: System shall return 401 for invalid/missing tokens
**Status:** ✅ PASS
**Evidence:** Tested expired tokens, malformed tokens, and missing Authorization header. All return 401.

## Non-Functional Requirements

### Performance: Login < 500ms
**Status:** ✅ PASS
**Measurement:** Average login time: 287ms (57% faster than requirement)

### Security: Passwords never stored in plain text
**Status:** ✅ PASS
**Evidence:** Database inspection shows only bcrypt hashes. Password field properly excluded from responses.

### Security: JWT tokens expire after 24 hours
**Status:** ✅ PASS
**Evidence:** Token expiration verified at 24 hours. Expired tokens properly rejected.

## Test Results

### Unit Tests
- Total: 23
- Passed: 23
- Failed: 0
- Coverage: 94%

### Integration Tests
- Total: 8
- Passed: 8
- Failed: 0

### E2E Scenarios
- Registration flow: ✅ PASS
- Login flow: ✅ PASS
- Protected route access: ✅ PASS
- Invalid credentials: ✅ PASS
- Expired token: ✅ PASS

## Edge Cases Tested
- Empty email/password: Properly rejected
- SQL injection attempts: Sanitized by Prisma
- Very long passwords: Handled correctly
- Concurrent registrations: No race conditions

## Overall Assessment
**APPROVED FOR PRODUCTION**

All acceptance criteria met. No blocking issues found. System ready for deployment.
`

export const MOCK_IMPLEMENTATION_REPORT = `# Implementation Report: Task - Create AuthService

**Task:** Create authentication service with registration and login
**Executed:** 2026-11-02
**Duration:** 1.5 hours
**Status:** COMPLETED

## Changes Made

### Files Created
- src/auth/auth.service.ts (AuthService class)
- src/auth/auth.dto.ts (RegisterDto, LoginDto)
- src/auth/auth.controller.ts (REST endpoints)
- src/auth/auth.service.spec.ts (Unit tests)

### Files Modified
- src/app.module.ts (Added AuthModule import)
- prisma/schema.prisma (Added User model)

## Implementation Summary

Created a complete authentication system with:
1. User registration with email/password
2. Password hashing using bcrypt (10 rounds)
3. JWT token generation on login
4. Authentication middleware for protected routes
5. Comprehensive test coverage

## Key Code Snippets

### Password Hashing
\`\`\`typescript
async register(email: string, password: string): Promise<User> {
  const passwordHash = await bcrypt.hash(password, 10)
  return this.userRepository.create({ email, passwordHash })
}
\`\`\`

### JWT Generation
\`\`\`typescript
async login(email: string, password: string): Promise<string> {
  const user = await this.userRepository.findByEmail(email)
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new UnauthorizedException('Invalid credentials')
  }
  return this.jwtService.sign({ userId: user.id }, { expiresIn: '24h' })
}
\`\`\`

## Tests Added
- Registration with valid credentials
- Registration with duplicate email (409 error)
- Login with valid credentials
- Login with invalid credentials (401 error)
- JWT token validation
- Password hashing verification

## Validation
- ✅ All tests passing
- ✅ TypeScript compilation successful
- ✅ Lint checks passing
- ✅ Code follows project conventions

## Next Steps
None. Task complete and ready for code review.
`
