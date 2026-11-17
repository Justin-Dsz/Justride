const API_URL = process.env.API_URL || 'http://localhost:3000';
const RIDE_COUNT = 100;
const POLL_INTERVAL_MS = 500;
const TIMEOUT_MS = 120_000;

async function requestRide(method, url) {
  const response = await fetch(url, { method });
  if (!response.ok) {
    throw new Error(`${method} ${url} failed with HTTP ${response.status}`);
  }
  return response.json();
}

async function main() {
  const created = await Promise.all(
    Array.from({ length: RIDE_COUNT }, () => requestRide('POST', `${API_URL}/rides`))
  );
  const rideIds = created.map(({ rideId }) => rideId);
  const deadline = Date.now() + TIMEOUT_MS;
  let rides;

  while (Date.now() < deadline) {
    rides = await Promise.all(
      rideIds.map((rideId) => requestRide('GET', `${API_URL}/rides/${rideId}`))
    );
    if (rides.every(({ status }) => status === 'ASSIGNED' || status === 'NO_DRIVER_FOUND')) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  const assigned = (rides || []).filter(({ status }) => status === 'ASSIGNED').length;
  const noDriverFound = (rides || []).filter(({ status }) => status === 'NO_DRIVER_FOUND').length;
  const finalized = assigned + noDriverFound;
  const ridesAssignedToMultipleDrivers = (rides || []).filter(
    ({ offers }) => offers.filter(({ accepted }) => accepted === 1).length > 1
  ).length;
  const stuck = RIDE_COUNT - finalized;

  console.table([
    { check: 'Total rides created', result: created.length, expected: RIDE_COUNT },
    { check: 'ASSIGNED', result: assigned },
    { check: 'NO_DRIVER_FOUND', result: noDriverFound },
    { check: 'Finalized rides', result: finalized, expected: RIDE_COUNT },
    { check: 'Assigned to multiple drivers', result: ridesAssignedToMultipleDrivers, expected: 0 },
    { check: 'Stuck without final status', result: stuck, expected: 0 },
  ]);

  if (
    created.length !== RIDE_COUNT ||
    finalized !== RIDE_COUNT ||
    ridesAssignedToMultipleDrivers !== 0 ||
    stuck !== 0
  ) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Load test failed:', error);
  process.exitCode = 1;
});
