// Creates the photos table. One row per week per angle (Front/Back/Side). entry_date
// is always that week's Monday - same convention measurements uses - so a photo set
// for a week lives at one predictable date no matter which day it was actually
// uploaded on. The image itself is stored right in the row as bytea (raw bytes);
// mime_type is saved alongside it so the server knows what Content-Type to serve it
// back as.

const pool = require('../db');

async function createPhotosTable() {
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
}

module.exports = createPhotosTable;
