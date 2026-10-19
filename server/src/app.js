const cookieParser = require('cookie-parser');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const path = require('path');
const authRepository = require('./repositories/userRepository');
const requestRepository = require('./repositories/requestRepository');
const { createAuthService } = require('./services/authService');
const { createRequestService } = require('./services/requestService');
const { createAuthenticate } = require('./middleware/authenticate');
const createRequireSameOrigin = require('./middleware/requireSameOrigin');
const createAuthRoutes = require('./routes/authRoutes');
const createRequestRoutes = require('./routes/requestRoutes');
const createStaffRoutes = require('./routes/staffRoutes');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');


function createApp({
  userRepository = authRepository,
  requestRepository: requests = requestRepository,
  authService,
  requestService,
  jwtSecret = process.env.JWT_SECRET,
  clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  sameSite = process.env.COOKIE_SAME_SITE || 'strict',
} = {}) {
  const app = express();
  const authenticate = createAuthenticate(jwtSecret);
  const identityService = authService || createAuthService({ userRepository, jwtSecret });
  const serviceRequests =
    requestService || createRequestService({ requestRepository: requests, userRepository });

  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({
    origin: (origin, callback) => callback(null, !origin || origin === clientOrigin),
    credentials: true,
  }));
  app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && !req.secure) {
      return res.redirect(308, `https://${req.get('host')}${req.originalUrl}`);
    }
    return next();
  });
  app.use(createRequireSameOrigin(clientOrigin));
  app.use(express.json({ limit: '16kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    const mongoose = require('mongoose');
    const connected = mongoose.connection.readyState === 1;
    res.status(connected ? 200 : 503).json({
      status: connected ? 'ok' : 'unavailable',
      db: connected ? 'connected' : 'disconnected',
      database: connected ? 'connected' : 'disconnected',
      release: process.env.RELEASE_ID || process.env.npm_package_version || 'local',
    });
  });
  app.use('/api/auth', createAuthRoutes({
    authService: identityService,
    authenticate,
    sameSite,
  }));
  app.use('/api/requests', createRequestRoutes({
    requestService: serviceRequests,
    authenticate,
  }));
  app.use('/api/staff', createStaffRoutes({
    authenticate,
    userRepository,
  }));

  if (process.env.NODE_ENV === 'production' || process.env.SERVE_CLIENT === 'true') {
    const clientBuildPath = path.resolve(__dirname, '../../client/dist');
    app.use(express.static(clientBuildPath));
    app.get(/^(?!\/api(?:\/|$)).*/, (_req, res, next) => {
      res.sendFile(path.join(clientBuildPath, 'index.html'), (error) => {
        if (error) next(error);
      });
    });
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

const app = createApp();
module.exports = app;
module.exports.createApp = createApp;
