const express = require('express');
const cors = require('cors');
const studentRoutes = require('../backend/routes/student');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/student', studentRoutes);
app.use('/student', studentRoutes);
app.use('/', studentRoutes);

module.exports = app;
