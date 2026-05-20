/**
 * server.js — Express application entry point.
 *
 * Chronicles of China's Stock Market — Backend API
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// Route modules
const eventsRoutes  = require('./routes/events');
const indexRoutes   = require('./routes/index');
const authRoutes    = require('./routes/auth');

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// CORS — public demo, open by default. Restrict via CORS_ORIGIN if needed.
if (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*') {
  const corsOrigins = process.env.CORS_ORIGIN.split(',').map(s => s.trim());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  }));
} else {
  app.use(cors());
}

// Request body parsing.
app.use(express.json());

// Request logging.
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ---------------------------------------------------------------------------
// Static files — serve the demo page
// ---------------------------------------------------------------------------
app.use(express.static(require('path').join(__dirname, '..', 'demo')));
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/events', eventsRoutes);
app.use('/api', indexRoutes);
app.use('/api', authRoutes);

// ---------------------------------------------------------------------------
// 404 handler — must come after all routes.
// ---------------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({
    error: true,
    message: 'Not found',
    status: 404,
  });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
app.use((err, _req, res, _next) => {
  console.error('[error]', err.stack || err.message || err);

  const status = err.status || err.statusCode || 500;
  const message = status === 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Internal server error';

  res.status(status).json({
    error: true,
    message,
    status,
  });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

// Initialize store (loads all JSON data into memory at startup).
// This triggers synchronously when ./db/store is first required by any service.
require('./db/store');
console.log('[server] Data store initialized');

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[server] Listening on http://localhost:${PORT}`);
    console.log(`[server] Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;
