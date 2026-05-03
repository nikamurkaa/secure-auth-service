const jwt = require('jsonwebtoken');
const { createInitialUsers } = require('../data/users');
const { escapeHtml } = require('../utils/escape');
const { hashPassword, verifyPassword } = require('../utils/password');
const { createRandomToken, hashToken } = require('../utils/tokens');

const validRoles = new Set(['user', 'moderator', 'admin']);
const usernamePattern = /^[a-zA-Z0-9_]{3,30}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function createAuthStore(options = {}) {
  const users = (options.initialUsers || createInitialUsers()).map(user => ({ ...user }));
  const loginAttempts = [];
  const jwtSecret = options.jwtSecret || process.env.JWT_SECRET || 'dev-only-change-me-secret';
  const jwtExpiresIn = options.jwtExpiresIn || process.env.JWT_EXPIRES_IN || '15m';
  const passwordResetTokenTtlMs = Number(
    options.passwordResetTokenTtlMs || process.env.PASSWORD_RESET_TOKEN_TTL_MS || 600000
  );

  function toPublicUser(user) {
    return {
      id: user.id,
      username: escapeHtml(user.username),
      displayName: escapeHtml(user.displayName),
      role: user.role,
      lastLogin: user.lastLogin
    };
  }

  function findById(id) {
    return users.find(user => user.id === Number(id)) || null;
  }

  function findByUsername(username) {
    const normalizedUsername = normalizeUsername(username);
    return users.find(user => user.username === normalizedUsername) || null;
  }

  function validateRegistration(payload) {
    const errors = [];

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return ['Request body must be a JSON object.'];
    }

    const username = normalizeUsername(payload.username);
    if (!usernamePattern.test(username)) {
      errors.push('username must contain 3-30 latin letters, digits or underscores.');
    }

    if (findByUsername(username)) {
      errors.push('username is already registered.');
    }

    if (typeof payload.password !== 'string' || payload.password.length < 8) {
      errors.push('password must contain at least 8 characters.');
    }

    if (typeof payload.password === 'string') {
      const hasLetter = /[a-zA-Z]/.test(payload.password);
      const hasDigit = /\d/.test(payload.password);
      if (!hasLetter || !hasDigit) {
        errors.push('password must contain at least one letter and one digit.');
      }
    }

    if ('displayName' in payload) {
      const displayName = String(payload.displayName || '').trim();
      if (displayName.length < 2 || displayName.length > 80) {
        errors.push('displayName must contain 2-80 characters.');
      }
    }

    if ('email' in payload) {
      if (typeof payload.email !== 'string' || !emailPattern.test(payload.email)) {
        errors.push('email must be a valid email address.');
      }
    }

    if ('role' in payload && !validRoles.has(payload.role)) {
      errors.push('role must be one of: user, moderator, admin.');
    }

    return errors;
  }

  async function register(payload) {
    const username = normalizeUsername(payload.username);
    const displayName = String(payload.displayName || username).trim();
    const email = payload.email ? String(payload.email).trim().toLowerCase() : null;
    const passwordHash = await hashPassword(payload.password);
    const nextId = users.length > 0 ? Math.max(...users.map(user => user.id)) + 1 : 1;

    const user = {
      id: nextId,
      username,
      displayName,
      email,
      passwordHash,
      role: 'user',
      lastLogin: null,
      activeSessionId: null,
      passwordResetTokenHash: null,
      passwordResetTokenExpiresAt: null,
      passwordResetTokenUsed: false
    };

    users.push(user);
    return toPublicUser(user);
  }

  function logLoginAttempt({ username, success, reason, ip, userAgent }) {
    loginAttempts.push({
      timestamp: new Date().toISOString(),
      username: escapeHtml(normalizeUsername(username)),
      success,
      reason,
      ip: ip || null,
      userAgent: userAgent || null
    });
  }

  function createAccessToken(user) {
    const sessionId = createRandomToken(16);
    user.activeSessionId = sessionId;

    return jwt.sign(
      {
        userId: user.id,
        role: user.role,
        sessionId
      },
      jwtSecret,
      {
        expiresIn: jwtExpiresIn
      }
    );
  }

  async function login({ username, password, ip, userAgent }) {
    const user = findByUsername(username);

    if (!user) {
      logLoginAttempt({ username, success: false, reason: 'USER_NOT_FOUND', ip, userAgent });
      return { ok: false, code: 'INVALID_CREDENTIALS' };
    }

    const passwordMatches = await verifyPassword(String(password || ''), user.passwordHash);
    if (!passwordMatches) {
      logLoginAttempt({ username, success: false, reason: 'INVALID_PASSWORD', ip, userAgent });
      return { ok: false, code: 'INVALID_CREDENTIALS' };
    }

    user.lastLogin = new Date().toISOString();
    const token = createAccessToken(user);
    logLoginAttempt({ username, success: true, reason: 'LOGIN_SUCCESS', ip, userAgent });

    return {
      ok: true,
      token,
      tokenType: 'Bearer',
      expiresIn: jwtExpiresIn,
      user: toPublicUser(user)
    };
  }

  function verifyAccessToken(token) {
    try {
      const payload = jwt.verify(token, jwtSecret);
      const user = findById(payload.userId);

      if (!user) {
        return { ok: false, code: 'TOKEN_USER_NOT_FOUND' };
      }

      if (user.activeSessionId !== payload.sessionId) {
        return { ok: false, code: 'SESSION_EXPIRED' };
      }

      return { ok: true, user, payload };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return { ok: false, code: 'TOKEN_EXPIRED' };
      }

      return { ok: false, code: 'INVALID_TOKEN' };
    }
  }

  function logout(user) {
    user.activeSessionId = null;
  }

  function getLoginAttempts() {
    return loginAttempts.slice(-100);
  }

  function createPasswordResetToken(username) {
    const user = findByUsername(username);

    if (!user) {
      return { userExists: false, resetToken: null };
    }

    const resetToken = createRandomToken(24);
    user.passwordResetTokenHash = hashToken(resetToken);
    user.passwordResetTokenExpiresAt = Date.now() + passwordResetTokenTtlMs;
    user.passwordResetTokenUsed = false;

    return { userExists: true, resetToken };
  }

  async function resetPassword({ token, newPassword }) {
    if (typeof token !== 'string' || token.length === 0) {
      return { ok: false, code: 'INVALID_RESET_TOKEN' };
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return { ok: false, code: 'WEAK_PASSWORD' };
    }

    const tokenHash = hashToken(token);
    const user = users.find(candidate => candidate.passwordResetTokenHash === tokenHash) || null;

    if (!user || user.passwordResetTokenUsed) {
      return { ok: false, code: 'INVALID_RESET_TOKEN' };
    }

    if (!user.passwordResetTokenExpiresAt || user.passwordResetTokenExpiresAt < Date.now()) {
      return { ok: false, code: 'RESET_TOKEN_EXPIRED' };
    }

    user.passwordHash = await hashPassword(newPassword);
    user.activeSessionId = null;
    user.passwordResetTokenUsed = true;
    user.passwordResetTokenHash = null;
    user.passwordResetTokenExpiresAt = null;

    return { ok: true, user: toPublicUser(user) };
  }

  return {
    toPublicUser,
    validateRegistration,
    register,
    login,
    verifyAccessToken,
    logout,
    getLoginAttempts,
    createPasswordResetToken,
    resetPassword
  };
}

module.exports = {
  createAuthStore
};
