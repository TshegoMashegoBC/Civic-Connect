const mongoose = require('mongoose');

async function connectDB() {
  const { MONGODB_URI } = process.env;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Configure it in server/.env.');
  }

  await mongoose.connect(MONGODB_URI, {
    maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 50,
    serverSelectionTimeoutMS: 5000,
  });
  console.log('Connected to MongoDB');
}

module.exports = connectDB;
