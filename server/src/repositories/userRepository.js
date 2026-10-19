const User = require('../models/User');

async function findByEmail(email, { includePassword = false } = {}) {
  const query = User.findOne({ email });
  return includePassword ? query.select('+passwordHash') : query;
}

function create(user) {
  return User.create(user);
}

function findStaffById(id) {
  return User.findOne({ _id: id, role: 'staff' }).select('_id name role');
}

function listStaff() {
  return User.find({ role: 'staff' }).select('_id name').sort({ name: 1 }).lean();
}

module.exports = { findByEmail, create, findStaffById, listStaff };
