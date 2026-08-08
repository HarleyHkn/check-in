// Routes for weekly progress photos (Front/Back/Side). All of them require login,
// and every query is scoped to req.session.userId. Photos are stored as bytea
// (raw bytes) directly in the photos table - see setup-db.js.

const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const pool = require('./db');
const requireLogin = require('./requireLogin');

const router = express.Router();

const ALLOWED_ANGLES = ['front', 'back', 'side'];

// Reads the uploaded file straight into memory (req.file.buffer) instead of writing
// it to disk first - sharp resizes/compresses it before it ever gets saved anywhere.
// The 10MB cap is just to stop someone accidentally uploading something huge before
// it even reaches the resize step.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

// Get the logged-in user's photo list - just which week+angle combos have a photo,
// not the image bytes themselves (those are fetched one at a time via the route below,
// only when actually displayed, so this stays fast even with a lot of photos).
router.get('/photos', requireLogin, async function (req, res) {
    const result = await pool.query(
        'SELECT entry_date, angle FROM photos WHERE user_id = $1 ORDER BY entry_date DESC',
        [req.session.userId]
    );
    res.json(result.rows);
});

// Serve one photo's actual image bytes, e.g. <img src="/api/photos/2026-08-03/front">.
router.get('/photos/:date/:angle', requireLogin, async function (req, res) {
    const result = await pool.query(
        'SELECT image_data, mime_type FROM photos WHERE user_id = $1 AND entry_date = $2 AND angle = $3',
        [req.session.userId, req.params.date, req.params.angle]
    );
    const photo = result.rows[0];

    if (!photo) {
        return res.status(404).json({ error: 'No photo found for that week and angle.' });
    }

    res.set('Content-Type', photo.mime_type);
    res.send(photo.image_data);
});

// Upload (or replace) a week's photo for one angle. Expects multipart/form-data with
// a "photo" file field, plus "date" and "angle" text fields.
router.post('/photos', requireLogin, upload.single('photo'), async function (req, res) {
    const date = req.body.date;
    const angle = req.body.angle;

    if (!date || !ALLOWED_ANGLES.includes(angle)) {
        return res.status(400).json({ error: 'A date and a valid angle (front, back, or side) are required.' });
    }
    if (!req.file) {
        return res.status(400).json({ error: 'A photo file is required.' });
    }

    // .rotate() with no arguments reads the photo's EXIF orientation tag and rotates it
    // to display upright - phone cameras save photos "sideways" plus an orientation tag
    // more often than not, so skipping this would show a lot of photos on their side.
    const resizedImage = await sharp(req.file.buffer)
        .rotate()
        .resize({ width: 800, withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toBuffer();

    await pool.query(
        `INSERT INTO photos (user_id, entry_date, angle, image_data, mime_type)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, entry_date, angle)
         DO UPDATE SET image_data = $4, mime_type = $5`,
        [req.session.userId, date, angle, resizedImage, 'image/jpeg']
    );

    res.json({ success: true });
});

// Delete the logged-in user's photo for one week+angle, if they have one.
router.delete('/photos/:date/:angle', requireLogin, async function (req, res) {
    await pool.query(
        'DELETE FROM photos WHERE user_id = $1 AND entry_date = $2 AND angle = $3',
        [req.session.userId, req.params.date, req.params.angle]
    );
    res.json({ success: true });
});

module.exports = router;
