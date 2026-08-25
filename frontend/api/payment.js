const express = require('express');
const cors = require('cors');
const paymentRoutes = require('../backend/routes/payment');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/payment', paymentRoutes);
app.use('/payment', paymentRoutes);
app.use('/', paymentRoutes);

module.exports = app;
