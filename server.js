// Load environment variables early
require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to database (non-fatal if MONGO_URI is not provided)
connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });

  // Graceful shutdown handlers (optional)
  const shutdown = () => {
    console.log('Shutting down server...');
    server.close(() => process.exit(0));
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
