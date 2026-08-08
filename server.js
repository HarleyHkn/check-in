// The backend server. For now it only does one thing: serve the existing
// front-end files (index.html, style.css, app.js, modal.js, calender.js)
// so the app can run through a real server instead of just opening the file directly.

require('dotenv').config(); // load .env (SESSION_SECRET, DATABASE_URL) into process.env

const express = require('express');
const session = require('express-session');
const pool = require('./db');
const authRoutes = require('./auth');
const weightsRoutes = require('./weights');
const stepsRoutes = require('./steps');
const measurementsRoutes = require('./measurements');
const photosRoutes = require('./photos');

const app = express();
const port = 3000;

app.use(express.json()); // lets req.body read JSON sent by fetch() calls

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,           // don't re-save a session that hasn't changed
    saveUninitialized: false // don't create a session until something is stored in it (e.g. after login)
}));

app.use('/api', authRoutes);         // adds POST /api/signup, /api/login, /api/logout
app.use('/api', weightsRoutes);      // adds GET/POST /api/weights, DELETE /api/weights/:date
app.use('/api', stepsRoutes);        // adds GET/POST /api/steps, DELETE /api/steps/:date
app.use('/api', measurementsRoutes); // adds measurement-types + measurements routes
app.use('/api', photosRoutes);       // adds GET/POST/DELETE /api/photos routes

app.use(express.static(__dirname)); // serve every file in this folder as-is

app.listen(port, function () {
    console.log('Server is running at http://localhost:' + port);

    // Quick check that the database connection actually works, so a broken
    // DATABASE_URL shows up immediately instead of only failing later on save.
    pool.query('SELECT 1')
        .then(function () {
            console.log('Connected to the database.');
        })
        .catch(function (err) {
            console.error('Could not connect to the database:', err.message);
        });
});
