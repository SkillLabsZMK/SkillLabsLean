'use strict';
const express = require('express');
const fs = require('fs');
const path = require('path');
const requireAuth = require('../middleware/requireAuth');

module.exports = function(facilityPath, config) {
  const router = express.Router();

  // Load all rooms
  function loadRooms() {
    const dir = path.join(facilityPath, 'rooms');
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  }

  // Load all areas
  function loadAreas() {
    const dir = path.join(facilityPath, 'areas');
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  }

  // Public: rooms, areas, plan, emergency info
  router.get('/data', (req, res) => {
    res.json({
      rooms: loadRooms(),
      areas: loadAreas(),
      plan: config.plan,
      emergency: config.emergency,
      safetyRules: config.safetyRules,
      rulesNote: config.rulesNote,
      putzplan: config.putzplan,
      facilityName: config.name
    });
  });

  // Protected: materials
  router.get('/materials', requireAuth, (req, res) => {
    const matPath = path.join(facilityPath, 'materials', 'index.json');
    res.json(JSON.parse(fs.readFileSync(matPath, 'utf8')));
  });

  return router;
};
