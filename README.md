**English** | [Русский](README.ru.md)

# Secure Auth Service

**Secure Auth Service** is an educational backend security lab built with **Node.js + Express**, focused on secure authentication, session management, and role-based access control.

The project demonstrates both the authentication happy path and protection against common mistakes: unsafe password storage, brute force, excessive privileges, internal field exposure, and reset token reuse.

> This is an educational security lab, not a production-ready identity provider.

## Skills demonstrated

- registration and login flows;
- bcrypt password hashing with salt;
- short-lived JWT access tokens;
- RBAC for `user`, `moderator`, and `admin`;
- rate limiting for `/auth/login`;
- single-session protection: a new login invalidates the previous session;
- public DTOs without `passwordHash` or internal session/reset fields;
- an audit log of successful and failed login attempts;
- a single-use password reset token stored as a hash;
- a consistent JSON error format;
- OpenAPI, Postman, automated tests, and GitHub Actions CI.

## Tech stack

- Node.js
- Express
- JavaScript
- bcryptjs
- JSON Web Token
- express-rate-limit
- Node.js Test Runner
- OpenAPI
- Postman
- GitHub Actions

## Architecture

```text
Client
  │
  ▼
Express routes
  │
  ├── auth middleware ──► JWT / RBAC checks
  │
  ├── auth service ─────► password/session/reset logic
  │
  └── public DTO ───────► filtered API response
```

Main directories:

```text
secure-auth-service/
├── src/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── data/
│   └── utils/
├── tests/
├── docs/
├── postman/
├── .github/workflows/ci.yml
├── .env.example
├── package.json
└── README.md
```

## Local setup

Use Node.js 22 (minimum 18). Check `node --version`.

Run the commands from the repository root. In PowerShell, copy the environment file
with `Copy-Item .env.example .env`.

```bash
git clone https://github.com/nikamurkaa/secure-auth-service.git
cd secure-auth-service
npm ci
cp .env.example .env
node --env-file=.env src/server.js
```

The command above targets Node.js 22 and explicitly loads `.env`.
`npm start` uses only process environment variables and built-in defaults;
the script does not read `.env` on its own.

By default, the API is available at:

```text
http://localhost:3000
```

Stop the server with `Ctrl+C`.

Example `.env`:

```env
PORT=3000
JWT_SECRET=change-this-secret-in-real-projects
JWT_EXPIRES_IN=15m
LOGIN_RATE_LIMIT_WINDOW_MS=60000
LOGIN_RATE_LIMIT_MAX=3
PASSWORD_RESET_TOKEN_TTL_MS=600000
```

## Demo accounts

The credentials below are **local demonstration data for this project**, not real accounts.

| Role | Username | Password |
| --- | --- | --- |
| Admin | `admin` | `AdminPass123!` |
| Moderator | `moderator` | `ModeratorPass123!` |
| User | `user1` | `UserPass123!` |

## Main endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Health check |
| `POST` | `/auth/register` | Register |
| `POST` | `/auth/login` | Log in |
| `GET` | `/auth/me` | Current user |
| `POST` | `/auth/logout` | Invalidate the current session |
| `GET` | `/user` | Route for authenticated users |
| `GET` | `/moderator` | Route for moderator/admin |
| `GET` | `/admin` | Admin-only route |
| `GET` | `/auth/login-attempts` | Admin audit log |
| `POST` | `/auth/password-reset/request` | Create a reset token |
| `POST` | `/auth/password-reset/confirm` | Change password |

## Security controls

| Risk | Implementation |
| --- | --- |
| Password exposure | bcrypt hash + salt |
| Brute force | login rate limiting |
| Excessive privileges | RBAC middleware |
| Old active sessions | `activeSessionId` invalidates the previous JWT |
| Internal field exposure | public DTO / response filtering |
| Reset token reuse | single-use token + SHA-256 hash |
| Missing audit trail | login attempt log |

See [`docs/security-model.md`](docs/security-model.md) for details.

## Security control demonstrations

### Role-Based Access Control

A regular user is successfully authenticated but lacks permission to access the admin-only endpoint. RBAC middleware returns `403 Forbidden`.

![Secure Auth Service — RBAC access denied](docs/assets/secure-auth-rbac-forbidden.png)

### Login rate limiting

Repeated failed login attempts are restricted by the rate limiter. Once the configured limit is reached, the API returns `429 Too Many Requests`.

![Secure Auth Service — login rate limiting](docs/assets/secure-auth-rate-limit.png)

### Single-session protection

A new login creates a new active session and invalidates the previous JWT. Requests using the old token are rejected as an expired session.

![Secure Auth Service — session invalidation](docs/assets/secure-auth-session-invalidation.png)

## Verification

```bash
npm test
npm run check
```

Tests cover registration, sensitive data filtering, login/rate limiting, JWT/RBAC, session invalidation, expired tokens, audit logs, and password reset.

Manual scenarios: [`docs/manual-checks.md`](docs/manual-checks.md).  
OpenAPI: [`docs/openapi.yaml`](docs/openapi.yaml).  
Postman: [`postman/`](postman/).

## CI

`.github/workflows/ci.yml` installs dependencies, performs checks, and runs automated tests. The project's GitHub Actions workflow has run successfully.

## Status

Completed as an educational security lab on **authentication security, access control, and API hardening**.

## Author

[Nicole Zhurbenko](https://github.com/nikamurkaa)
