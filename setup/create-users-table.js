// Creates the users table - one row per signed-up account.

const pool = require('../db');

async function createUsersTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    `);
}

module.exports = createUsersTable;
