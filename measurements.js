// Routes for measurement types (Chest, Left Arm, etc.) and the day-by-day values
// for each. All routes require login and are scoped to req.session.userId.

const express = require('express');
const pool = require('./db');
const requireLogin = require('./requireLogin');

const router = express.Router();

const BASE_MEASUREMENT_TYPES = ['Chest', 'Left Arm', 'Right Arm', 'Waist', 'Bottom', 'Left Leg', 'Right Leg'];

// Get this user's measurement types (base + custom). The first time a user asks,
// their base types are created for them - this way both brand new signups and
// existing accounts from before this feature end up with the same starting set.
router.get('/measurement-types', requireLogin, async function (req, res) {
    const existing = await pool.query('SELECT id FROM measurement_types WHERE user_id = $1', [req.session.userId]);

    if (existing.rows.length === 0) {
        for (let i = 0; i < BASE_MEASUREMENT_TYPES.length; i++) {
            await pool.query(
                'INSERT INTO measurement_types (user_id, name) VALUES ($1, $2)',
                [req.session.userId, BASE_MEASUREMENT_TYPES[i]]
            );
        }
    }

    const result = await pool.query(
        'SELECT name, is_active FROM measurement_types WHERE user_id = $1 ORDER BY id',
        [req.session.userId]
    );
    res.json(result.rows);
});

// Add a custom measurement type.
router.post('/measurement-types', requireLogin, async function (req, res) {
    const name = req.body.name;

    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'A name is required.' });
    }

    const existing = await pool.query(
        'SELECT id FROM measurement_types WHERE user_id = $1 AND name = $2',
        [req.session.userId, name]
    );
    if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'You already have a measurement with that name.' });
    }

    await pool.query(
        'INSERT INTO measurement_types (user_id, name) VALUES ($1, $2)',
        [req.session.userId, name]
    );
    res.json({ success: true });
});

// "Remove" a measurement type - just marks it inactive so it stops appearing in
// the entry form, but keeps its past data intact.
router.delete('/measurement-types/:name', requireLogin, async function (req, res) {
    await pool.query(
        'UPDATE measurement_types SET is_active = false WHERE user_id = $1 AND name = $2',
        [req.session.userId, req.params.name]
    );
    res.json({ success: true });
});

// Get all of the logged-in user's measurement values (every type, every date).
router.get('/measurements', requireLogin, async function (req, res) {
    const result = await pool.query(
        'SELECT entry_date, type_name, value FROM measurements WHERE user_id = $1 ORDER BY entry_date',
        [req.session.userId]
    );
    res.json(result.rows);
});

// Save one measurement value for one day. Adds a new one, or overwrites the
// existing one for that day+type - enforced by the UNIQUE(user_id, entry_date, type_name) constraint.
router.post('/measurements', requireLogin, async function (req, res) {
    const date = req.body.date;
    const typeName = req.body.typeName;
    const value = Number(req.body.value);

    if (!date || !typeName || isNaN(value)) {
        return res.status(400).json({ error: 'A date, measurement type, and numeric value are required.' });
    }

    await pool.query(
        `INSERT INTO measurements (user_id, entry_date, type_name, value)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, entry_date, type_name)
         DO UPDATE SET value = $4`,
        [req.session.userId, date, typeName, value]
    );

    res.json({ success: true });
});

// Delete the logged-in user's value for one day+type, if they have one.
router.delete('/measurements/:date/:typeName', requireLogin, async function (req, res) {
    await pool.query(
        'DELETE FROM measurements WHERE user_id = $1 AND entry_date = $2 AND type_name = $3',
        [req.session.userId, req.params.date, req.params.typeName]
    );
    res.json({ success: true });
});

module.exports = router;
