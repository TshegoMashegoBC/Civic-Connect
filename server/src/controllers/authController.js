const rateLimit = require('express-rate-limit');

const sessionCookie = 'civic_connect_session';
const cookieDurationMs = 8 * 60 * 60 * 1000;

function createAuthController({ authService, authenticate, sameSite }) {
  function cookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite,
      maxAge: cookieDurationMs,
      path: '/api',
    };
  }

  return {
    limiter: rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: process.env.NODE_ENV === 'test' ? 1000 : 10,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { message: 'Too many sign-in attempts. Try again later.' },
    }),
    async register(req, res) {
      const result = await authService.register(req.body);
      res.cookie(sessionCookie, result.token, cookieOptions());
      res.status(201).json({ user: result.user });
    },
    async login(req, res) {
      const result = await authService.login(req.body);
      res.cookie(sessionCookie, result.token, cookieOptions());
      res.status(200).json({ user: result.user });
    },
    logout(_req, res) {
      res.clearCookie(sessionCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite,
        path: '/api',
      });
      res.status(204).end();
    },
    me(req, res) {
      res.status(200).json({ user: req.user });
    },
    authenticate,
  };
}

module.exports = { createAuthController };
