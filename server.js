// The backend server: sets up sessions, mounts the /api routes, and serves the
// front-end files in public/.

require('dotenv').config(); // load .env (SESSION_SECRET, DATABASE_URL) into process.env

const path = require('path');
const express = require('express');
const session = require('express-session');
const pool = require('./db');
const authRoutes = require('./routes/auth');
const weightsRoutes = require('./routes/weights');
const stepsRoutes = require('./routes/steps');
const measurementTypesRoutes = require('./routes/measurement-types');
const measurementsRoutes = require('./routes/measurements');
const photosRoutes = require('./routes/photos');
const trainingRoutes = require('./routes/training');

const app = express();
const port = process.env.PORT || 3000; // hosts like Render assign their own port via this env var

app.use(express.json()); // lets req.body read JSON sent by fetch() calls

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,           // don't re-save a session that hasn't changed
    saveUninitialized: false // don't create a session until something is stored in it (e.g. after login)
}));

app.use('/api', authRoutes);            // adds POST /api/signup, /api/login, /api/logout
app.use('/api', weightsRoutes);         // adds GET/POST /api/weights, DELETE /api/weights/:date
app.use('/api', stepsRoutes);           // adds GET/POST /api/steps, DELETE /api/steps/:date
app.use('/api', measurementTypesRoutes); // adds measurement-types routes
app.use('/api', measurementsRoutes);    // adds measurements (values) routes
app.use('/api', photosRoutes);          // adds GET/POST/DELETE /api/photos routes
app.use('/api', trainingRoutes);        // adds GET/POST /api/training, DELETE /api/training/:date

app.use(express.static(path.join(__dirname, 'public'))); // serve everything in public/ as-is

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
