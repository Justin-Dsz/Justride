const { runConsumer } = require('../shared/event_consumer');

runConsumer('ops', ({ rideId, status }) => {
  console.log(`ride ${rideId} is now in status ${status}`);
}).catch((error) => {
  console.error('Ops consumer stopped:', error);
  process.exitCode = 1;
});
