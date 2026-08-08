// Creates the steps table - one row per user per day they logged a step count.

const pool = require('../db');

async function createStepsTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS steps (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            entry_date DATE NOT NULL,
            steps INTEGER NOT NULL,
            UNIQUE (user_id, entry_date)
        )
    `);
}

module.exports = createStepsTable;
