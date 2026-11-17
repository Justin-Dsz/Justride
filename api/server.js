const express = require('express');
const { randomUUID } = require('crypto');
const db = require('../shared/db');
const { createRide } = require('../shared/events');

const app = express();
app.use(express.json());

const getRide = db.prepare('SELECT id AS rideId, status, attempts, driver FROM rides WHERE id = ?');
const getOffers = db.prepare('SELECT driver_id, accepted FROM offers WHERE ride_id = ?');

app.post('/rides', (req, res) => {
  const rideId = randomUUID();
  createRide(rideId);
  res.status(202).json({ rideId });
});

app.get('/rides/:id', (req, res) => {
  const ride = getRide.get(req.params.id);
  if (!ride) return res.status(404).json({ error: 'not found' });
  res.json({ ...ride, offers: getOffers.all(req.params.id) });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`API on :${port}`));