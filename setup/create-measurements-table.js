// Creates the measurements table. One row per day per measurement type
// (e.g. Chest on Aug 4th). type_name matches a measurement_types.name for
// that same user.

const pool = require('../db');

async function createMeasurementsTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS measurements (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            entry_date DATE NOT NULL,
            type_name TEXT NOT NULL,
            value NUMERIC NOT NULL,
            UNIQUE (user_id, entry_date, type_name)
        )
    `);
}

module.exports = createMeasurementsTable;
