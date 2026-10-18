const express = require('express');
const { authorize } = require('../middleware/authenticate');

function createStaffRoutes({ authenticate, userRepository }) {
  const router = express.Router();

  router.use(authenticate, authorize('management'));
  router.get('/', async (_req, res) => {
    const staff = await userRepository.listStaff();
    res.status(200).json({ staff: staff.map((user) => ({ id: String(user._id), name: user.name })) });
  });

  return router;
}

module.exports = createStaffRoutes;
