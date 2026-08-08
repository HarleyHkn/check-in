// Creates the weights table - one row per user per day they logged a weight.

const pool = require('../db');

async function createWeightsTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS weights (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            entry_date DATE NOT NULL,
            weight NUMERIC NOT NULL,
            UNIQUE (user_id, entry_date)
        )
    `);
}

module.exports = createWeightsTable;
