// Creates the measurement_types table. Each user has their own list of measurement
// types - the 7 base ones (seeded on signup, see routes/auth.js) plus any custom
// ones they add. is_active lets a user "remove" a type (stop seeing it in the entry
// form) without deleting the type or its history.

const pool = require('../db');

async function createMeasurementTypesTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS measurement_types (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            name TEXT NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT true,
            UNIQUE (user_id, name)
        )
    `);
}

module.exports = createMeasurementTypesTable;
