# Manual checks

Run the API first:

```bash
npm start
```

Base URL:

```text
http://localhost:3000
```

## 1. Health check

```bash
curl http://localhost:3000/health
```

Expected result: `200 OK`.

## 2. Register a user

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"new_user","displayName":"<b>New User</b>","email":"new-user@example.com","password":"NewUserPass123!"}'
```

Expected result: `201 CREATED`.

The response must not contain:

- `passwordHash`;
- `activeSessionId`;
- reset token internals.

The `displayName` value must be escaped.

## 3. Login with wrong password

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user1","password":"wrong-password"}'
```

Expected result: `401 INVALID_CREDENTIALS`.

## 4. Login rate limit

Repeat the wrong password request 4 times in one minute.

Expected result on the fourth attempt: `429 TOO_MANY_LOGIN_ATTEMPTS`.

## 5. Login as regular user

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user1","password":"UserPass123!"}'
```

Expected result: `200 OK` with `accessToken`.

Save token to a variable if your shell supports it, or copy it manually.

## 6. Check current user

```bash
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer <userAccessToken>"
```

Expected result: `200 OK`.

## 7. Try admin route as regular user

```bash
curl http://localhost:3000/admin \
  -H "Authorization: Bearer <userAccessToken>"
```

Expected result: `403 FORBIDDEN`.

## 8. Login as admin

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"AdminPass123!"}'
```

Expected result: `200 OK` with `accessToken`.

## 9. Check admin route

```bash
curl http://localhost:3000/admin \
  -H "Authorization: Bearer <adminAccessToken>"
```

Expected result: `200 OK`.

## 10. Check login attempts log

```bash
curl http://localhost:3000/auth/login-attempts \
  -H "Authorization: Bearer <adminAccessToken>"
```

Expected result: `200 OK` with audit log array.

## 11. Check single-session protection

1. Login as the same user two times.
2. Try to call `/auth/me` with the first token.

Expected result for the first token: `401 UNAUTHORIZED` with `SESSION_EXPIRED` in details.

## 12. Request password reset token

```bash
curl -X POST http://localhost:3000/auth/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{"username":"user1"}'
```

Expected result: `200 OK` with `demoResetToken` in the educational demo response.

## 13. Confirm password reset

```bash
curl -X POST http://localhost:3000/auth/password-reset/confirm \
  -H "Content-Type: application/json" \
  -d '{"token":"<demoResetToken>","newPassword":"ChangedPass123!"}'
```

Expected result: `200 OK`.

Repeat the same request with the same token.

Expected result: `400 INVALID_RESET_TOKEN`.
