const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { randomUUID } = require('node:crypto');

const tempDir = mkdtempSync(path.join(os.tmpdir(), 'ride-booking-test-'));
process.env.RIDE_DB_PATH = path.join(tempDir, 'test.db');
const db = require('../shared/db');
const { createRide, finishRide } = require('../shared/events');
const { getPendingEvents, acknowledgeEvent } = require('../shared/event_consumer');

test('final status changes publish once and each consumer has an independent offset', (t) => {
  t.after(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  const rideId = randomUUID();
  createRide(rideId);
  assert.equal(finishRide(rideId, 'ASSIGNED', 'driver-1'), true);
  assert.equal(finishRide(rideId, 'NO_DRIVER_FOUND'), false);

  const billingEvents = getPendingEvents('billing-test');
  assert.deepEqual(billingEvents.map(({ rideId: id, status }) => ({ rideId: id, status })), [
    { rideId, status: 'REQUESTED' },
    { rideId, status: 'ASSIGNED' },
  ]);

  for (const event of billingEvents) acknowledgeEvent('billing-test', event.id);

  const opsEvents = getPendingEvents('ops-test');
  assert.deepEqual(opsEvents.map(({ rideId: id, status }) => ({ rideId: id, status })), [
    { rideId, status: 'REQUESTED' },
    { rideId, status: 'ASSIGNED' },
  ]);
});
