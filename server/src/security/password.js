const bcrypt = require('bcryptjs');

const ROUNDS = 12;

function hashPassword(password, rounds = ROUNDS) {
  return bcrypt.hash(password, rounds);
}

function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

module.exports = { hashPassword, verifyPassword };
