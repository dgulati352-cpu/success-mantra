const express = require('express');
const cors = require('cors');
const publicRoutes = require('../backend/routes/public');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/public', publicRoutes);
app.use('/public', publicRoutes);
app.use('/', publicRoutes);

module.exports = app;
