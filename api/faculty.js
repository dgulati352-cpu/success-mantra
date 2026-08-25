const express = require('express');
const cors = require('cors');
const facultyRoutes = require('../backend/routes/faculty');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/faculty', facultyRoutes);
app.use('/faculty', facultyRoutes);
app.use('/', facultyRoutes);

module.exports = app;
