// Middleware that blocks a route unless the visitor is logged in.
// Usage: app.post('/api/something', requireLogin, function (req, res) { ... })

const getUserIdFromApiKey = require('./apiKey');

function requireLogin(req, res, next) {
    // A valid API key counts as logged in, so scripts can save data without a password.
    const apiUserId = getUserIdFromApiKey(req);
    if (apiUserId !== null) {
        req.session.userId = apiUserId;
    }

    if (!req.session.userId) {
        return res.status(401).json({ error: 'You need to be logged in to do that.' });
    }
    next();
}

module.exports = requireLogin;
