// Routes for reading/saving/deleting training days. Mirrors steps.js - all of
// them require login (or the API key), and every query is scoped to the user.
// One row = one day the user trained; a week's session count = its row count.

const express = require('express');
const pool = require('../db');
const requireLogin = require('../requireLogin');

const router = express.Router();

// Get all of the logged-in user's training days. week_start (that week's
// Monday) is included so a script can group by week without date math.
router.get('/training', requireLogin, async function (req, res) {
    const result = await pool.query(
        `SELECT entry_date, date_trunc('week', entry_date)::date AS week_start
         FROM training WHERE user_id = $1 ORDER BY entry_date`,
        [req.session.userId]
    );
    res.json(result.rows);
});

// Mark a date as trained. Saving the same date twice does nothing,
// enforced by the UNIQUE(user_id, entry_date) constraint.
router.post('/training', requireLogin, async function (req, res) {
    const date = req.body.date;

    if (!date) {
        return res.status(400).json({ error: 'A date is required.' });
    }

    await pool.query(
        `INSERT INTO training (user_id, entry_date)
         VALUES ($1, $2)
         ON CONFLICT (user_id, entry_date) DO NOTHING`,
        [req.session.userId, date]
    );

    res.json({ success: true });
});

// Un-mark a date (the user un-checked that day).
router.delete('/training/:date', requireLogin, async function (req, res) {
    await pool.query(
        'DELETE FROM training WHERE user_id = $1 AND entry_date = $2',
        [req.session.userId, req.params.date]
    );
    res.json({ success: true });
});

module.exports = router;
