const User = require('../models/user');

const apiKeyAuth = async (req, res, next) => {
    const apiKey = req.query.apikey || req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ status: false, error: 'API Key required' });
    }

    try {
        const user = await User.findOne({ apiKey: apiKey });

        if (!user) {
            return res.status(403).json({ status: false, error: 'Invalid API Key' });
        }

        if (user.apiRequestsCount >= user.apiRequestLimit) {
            return res.status(429).json({ status: false, error: 'API request limit exceeded. Upgrade to premium or wait for reset.' });
        }
        user.apiRequestsCount += 1;
        await user.save();

        req.userByApiKey = user;
        next();
    } catch (error) {
        console.error('API Key Auth Error:', error);
        res.status(500).json({ status: false, error: 'Server error during API Key validation' });
    }
};

module.exports = apiKeyAuth;