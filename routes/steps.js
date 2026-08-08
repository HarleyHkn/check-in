// Routes for reading/saving/deleting daily step counts. Mirrors weights.js -
// all of them require login, and every query is scoped to req.session.userId.

const express = require('express');
const pool = require('../db');
const requireLogin = require('../requireLogin');

const router = express.Router();

// Get all of the logged-in user's step entries.
router.get('/steps', requireLogin, async function (req, res) {
    const result = await pool.query(
        'SELECT entry_date, steps FROM steps WHERE user_id = $1 ORDER BY entry_date',
        [req.session.userId]
    );
    res.json(result.rows);
});

// Save a step count for a date. Adds a new one, or overwrites the existing
// one for that date, enforced by the UNIQUE(user_id, entry_date) constraint.
router.post('/steps', requireLogin, async function (req, res) {
    const date = req.body.date;
    const steps = Number(req.body.steps);

    if (!date || isNaN(steps)) {
        return res.status(400).json({ error: 'A date and a numeric step count are required.' });
    }

    await pool.query(
        `INSERT INTO steps (user_id, entry_date, steps)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, entry_date)
         DO UPDATE SET steps = $3`,
        [req.session.userId, date, steps]
    );

    res.json({ success: true });
});

// Delete the logged-in user's step entry for one date, if they have one.
router.delete('/steps/:date', requireLogin, async function (req, res) {
    await pool.query(
        'DELETE FROM steps WHERE user_id = $1 AND entry_date = $2',
        [req.session.userId, req.params.date]
    );
    res.json({ success: true });
});

module.exports = router;
