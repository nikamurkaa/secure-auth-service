const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const { createApp } = require('../src/app');

let server;
let baseUrl;
let requestCounter = 0;

function request(path, options = {}) {
  requestCounter += 1;
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      'x-client-id': `test-client-${requestCounter}`,
      ...(options.headers || {})
    }
  });
}

function jsonBody(body) {
  return JSON.stringify(body);
}

function authHeader(token) {
  return { authorization: `Bearer ${token}` };
}

async function login(username, password, headers = {}) {
  const response = await request('/auth/login', {
    method: 'POST',
    headers,
    body: jsonBody({ username, password })
  });
  const body = await response.json();

  return { response, body };
}

before(async () => {
  const app = createApp({
    auth: {
      jwtSecret: 'test-secret',
      jwtExpiresIn: '15m'
    },
    loginRateLimit: {
      windowMs: 60000,
      max: 3
    }
  });

  server = app.listen(0);

  await new Promise(resolve => server.once('listening', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
});

test('health endpoint returns service status', async () => {
  const response = await request('/health');
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.service, 'secure-auth-service');
});

test('user can register and passwordHash is not exposed', async () => {
  const response = await request('/auth/register', {
    method: 'POST',
    body: jsonBody({
      username: 'new_user',
      displayName: '<b>New User</b>',
      email: 'new-user@example.com',
      password: 'NewUserPass123!'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.username, 'new_user');
  assert.equal(body.displayName, '&lt;b&gt;New User&lt;/b&gt;');
  assert.equal(body.role, 'user');
  assert.equal('passwordHash' in body, false);
});

test('duplicate username is rejected', async () => {
  const response = await request('/auth/register', {
    method: 'POST',
    body: jsonBody({ username: 'user1', password: 'UserPass123!' })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'VALIDATION_ERROR');
});

test('login with wrong password is rejected and logged', async () => {
  const { response, body } = await login('user1', 'wrong-password');

  assert.equal(response.status, 401);
  assert.equal(body.error.code, 'INVALID_CREDENTIALS');
});

test('login endpoint is rate limited after three failed attempts per minute', async () => {
  const headers = { 'x-client-id': 'rate-limit-client' };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { response } = await login('user1', 'bad-password', headers);
    assert.equal(response.status, 401);
  }

  const { response, body } = await login('user1', 'bad-password', headers);

  assert.equal(response.status, 429);
  assert.equal(body.error.code, 'TOO_MANY_LOGIN_ATTEMPTS');
});

test('login returns short-lived JWT access token', async () => {
  const { response, body } = await login('user1', 'UserPass123!');

  assert.equal(response.status, 200);
  assert.equal(typeof body.accessToken, 'string');
  assert.equal(body.tokenType, 'Bearer');
  assert.equal(body.expiresIn, '15m');
  assert.equal(body.user.role, 'user');
});

test('regular user cannot access admin route', async () => {
  const { body: loginBody } = await login('user1', 'UserPass123!');
  const response = await request('/admin', {
    headers: authHeader(loginBody.accessToken)
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.error.code, 'FORBIDDEN');
});

test('admin can access admin route and login attempts log', async () => {
  const { body: loginBody } = await login('admin', 'AdminPass123!');

  const adminResponse = await request('/admin', {
    headers: authHeader(loginBody.accessToken)
  });
  const adminBody = await adminResponse.json();

  assert.equal(adminResponse.status, 200);
  assert.equal(adminBody.message, 'Admin panel');

  const logResponse = await request('/auth/login-attempts', {
    headers: authHeader(loginBody.accessToken)
  });
  const logBody = await logResponse.json();

  assert.equal(logResponse.status, 200);
  assert.equal(Array.isArray(logBody), true);
  assert.equal(logBody.some(item => item.success === false), true);
});

test('second login invalidates previous token', async () => {
  const { body: firstLogin } = await login('moderator', 'ModeratorPass123!');
  const { body: secondLogin } = await login('moderator', 'ModeratorPass123!');

  const oldTokenResponse = await request('/auth/me', {
    headers: authHeader(firstLogin.accessToken)
  });
  const oldTokenBody = await oldTokenResponse.json();

  assert.equal(oldTokenResponse.status, 401);
  assert.equal(oldTokenBody.error.details.includes('SESSION_EXPIRED'), true);

  const newTokenResponse = await request('/auth/me', {
    headers: authHeader(secondLogin.accessToken)
  });
  const newTokenBody = await newTokenResponse.json();

  assert.equal(newTokenResponse.status, 200);
  assert.equal(newTokenBody.username, 'moderator');
});

test('expired JWT is rejected', async () => {
  const isolatedApp = createApp({
    auth: {
      jwtSecret: 'short-lived-secret',
      jwtExpiresIn: '1s'
    },
    loginRateLimit: {
      windowMs: 60000,
      max: 3
    }
  });
  const isolatedServer = isolatedApp.listen(0);

  await new Promise(resolve => isolatedServer.once('listening', resolve));
  const { port } = isolatedServer.address();
  const isolatedBaseUrl = `http://127.0.0.1:${port}`;

  const loginResponse = await fetch(`${isolatedBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-client-id': 'expired-token-client' },
    body: jsonBody({ username: 'user1', password: 'UserPass123!' })
  });
  const loginBody = await loginResponse.json();

  await new Promise(resolve => setTimeout(resolve, 1100));

  const meResponse = await fetch(`${isolatedBaseUrl}/auth/me`, {
    headers: { authorization: `Bearer ${loginBody.accessToken}` }
  });
  const meBody = await meResponse.json();

  await new Promise(resolve => isolatedServer.close(resolve));

  assert.equal(meResponse.status, 401);
  assert.equal(meBody.error.details.includes('TOKEN_EXPIRED'), true);
});

test('password reset token is one-time and changes password', async () => {
  const resetRequestResponse = await request('/auth/password-reset/request', {
    method: 'POST',
    body: jsonBody({ username: 'new_user' })
  });
  const resetRequestBody = await resetRequestResponse.json();

  assert.equal(resetRequestResponse.status, 200);
  assert.equal(typeof resetRequestBody.demoResetToken, 'string');

  const confirmResponse = await request('/auth/password-reset/confirm', {
    method: 'POST',
    body: jsonBody({
      token: resetRequestBody.demoResetToken,
      newPassword: 'ChangedPass123!'
    })
  });
  const confirmBody = await confirmResponse.json();

  assert.equal(confirmResponse.status, 200);
  assert.equal(confirmBody.user.username, 'new_user');

  const reuseResponse = await request('/auth/password-reset/confirm', {
    method: 'POST',
    body: jsonBody({
      token: resetRequestBody.demoResetToken,
      newPassword: 'AnotherPass123!'
    })
  });
  const reuseBody = await reuseResponse.json();

  assert.equal(reuseResponse.status, 400);
  assert.equal(reuseBody.error.code, 'INVALID_RESET_TOKEN');

  const { response } = await login('new_user', 'ChangedPass123!');
  assert.equal(response.status, 200);
});
