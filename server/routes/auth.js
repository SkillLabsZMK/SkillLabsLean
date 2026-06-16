'use strict';
const express = require('express');
const bcrypt = require('bcrypt');

module.exports = function(config) {
  const router = express.Router();

  router.post('/login', async (req, res) => {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: 'PIN required' });
    try {
      const match = await bcrypt.compare(String(pin), config.pin_hash);
      if (!match) return res.status(401).json({ error: 'Wrong PIN' });
      req.session.authenticated = true;
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ ok: true });
  });

  router.get('/status', (req, res) => {
    res.json({ authenticated: !!(req.session && req.session.authenticated) });
  });

  return router;
};
