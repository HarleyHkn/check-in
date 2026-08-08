// Signup, login, and logout routes.

const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('./db');
const requireLogin = require('./requireLogin');

const router = express.Router();

router.post('/signup', async function (req, res) {
    const username = req.body.username;
    const password = req.body.password;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'That username is already taken.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
        'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
        [username, passwordHash]
    );
    const newUser = result.rows[0];

    req.session.userId = newUser.id; // log them in immediately after signing up

    res.json({ id: newUser.id, username: newUser.username });
});

router.post('/login', async function (req, res) {
    const username = req.body.username;
    const password = req.body.password;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    const result = await pool.query('SELECT id, username, password_hash FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user) {
        return res.status(401).json({ error: 'Incorrect username or password.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
        return res.status(401).json({ error: 'Incorrect username or password.' });
    }

    req.session.userId = user.id;

    res.json({ id: user.id, username: user.username });
});

router.post('/logout', function (req, res) {
    req.session.destroy(function () {
        res.json({ success: true });
    });
});

// Lets the frontend check "is someone already logged in?" (e.g. right after the page loads).
router.get('/whoami', requireLogin, async function (req, res) {
    const result = await pool.query('SELECT username FROM users WHERE id = $1', [req.session.userId]);
    res.json({ userId: req.session.userId, username: result.rows[0].username });
});

module.exports = router;
