const db = require('./db');

const initializeOffset = db.prepare(
  'INSERT OR IGNORE INTO consumer_offsets (name, last_id) VALUES (?, 0)'
);
const getLastId = db.prepare('SELECT last_id FROM consumer_offsets WHERE name = ?');
const getPending = db.prepare(
  'SELECT id, ride_id AS rideId, status FROM events WHERE id > ? ORDER BY id LIMIT ?'
);
const saveOffset = db.prepare(
  'UPDATE consumer_offsets SET last_id = ? WHERE name = ? AND last_id < ?'
);

function getPendingEvents(consumerName, limit = 100) {
  initializeOffset.run(consumerName);
  const { last_id: lastId } = getLastId.get(consumerName);
  return getPending.all(lastId, limit);
}

function acknowledgeEvent(consumerName, eventId) {
  initializeOffset.run(consumerName);
  saveOffset.run(eventId, consumerName, eventId);
}

async function runConsumer(consumerName, handleEvent) {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  console.log(`${consumerName} consumer started`);

  while (true) {
    const events = getPendingEvents(consumerName);
    if (events.length === 0) {
      await sleep(200);
      continue;
    }

    for (const event of events) {
      handleEvent(event);
      acknowledgeEvent(consumerName, event.id);
    }
  }
}

module.exports = { getPendingEvents, acknowledgeEvent, runConsumer };
