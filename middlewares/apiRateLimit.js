const User = require('../models/user');
const Setting = require('../models/setting');

const checkApiKeyAndLimit = async (req, res, next) => {
    const apiKey = req.query.apikey || req.headers['x-api-key'];
    if (!apiKey) {
        return res.status(401).json({ success: false, message: 'API Key required' });
    }

    try {
        const user = await User.findOne({ apiKey: apiKey });
        if (!user) {
            return res.status(403).json({ success: false, message: 'Invalid API Key' });
        }

        const now = new Date();
        const lastReset = new Date(user.lastApiCallReset);
        const diffTime = Math.abs(now - lastReset);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 1) {
            user.apiCallCount = 0;
            user.lastApiCallReset = now;
        }

        let defaultApiLimitSetting = await Setting.findOne({ key: 'defaultUserApiLimit' });
        const userLimit = user.apiCallLimit || (defaultApiLimitSetting ? parseInt(defaultApiLimitSetting.value) : 100);

        if (user.apiCallCount >= userLimit) {
            return res.status(429).json({ success: false, message: `API call limit of ${userLimit} per day reached. Please try again tomorrow or upgrade your plan.` });
        }

        user.apiCallCount += 1;
        await user.save({ validateBeforeSave: false });

        req.userByApiKey = user;
        next();
    } catch (error) {
        console.error('API Key/Limit check error:', error);
        res.status(500).json({ success: false, message: 'Server error during API Key validation' });
    }
};

module.exports = { checkApiKeyAndLimit };