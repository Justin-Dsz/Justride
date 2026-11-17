const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(process.env.RIDE_DB_PATH || path.join(__dirname, '..', 'justride.db'));
db.exec('PRAGMA journal_mode = WAL;');   // lets API and worker use the file at once
db.exec('PRAGMA busy_timeout = 5000;');  // wait instead of failing if briefly locked

db.exec(`
  CREATE TABLE IF NOT EXISTS rides (
    id         TEXT PRIMARY KEY,
    status     TEXT NOT NULL DEFAULT 'REQUESTED',
    locked     INTEGER NOT NULL DEFAULT 0,
    attempts   INTEGER NOT NULL DEFAULT 0,
    driver     TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS offers (
    ride_id   TEXT NOT NULL,
    driver_id TEXT NOT NULL,
    accepted  INTEGER NOT NULL
  );
    CREATE TABLE IF NOT EXISTS events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ride_id    TEXT NOT NULL,
    status     TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS consumer_offsets (
    name    TEXT PRIMARY KEY,
    last_id INTEGER NOT NULL DEFAULT 0
  );
`);

module.exports = db;