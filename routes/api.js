const express = require('express');
const router = express.Router();
const Promo = require('../models/promo');
const { checkApiKeyAndLimit } = require('../middlewares/apiRateLimit'); 
router.get('/promos', async (req, res) => {
  try {
    const promos = await Promo.find({ isActive: true, endDate: { $gte: new Date() } })
                              .select('title description code discountPercentage endDate');
    res.json({ success: true, data: promos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

router.get('/ai/gemini', checkApiKeyAndLimit, async (req, res) => {
    const prompt = req.query.prompt;
    if (!prompt) {
        return res.status(400).json({ success: false, message: "Parameter 'prompt' is required." });
    }

    try {
        const simulatedResponse = {
            prompt: prompt,
            answer: `This is a simulated AI response to: "${prompt}". In a real scenario, I would provide a more intelligent answer. Your API Key is valid.`,
            confidence: Math.random().toFixed(2),
            tokens_used: Math.floor(Math.random() * 100) + 10,
            user_info: {
                username: req.userByApiKey.username,
                api_calls_today: req.userByApiKey.apiCallCount,
                api_limit_today: req.userByApiKey.apiCallLimit,
                is_premium: req.userByApiKey.isPremium
            }
        };

        res.json({ success: true, data: simulatedResponse });

    } catch (error) {
        console.error("Error in /ai/gemini endpoint:", error);
        res.status(500).json({ success: false, message: "An error occurred while processing your request to Gemini AI." });
    }
});

router.get('/check-premium-status', checkApiKeyAndLimit, (req, res) => {
    res.json({
        success: true,
        data: {
            username: req.userByApiKey.username,
            isPremium: req.userByApiKey.isPremium,
            premiumExpiryDate: req.userByApiKey.premiumExpiryDate,
            apiKey: req.userByApiKey.apiKey,
            apiCallsToday: req.userByApiKey.apiCallCount,
            apiLimitToday: req.userByApiKey.apiCallLimit
        }
    });
});

module.exports = router;