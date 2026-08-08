// Sets up the connection to the Postgres database.
// Other files can use this by doing: const pool = require('./db');

require('dotenv').config(); // reads the .env file and loads it into process.env

const { Pool, types } = require('pg');

// By default pg converts DATE columns into JS Date objects, which reintroduces
// the exact timezone-shift bug already fixed once in the old localStorage code
// (a "2026-08-03" date could come back as "2026-08-02T22:00:00.000Z").
// Keep dates as plain "YYYY-MM-DD" strings instead - no timezone math, ever.
const DATE_TYPE_ID = 1082;
types.setTypeParser(DATE_TYPE_ID, function (value) {
    return value;
});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Neon (being serverless) can close an idle database connection in the background.
// Without this handler, that shows up as an unhandled 'error' event and crashes
// the whole server. Logging it here means the pool just quietly opens a new
// connection next time a query needs one, instead of taking the server down.
pool.on('error', function (err) {
    console.error('Unexpected database pool error (connection was likely closed by the server):', err.message);
});

module.exports = pool;
