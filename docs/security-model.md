# Security model

This project is an educational authentication security lab. It demonstrates how a small authentication microservice can protect registration, login and role-based routes.

## Protected risks

### 1. Plaintext password storage

Passwords are never stored in plaintext. The service uses `bcryptjs`:

- bcrypt generates a salt automatically;
- only `passwordHash` is stored internally;
- `passwordHash` is never returned in API responses.

### 2. Brute-force login attempts

`POST /auth/login` is protected with `express-rate-limit`.

Default settings:

- 3 requests;
- 1 minute window;
- JSON error response with `TOO_MANY_LOGIN_ATTEMPTS`.

### 3. Token misuse

The service issues signed JWT access tokens.

Default settings:

- `JWT_EXPIRES_IN=15m`;
- token payload contains `userId`, `role` and `sessionId`;
- expired or invalid tokens are rejected by authentication middleware.

### 4. Parallel sessions

Each successful login creates a new `activeSessionId` for the user.

The JWT contains this `sessionId`. When the same user logs in again, the previous session ID is replaced, so the old token is rejected with `SESSION_EXPIRED`.

### 5. Broken Function Level Authorization

Protected routes use role-based middleware:

- `/user` accepts any authenticated user;
- `/moderator` accepts `moderator` and `admin`;
- `/admin` accepts only `admin`;
- `/auth/login-attempts` accepts only `admin`.

### 6. Sensitive data exposure

Public responses are created through DTOs. They do not expose:

- `passwordHash`;
- `activeSessionId`;
- password reset token hash;
- password reset expiration fields.

### 7. XSS through reflected user data

User-controlled fields such as `username` and `displayName` are escaped before they are returned in public DTOs.

### 8. Login audit trail

Every login attempt is logged in memory with:

- timestamp;
- username;
- success flag;
- reason;
- IP;
- user agent.

The log is available only to admin users.

### 9. Password reset

The demo password reset flow uses one-time tokens:

- raw reset token is returned only in the educational demo response;
- internally the service stores only SHA-256 hash of the token;
- token has TTL;
- token can be used only once;
- after successful password change, active session is invalidated.

## Demo limitations

This is not a production authentication system. The project intentionally uses an in-memory user store to keep the lab easy to run locally.

For production, add:

- persistent database;
- HTTPS/TLS;
- secure refresh token flow;
- HttpOnly/SameSite cookies if tokens are stored in cookies;
- centralized audit logging;
- stronger password policy;
- email delivery for password reset;
- account lockout strategy;
- proper secrets management;
- monitoring and alerting.
