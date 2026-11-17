const db = require('../shared/db');
const { DRIVERS } = require('../shared/drivers');
const { finishRide } = require('../shared/events');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Atomically grab the oldest waiting ride (only one worker can win it)
const claimRide = db.prepare(`
  UPDATE rides SET locked = 1
  WHERE id = (SELECT id FROM rides WHERE status = 'REQUESTED' AND locked = 0 ORDER BY rowid LIMIT 1)
  RETURNING id
`);
const releaseRide = db.prepare("UPDATE rides SET locked = 0 WHERE id = ? AND status = 'REQUESTED'");
const addAttempt = db.prepare('UPDATE rides SET attempts = attempts + 1 WHERE id = ?');
const addOffer = db.prepare('INSERT INTO offers (ride_id, driver_id, accepted) VALUES (?, ?, ?)');

// Fake driver response: 50% accept, with a little delay
async function offerToDriver() {
  await sleep(50 + Math.random() * 150);
  return Math.random() < 0.5;
}

async function processRide(rideId) {
  const tried = new Set();
  let rejections = 0;

  while (rejections < 3) {
    const candidates = DRIVERS.filter((d) => !tried.has(d.id));
    const driver = candidates[Math.floor(Math.random() * candidates.length)];
    tried.add(driver.id);
    addAttempt.run(rideId);

    const accepted = await offerToDriver();
    addOffer.run(rideId, driver.id, accepted ? 1 : 0);

    if (accepted) {
      if (finishRide(rideId, 'ASSIGNED', driver.id)) {
        console.log(`${rideId} ASSIGNED to ${driver.id}`);
      }
      return;
    }
    rejections++;
    console.log(`${rideId} rejected by ${driver.id} (${rejections}/3)`);
  }

  if (finishRide(rideId, 'NO_DRIVER_FOUND')) {
    console.log(`${rideId} NO_DRIVER_FOUND`);
  }
}

(async () => {
  console.log('worker started');
  while (true) {
    let rideId;
    try {
      const row = claimRide.get();
      if (!row) { await sleep(200); continue; }  // queue empty, check again shortly
      rideId = row.id;
      await processRide(rideId);
    } catch (e) {
      console.error(e);
      if (rideId) releaseRide.run(rideId);
      await sleep(500);
    }
  }
})();