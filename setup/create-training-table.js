// Creates the training table - one row per user per day they trained.
// No number column: a row existing means "trained that day".

const pool = require('../db');

async function createTrainingTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS training (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            entry_date DATE NOT NULL,
            UNIQUE (user_id, entry_date)
        )
    `);
}

module.exports = createTrainingTable;
