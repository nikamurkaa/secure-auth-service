# Test plan

## Goal

Verify that the authentication microservice correctly protects registration, login, JWT authentication, role-based access and password reset flow.

## Scope

The test scope includes:

- health endpoint;
- user registration;
- duplicate username validation;
- bcrypt password storage behavior through absence of password fields in responses;
- login with valid and invalid credentials;
- rate limiting for login attempts;
- JWT token issuance;
- admin-only access;
- moderator/admin access;
- single-session protection;
- expired token rejection;
- login attempts audit log;
- one-time password reset token.

## Out of scope

The following areas are intentionally out of scope for this educational lab:

- database persistence;
- real email delivery;
- OAuth 2.0 / OpenID Connect;
- refresh token rotation;
- production deployment;
- distributed rate limiting;
- centralized logging.

## Test levels

- Manual API checks with cURL, PowerShell or Postman.
- Automated integration checks with Node.js built-in test runner.

## Test data

Default demo accounts:

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `AdminPass123!` |
| Moderator | `moderator` | `ModeratorPass123!` |
| User | `user1` | `UserPass123!` |

## Expected security behavior

- Login with a wrong password returns `401 INVALID_CREDENTIALS`.
- The fourth login attempt from the same client inside one minute returns `429 TOO_MANY_LOGIN_ATTEMPTS`.
- A regular user receives `403 FORBIDDEN` on `/admin`.
- An admin receives `200 OK` on `/admin`.
- The API never returns `passwordHash`.
- The second login invalidates the first access token.
- Expired JWT is rejected.
- Password reset token cannot be reused.
