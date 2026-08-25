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

// Mount all API routes
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: 'Success Mantra Serverless API Production',
    timestamp: new Date().toISOString()
  });
});

module.exports = app;
