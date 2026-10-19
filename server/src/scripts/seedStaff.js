require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');
const { hashPassword } = require('../security/password');

async function seedStaff() {
  const { MONGODB_URI, BOOTSTRAP_STAFF_NAME, BOOTSTRAP_STAFF_EMAIL, BOOTSTRAP_STAFF_PASSWORD } =
    process.env;
  const role = process.env.BOOTSTRAP_STAFF_ROLE || 'staff';

  if (!MONGODB_URI) throw new Error('MONGODB_URI is required.');
  if (!BOOTSTRAP_STAFF_NAME || !BOOTSTRAP_STAFF_EMAIL || !BOOTSTRAP_STAFF_PASSWORD) {
    throw new Error('Set BOOTSTRAP_STAFF_NAME, BOOTSTRAP_STAFF_EMAIL, and BOOTSTRAP_STAFF_PASSWORD.');
  }
  if (!['staff', 'management'].includes(role)) {
    throw new Error('BOOTSTRAP_STAFF_ROLE must be staff or management.');
  }
  if (
    BOOTSTRAP_STAFF_PASSWORD.length < 12 ||
    Buffer.byteLength(BOOTSTRAP_STAFF_PASSWORD, 'utf8') > 72
  ) {
    throw new Error('BOOTSTRAP_STAFF_PASSWORD must have at least 12 characters and no more than 72 UTF-8 bytes.');
  }

  await mongoose.connect(MONGODB_URI);
  const email = BOOTSTRAP_STAFF_EMAIL.trim().toLowerCase();
  const passwordHash = await hashPassword(BOOTSTRAP_STAFF_PASSWORD);
  await User.findOneAndUpdate(
    { email },
    {
      $set: {
        name: BOOTSTRAP_STAFF_NAME.trim(),
        email,
        role,
        passwordHash,
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
  console.log(`Provisioned ${role} account for ${email}.`);
}

seedStaff()
  .catch((error) => {
    console.error('Could not provision staff account:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
