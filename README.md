# Simple Ride Booking

A small Node.js ride-booking demo using SQLite as a durable queue and event log. The API accepts rides immediately; a separate worker offers each ride to up to three distinct fake drivers. Billing and ops are independent event consumers, each with its own persisted offset.

## Requirements

- Node.js 22.5 or newer (uses the built-in `node:sqlite` module)
- npm

## Install

```powershell
npm install
```

## Run the services

Open four terminals in the project folder:

```powershell
npm start
```

```powershell
npm run worker
```

```powershell
npm run billing
```

```powershell
npm run ops
```

The API listens on port 3000 by default. Override it with `PORT`, and point processes at another SQLite file with `RIDE_DB_PATH` if needed.

## API

- `POST /rides` returns HTTP 202 and `{ "rideId": "..." }`.
- `GET /rides/:id` returns the ride's status, attempts, assigned driver (if any), and offers.

Example:

```powershell
Invoke-RestMethod -Method Post http://localhost:3000/rides
Invoke-RestMethod http://localhost:3000/rides/<rideId>
```

Ride creation and its `REQUESTED` event are committed together. A worker polls the `REQUESTED` rides, sends each offer to a distinct driver, and atomically sets a final status with its corresponding event. After three rejections the ride becomes `NO_DRIVER_FOUND`.

The event log contains `REQUESTED`, `ASSIGNED`, and `NO_DRIVER_FOUND` events. Billing and ops each maintain a separate offset in SQLite, so one consumer does not take events away from the other. Consumers acknowledge an event after printing it.

## Run the checks

Run the focused event/offset test:

```powershell
npm test
```

With the API and worker running, start 100 rides concurrently and wait for every ride to reach a final status:

```powershell
npm run load-test
```

The script prints the total created, final status totals, rides with multiple accepted-driver offers, and rides still lacking a final status. It exits with a non-zero code if any required invariant fails. The billing and ops terminals should each print every ride-status event.
