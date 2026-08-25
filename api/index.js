// Fix module resolution for backend/ routes that can't see api/node_modules.
// NODE_PATH allows Node.js to resolve modules from additional directories.
const path = require('path');
const apiNodeModules = path.join(__dirname, 'node_modules');
const existingNodePath = process.env.NODE_PATH || '';
process.env.NODE_PATH = existingNodePath ? `${existingNodePath}:${apiNodeModules}` : apiNodeModules;
// Apply the updated NODE_PATH immediately
require('module').Module._initPaths();

const express = require('express');
const cors = require('cors');


const authRoutes = require('../backend/routes/auth');
const publicRoutes = require('../backend/routes/public');
const studentRoutes = require('../backend/routes/student');
const facultyRoutes = require('../backend/routes/faculty');
const adminRoutes = require('../backend/routes/admin');
const paymentRoutes = require('../backend/routes/payment');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get(['/health', '/api/health', '/'], (req, res) => {
  res.json({
    status: 'ok',
    platform: 'Success Mantra Serverless API Production',
    timestamp: new Date().toISOString()
  });
});

// Mount modular sub-routers under both /api/... and /...
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);

app.use('/public', publicRoutes);
app.use('/api/public', publicRoutes);

app.use('/student', studentRoutes);
app.use('/api/student', studentRoutes);

app.use('/faculty', facultyRoutes);
app.use('/api/faculty', facultyRoutes);

app.use('/admin', adminRoutes);
app.use('/api/admin', adminRoutes);

app.use('/payment', paymentRoutes);
app.use('/api/payment', paymentRoutes);

// Fallback 404 handler for API
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl || req.url}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('API Server Error:', err);
  if (res.headersSent) return next(err);
  return res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

module.exports = (req, res) => {
  return app(req, res);
};
