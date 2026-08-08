// Routes for reading/saving/deleting weight entries. All of them require login,
// and every query is scoped to req.session.userId so one user can never see or
// change another user's data.

const express = require('express');
const pool = require('./db');
const requireLogin = require('./requireLogin');

const router = express.Router();

// Get all of the logged-in user's weight entries.
router.get('/weights', requireLogin, async function (req, res) {
    const result = await pool.query(
        'SELECT entry_date, weight FROM weights WHERE user_id = $1 ORDER BY entry_date',
        [req.session.userId]
    );
    res.json(result.rows);
});

// Save a weight entry for a date. Adds a new one, or overwrites the existing
// one for that date - same behavior as the old upsertEntryForDate, now enforced
// by the UNIQUE(user_id, entry_date) constraint instead of hand-checked in JS.
router.post('/weights', requireLogin, async function (req, res) {
    const date = req.body.date;
    const weight = Number(req.body.weight);

    if (!date || isNaN(weight)) {
        return res.status(400).json({ error: 'A date and a numeric weight are required.' });
    }

    await pool.query(
        `INSERT INTO weights (user_id, entry_date, weight)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, entry_date)
         DO UPDATE SET weight = $3`,
        [req.session.userId, date, weight]
    );

    res.json({ success: true });
});

// Delete the logged-in user's entry for one date, if they have one.
router.delete('/weights/:date', requireLogin, async function (req, res) {
    await pool.query(
        'DELETE FROM weights WHERE user_id = $1 AND entry_date = $2',
        [req.session.userId, req.params.date]
    );
    res.json({ success: true });
});

module.exports = router;
