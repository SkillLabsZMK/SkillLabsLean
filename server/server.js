'use strict';
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const FACILITY = process.env.FACILITY || 'zmk-tuebingen';
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-production';

// Load facility config
const facilityPath = path.join(__dirname, '..', 'facilities', FACILITY);
const config = JSON.parse(fs.readFileSync(path.join(facilityPath, 'config.json'), 'utf8'));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, maxAge: 8 * 60 * 60 * 1000 }
}));

// Serve client
app.use(express.static(path.join(__dirname, '..', 'client')));

// API routes
app.use('/api', require('./routes/api')(facilityPath, config));
app.use('/auth', require('./routes/auth')(config));

app.listen(PORT, () => console.log(`SkillLabs [${config.name}] running on port ${PORT}`));
