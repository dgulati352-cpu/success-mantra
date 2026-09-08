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

const pdfPublicRoutes = require('../backend/routes/pdfPublicRoutes');
app.use('/pdfs', pdfPublicRoutes);
app.use('/api/pdfs', pdfPublicRoutes);

// Cloudflare R2 direct stream endpoint for public asset delivery
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const r2Storage = require('../backend/services/r2Storage');
app.get([
  '/r2/file/:folder/:filename',
  '/api/r2/file/:folder/:filename',
  '/r2/file/:folder/:sub/:filename',
  '/api/r2/file/:folder/:sub/:filename'
], async (req, res) => {
  try {
    const folder = req.params.folder;
    const sub = req.params.sub;
    const filename = req.params.filename;
    const cleanKey = sub ? `${folder}/${sub}/${filename}` : `${folder}/${filename}`;
    if (!cleanKey || cleanKey.includes('..')) {
      return res.status(400).send('Invalid file key');
    }
    const s3 = r2Storage.getS3Client();
    if (!s3) {
      return res.status(503).send('Cloudflare R2 storage not configured');
    }
    const cmd = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'success-mantra',
      Key: cleanKey
    });
    const data = await s3.send(cmd);
    const mime = data.ContentType || (cleanKey.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    const byteArray = await data.Body.transformToByteArray();
    const buffer = Buffer.from(byteArray);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return res.status(404).send('File not found in R2 storage');
    }
    console.error('R2 Stream error:', err);
    res.status(500).send('Failed to stream file from R2');
  }
});

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
