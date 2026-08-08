// One-time setup script: creates the users, weights, steps, measurement_types, and measurements tables.
// Run this once with: node setup-db.js
// Safe to run again later too - "IF NOT EXISTS" means it won't wipe existing tables/data.

const pool = require('./db');

async function setupDatabase() {

    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS weights (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            entry_date DATE NOT NULL,
            weight NUMERIC NOT NULL,
            UNIQUE (user_id, entry_date)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS steps (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            entry_date DATE NOT NULL,
            steps INTEGER NOT NULL,
            UNIQUE (user_id, entry_date)
        )
    `);

    // Each user has their own list of measurement types - the 7 base ones (seeded on
    // signup, see auth.js) plus any custom ones they add. is_active lets a user "remove"
    // a type (stop seeing it in the entry form) without deleting the type or its history.
    await pool.query(`
        CREATE TABLE IF NOT EXISTS measurement_types (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            name TEXT NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT true,
            UNIQUE (user_id, name)
        )
    `);

    // One row per day per measurement type (e.g. Chest on Aug 4th). type_name matches
    // a measurement_types.name for that same user.
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

    // One row per week per angle (Front/Back/Side). entry_date is always that week's
    // Monday - same convention measurements uses - so a photo set for a week lives at
    // one predictable date no matter which day it was actually uploaded on. The image
    // itself is stored right in the row as bytea (raw bytes); mime_type is saved
    // alongside it so the server knows what Content-Type to serve it back as.
    await pool.query(`
        CREATE TABLE IF NOT EXISTS photos (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            entry_date DATE NOT NULL,
            angle TEXT NOT NULL,
            image_data BYTEA NOT NULL,
            mime_type TEXT NOT NULL,
            UNIQUE (user_id, entry_date, angle)
        )
    `);

    console.log('Tables created (or already existed). Setup complete.');
    await pool.end(); // close the connection so the script actually exits
}

setupDatabase();
