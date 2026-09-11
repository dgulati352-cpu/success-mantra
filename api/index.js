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
const aiRoutes = require('../backend/routes/ai');

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

app.use('/ai', aiRoutes);
app.use('/api/ai', aiRoutes);

const communityRoutes = require('../backend/routes/community');
app.use('/communities', communityRoutes);
app.use('/api/communities', communityRoutes);

const pdfPublicRoutes = require('../backend/routes/pdfPublicRoutes');
app.use('/pdfs', pdfPublicRoutes);
app.use('/api/pdfs', pdfPublicRoutes);

// Cloudflare R2 direct stream endpoint for public asset delivery and video range streaming
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const r2Storage = require('../backend/services/r2Storage');

app.get(/^\/(?:api\/)?(?:r2\/)?file\/(.+)$/, async (req, res) => {
  try {
    const cleanKey = (req.params[0] || '').replace(/^\/+/, '');
    if (!cleanKey || cleanKey.includes('..')) {
      return res.status(400).send('Invalid file key');
    }
    const s3 = r2Storage.getS3Client();
    if (!s3) {
      return res.status(503).send('Cloudflare R2 storage not configured');
    }

    const rangeHeader = req.headers.range;
    const cmdParams = {
      Bucket: process.env.R2_BUCKET_NAME || 'success-mantra',
      Key: cleanKey
    };
    if (rangeHeader) {
      cmdParams.Range = rangeHeader;
    }

    const cmd = new GetObjectCommand(cmdParams);
    const data = await s3.send(cmd);

    const filename = path.basename(cleanKey);
    const ext = path.extname(cleanKey).toLowerCase();
    const mime = data.ContentType || (
      ext === '.pdf' ? 'application/pdf' :
      ext === '.mp4' ? 'video/mp4' :
      ext === '.webm' ? 'video/webm' :
      ext === '.mov' ? 'video/quicktime' :
      ext === '.png' ? 'image/png' :
      ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
      ext === '.webp' ? 'image/webp' : 'application/octet-stream'
    );

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    if (data.ContentRange) {
      res.setHeader('Content-Range', data.ContentRange);
      res.status(206);
    }
    if (data.ContentLength) {
      res.setHeader('Content-Length', data.ContentLength);
    }

    data.Body.pipe(res);
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
