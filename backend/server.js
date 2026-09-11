require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const publicRoutes = require('./routes/public');
const studentRoutes = require('./routes/student');
const facultyRoutes = require('./routes/faculty');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payment');

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// Serve static uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Root welcome route (in case user opens port 5001 directly in browser)
// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/communities', require('./routes/community'));
app.use('/api/pdfs', require('./routes/pdfPublicRoutes'));
app.use('/api/ai', require('./routes/ai'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: 'Success Mantra EdTech Production API',
    timestamp: new Date().toISOString()
  });
});

// Cloudflare R2 direct stream endpoint for public asset delivery and video range streaming
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const r2Storage = require('./services/r2Storage');

app.get(/^\/(?:api\/)?(?:r2\/)?file\/(.+)$/, async (req, res) => {
  try {
    const cleanKey = (req.params[0] || '').replace(/^\/+/, '');

    if (!cleanKey || cleanKey.includes('..')) {
      return res.status(400).send('Invalid file key');
    }
    const s3 = r2Storage.getS3Client();
    if (!s3) {
      const localDevPath = path.join(__dirname, 'uploads', 'r2_dev', cleanKey);
      if (fs.existsSync(localDevPath)) {
        return res.sendFile(localDevPath);
      }
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

// Serve frontend production build (SPA)
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

app.use((req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? null : err.message
  });
});

const http = require('http');
const { Server } = require('socket.io');
const { initClassroomSocket } = require('./services/classroomSocket');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize Native Live Classroom Signaling
initClassroomSocket(io);

server.listen(PORT, () => {
  console.log(`🚀 Success Mantra Backend API & WebRTC Signaling running on http://localhost:${PORT}`);
  console.log(`🔥 Connected directly to Firebase Firestore & SQLite`);
});

module.exports = app;
module.exports.server = server;
