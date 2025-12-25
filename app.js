const express = require('express');

const app = express();

// Built-in middleware
app.use(express.json());

// Simple request logger for debugging
app.use((req, res, next) => {
  console.log('> incoming', req.method, req.url);
  next();
});

// Routes
const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const loanRoutes = require('./routes/loans');

// Simple health route
app.get('/', (req, res) => {
  res.json({ message: 'API running' });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/loans', loanRoutes);

// Fallback 404 handler (returns JSON) to avoid Express default HTML response
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

module.exports = app;
