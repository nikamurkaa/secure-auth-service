const express = require('express');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { createAuthStore } = require('./services/auth');
const { createAuthRouter } = require('./routes/auth');
const { createProtectedRouter } = require('./routes/protected');
const { errorResponse, notFoundHandler, errorHandler } = require('./middleware/errors');

function createLoginRateLimiter(options = {}) {
  const windowMs = Number(options.windowMs || process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 60000);
  const max = Number(options.max || process.env.LOGIN_RATE_LIMIT_MAX || 3);

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: req => {
      const clientId = req.get('x-client-id');
      if (clientId) {
        return clientId;
      }

      const forwardedFor = req.get('x-forwarded-for');
      const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : req.socket.remoteAddress;
      return ipKeyGenerator(ipAddress || 'unknown');
    },
    handler: (req, res) => {
      return errorResponse(
        res,
        429,
        'TOO_MANY_LOGIN_ATTEMPTS',
        'Too many login attempts. Please try again later.'
      );
    }
  });
}

function createApp(options = {}) {
  const app = express();
  const authStore = options.authStore || createAuthStore(options.auth || {});
  const loginRateLimiter = options.loginRateLimiter || createLoginRateLimiter(options.loginRateLimit || {});

  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  app.get('/health', (req, res) => {
    return res.json({ status: 'ok', service: 'secure-auth-service' });
  });

  app.use('/auth', createAuthRouter(authStore, loginRateLimiter));
  app.use('/', createProtectedRouter(authStore));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp,
  createLoginRateLimiter
};
