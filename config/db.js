const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.warn('MONGO_URI not set — skipping MongoDB connection (server will still start).');
    return;
  }

  try {
    // Mongoose >=6 no longer requires these options; pass the URI only.
    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message || err);
    // Don't throw — allow server to decide. If you want to fail fast, rethrow.
    // throw err;
  }
}

module.exports = connectDB;
