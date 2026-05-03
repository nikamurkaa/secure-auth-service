const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { errorResponse } = require('../middleware/errors');

function createAuthRouter(authStore, loginRateLimiter) {
  const router = express.Router();
  const authRequired = authenticate(authStore);

  router.post('/register', async (req, res, next) => {
    try {
      const validationErrors = authStore.validateRegistration(req.body);
      if (validationErrors.length > 0) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid registration payload.', validationErrors);
      }

      const user = await authStore.register(req.body);
      return res.status(201).json(user);
    } catch (error) {
      return next(error);
    }
  });

  router.post('/login', loginRateLimiter, async (req, res, next) => {
    try {
      const result = await authStore.login({
        username: req.body.username,
        password: req.body.password,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });

      if (!result.ok) {
        return errorResponse(res, 401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
      }

      return res.json({
        accessToken: result.token,
        tokenType: result.tokenType,
        expiresIn: result.expiresIn,
        user: result.user
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/logout', authRequired, (req, res) => {
    authStore.logout(req.user);
    return res.status(204).send();
  });

  router.get('/me', authRequired, (req, res) => {
    return res.json(authStore.toPublicUser(req.user));
  });

  router.get('/login-attempts', authRequired, requireRole('admin'), (req, res) => {
    return res.json(authStore.getLoginAttempts());
  });

  router.post('/password-reset/request', (req, res) => {
    const result = authStore.createPasswordResetToken(req.body.username);
    const body = {
      message: 'If the account exists, a one-time password reset token has been generated.'
    };

    if (result.userExists) {
      body.demoResetToken = result.resetToken;
    }

    return res.json(body);
  });

  router.post('/password-reset/confirm', async (req, res, next) => {
    try {
      const result = await authStore.resetPassword({
        token: req.body.token,
        newPassword: req.body.newPassword
      });

      if (!result.ok) {
        return errorResponse(res, 400, result.code, 'Password reset token is invalid or expired.');
      }

      return res.json({ message: 'Password has been updated.', user: result.user });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = {
  createAuthRouter
};
