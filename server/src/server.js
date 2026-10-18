require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');

const port = Number(process.env.PORT) || 3000;

async function startServer() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('Set JWT_SECRET to a random value of at least 32 characters in server/.env.');
  }

  await connectDB();

  const server = app.listen(port, () => {
    console.log(`Civic Connect API is running on port ${port}`);
  });

  server.on('error', (error) => {
    console.error('Civic Connect API failed to listen:', error);
    process.exitCode = 1;
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      server.close(async () => {
        const mongoose = require('mongoose');
        await mongoose.disconnect();
        process.exit(0);
      });
    });
  }
}

startServer().catch((error) => {
  console.error('Failed to start Civic Connect API:', error);
  process.exitCode = 1;
});
