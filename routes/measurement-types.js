// Routes for measurement TYPES (Chest, Left Arm, etc.) - adding/removing/listing
// the types a user tracks. See measurements.js for the day-by-day VALUES routes,
// a separate resource (own table, own file) even though they're closely related.
// All routes require login and are scoped to req.session.userId.

const express = require('express');
const pool = require('../db');
const requireLogin = require('../requireLogin');

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

module.exports = router;
