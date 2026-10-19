const express = require('express');
const createRequestController = require('../controllers/requestController');
const { authorize } = require('../middleware/authenticate');

function createRequestRoutes(options) {
  const router = express.Router();
  const controller = createRequestController(options);

  router.use(options.authenticate);
  router.get('/summary', authorize('management'), controller.summary);
  router.get('/', controller.list);
  router.post('/', authorize('requester'), controller.create);
  router.post('/:id/assign', authorize('staff', 'management'), controller.assign);
  router.patch('/:id/status', authorize('staff'), controller.transition);
  router.post('/:id/comments', authorize('staff'), controller.addComment);
  router.patch('/:id/due-date', authorize('staff', 'management'), controller.setDueAt);
  router.get('/:id', controller.getById);

  return router;
}

module.exports = createRequestRoutes;
