// Middleware that blocks a route unless the visitor is logged in.
// Usage: app.post('/api/something', requireLogin, function (req, res) { ... })

function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'You need to be logged in to do that.' });
    }
    next();
}

module.exports = requireLogin;
