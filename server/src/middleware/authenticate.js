const jwt = require('jsonwebtoken');

function createAuthenticate(jwtSecret) {
  return function authenticate(req, res, next) {
    const token = req.cookies?.civic_connect_session;

    if (!token) {
      return res.status(401).json({ message: 'Sign in to continue.' });
    }

    if (!jwtSecret) {
      return res.status(503).json({ message: 'Authentication is not configured.' });
    }

    try {
      const payload = jwt.verify(token, jwtSecret, { issuer: 'civic-connect' });
      req.user = {
        id: payload.sub,
        name: payload.name,
        role: payload.role,
      };
      return next();
    } catch {
      return res.status(401).json({ message: 'Your session is invalid or has expired.' });
    }
  };
}

function authorize(...roles) {
  return function requireRole(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ message: 'Sign in to continue.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to do that.' });
    }

    return next();
  };
}

module.exports = { createAuthenticate, authorize };
