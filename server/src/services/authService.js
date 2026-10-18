const jwt = require('jsonwebtoken');
const { hashPassword, verifyPassword } = require('../security/password');

const PASSWORD_MIN_LENGTH = 12;

function createAuthService({ userRepository, jwtSecret, clock = () => new Date() }) {
  function createToken(user) {
    if (!jwtSecret) {
      const error = new Error('Authentication is not configured.');
      error.statusCode = 503;
      throw error;
    }

    return jwt.sign(
      { role: user.role, name: user.name },
      jwtSecret,
      { subject: String(user._id), expiresIn: '8h', issuer: 'civic-connect' }
    );
  }

  async function register(input = {}) {
    const { name, email, password } = input;
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedName || normalizedName.length > 100) {
      const error = new Error('Enter a name of 1 to 100 characters.');
      error.statusCode = 400;
      throw error;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
      const error = new Error('Enter a valid email address.');
      error.statusCode = 400;
      throw error;
    }

    if (
      typeof password !== 'string' ||
      password.length < PASSWORD_MIN_LENGTH ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      const error = new Error(
        `Password must contain at least ${PASSWORD_MIN_LENGTH} characters and no more than 72 UTF-8 bytes.`
      );
      error.statusCode = 400;
      throw error;
    }

    if (await userRepository.findByEmail(normalizedEmail)) {
      const error = new Error('An account with that email already exists.');
      error.statusCode = 409;
      throw error;
    }

    const user = await userRepository.create({
      name: normalizedName,
      email: normalizedEmail,
      passwordHash: await hashPassword(password),
      role: 'requester',
      createdAt: clock(),
    });

    return { user: publicUser(user), token: createToken(user) };
  }

  async function login({ email, password }) {
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const user = await userRepository.findByEmail(normalizedEmail, { includePassword: true });
    const validPassword =
      user && typeof password === 'string'
        ? await verifyPassword(password, user.passwordHash)
        : false;

    if (!validPassword) {
      const error = new Error('Email or password is incorrect.');
      error.statusCode = 401;
      throw error;
    }

    return { user: publicUser(user), token: createToken(user) };
  }

  return { register, login };
}

function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

module.exports = { createAuthService, publicUser };
