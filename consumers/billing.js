const { runConsumer } = require('../shared/event_consumer');

runConsumer('billing', ({ rideId }) => {
  console.log(`charging rider for ride ${rideId}`);
}).catch((error) => {
  console.error('Billing consumer stopped:', error);
  process.exitCode = 1;
});
