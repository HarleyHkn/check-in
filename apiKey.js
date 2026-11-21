// Lets a script use the API without a password, by sending
// "Authorization: Bearer <key>". The key and the user it acts as
// come from API_KEY and API_USER_ID in .env (or on Render).

const crypto = require('crypto');

// Shorter keys are too easy to guess, so the feature stays off.
const MINIMUM_KEY_LENGTH = 32;

// Returns the user id the key belongs to, or null if there is no valid key.
function getUserIdFromApiKey(req) {
    const savedKey = process.env.API_KEY;
    const userId = Number(process.env.API_USER_ID);

    // Feature is off unless both values are set up properly.
    if (!savedKey || savedKey.length < MINIMUM_KEY_LENGTH || !Number.isInteger(userId)) {
        return null;
    }

    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return null;
    }
    const sentKey = header.slice('Bearer '.length);

    // timingSafeEqual needs equal lengths; it then takes the same time
    // whether the keys differ early or late, so the key can't be guessed by timing.
    const sentBytes = Buffer.from(sentKey);
    const savedBytes = Buffer.from(savedKey);
    if (sentBytes.length !== savedBytes.length) {
        return null;
    }
    if (!crypto.timingSafeEqual(sentBytes, savedBytes)) {
        return null;
    }

    return userId;
}

module.exports = getUserIdFromApiKey;
