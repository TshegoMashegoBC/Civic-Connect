const express = require('express');
const { createAuthController } = require('../controllers/authController');

function createAuthRoutes(options) {
  const controller = createAuthController(options);
  const router = express.Router();

  router.post('/register', controller.limiter, controller.register);
  router.post('/login', controller.limiter, controller.login);
  router.post('/logout', controller.logout);
  router.get('/me', controller.authenticate, controller.me);

  return router;
}

module.exports = createAuthRoutes;
