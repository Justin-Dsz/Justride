const db = require('./db');

const insertRide = db.prepare('INSERT INTO rides (id, created_at) VALUES (?, ?)');
const addEvent = db.prepare('INSERT INTO events (ride_id, status, created_at) VALUES (?, ?, ?)');
// Only succeeds if the ride is still REQUESTED (prevents double assignment)
const updateStatus = db.prepare(
  "UPDATE rides SET status = ?, driver = ? WHERE id = ? AND status = 'REQUESTED'"
);

function inTransaction(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

// New ride + REQUESTED event, saved together
function createRide(id) {
  inTransaction(() => {
    insertRide.run(id, Date.now());
    addEvent.run(id, 'REQUESTED', Date.now());
  });
}

// Final status + its event, saved together. Returns false if the ride was already final.
function finishRide(id, status, driver = null) {
  return inTransaction(() => {
    const { changes } = updateStatus.run(status, driver, id);
    if (changes === 1) addEvent.run(id, status, Date.now());
    return changes === 1;
  });
}

module.exports = { createRide, finishRide };