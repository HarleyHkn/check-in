// Routes for measurement VALUES - the day-by-day numbers for each measurement type
// (e.g. Chest on Aug 4th). See measurement-types.js for the types themselves
// (a separate resource, own table, own file) even though they're closely related.
// All routes require login and are scoped to req.session.userId.

const express = require('express');
const pool = require('../db');
const requireLogin = require('../requireLogin');

const router = express.Router();

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
