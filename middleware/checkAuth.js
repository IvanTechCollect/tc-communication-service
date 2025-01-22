require('dotenv').config();

function apiKeyMiddleware(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (apiKey && apiKey === process.env.API_KEY) {
        return next();
    }
    return res.status(403).json({ error: 'Forbidden: Invalid API Key' });
}

module.exports = apiKeyMiddleware;