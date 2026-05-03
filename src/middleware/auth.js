const { errorResponse } = require('./errors');

function extractBearerToken(req) {
  const header = req.get('authorization');
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

function authenticate(authStore) {
  return (req, res, next) => {
    const token = extractBearerToken(req);
    const verification = token ? authStore.verifyAccessToken(token) : null;

    if (!verification || !verification.ok) {
      const details = verification ? [verification.code] : undefined;
      return errorResponse(res, 401, 'UNAUTHORIZED', 'Valid Bearer token is required.', details);
    }

    req.user = verification.user;
    req.tokenPayload = verification.payload;
    return next();
  };
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return errorResponse(res, 403, 'FORBIDDEN', `${role} role is required.`);
    }

    return next();
  };
}

function requireAnyRole(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 403, 'FORBIDDEN', `One of these roles is required: ${roles.join(', ')}.`);
    }

    return next();
  };
}

module.exports = {
  authenticate,
  requireRole,
  requireAnyRole
};
