const express = require('express');
const cors = require('cors');
const adminRoutes = require('../backend/routes/admin');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/admin', adminRoutes);
app.use('/admin', adminRoutes);
app.use('/', adminRoutes);

module.exports = app;
