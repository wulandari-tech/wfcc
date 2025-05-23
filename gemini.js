const express = require('express');
const router = express.Router();
const axios = require("axios");
const { checkApiKeyAndLimit } = require('../middlewares/apiRateLimit');

async function callExternalGeminiApi(prompt) {
    const apiUrl = `https.gemini-api-5k0h.onrender.com/gemini/chat`;
    const params = {
      q: prompt
    };
    try {
        const response = await axios.get(apiUrl, { params });
        return response.data?.content || 'Failed Response Ai';
    } catch (error) {
        console.error("Error calling External Gemini API:", error.message);
        if (error.response) {
            console.error("External Gemini API Response Data:", error.response.data);
            console.error("External Gemini API Response Status:", error.response.status);
        }
        throw new Error(error.response?.data?.error || 'Failed to get response from AI due to an external error.');
    }
}

router.get("/gemini", checkApiKeyAndLimit, async (req, res) => {
    try {
      const { prompt } = req.query;

      if (!prompt) {
        return res.status(400).json({
          success: false, error: "Parameter 'prompt' is required"
        });
      }

      const resultFromAI = await callExternalGeminiApi(prompt);
      res.status(200).json({
        success: true,
        prompt: prompt,
        result: resultFromAI.replaceAll("**", "*"),
        userInfo: {
            username: req.userByApiKey.username,
            apiCallsToday: req.userByApiKey.apiCallCount,
            isPremium: req.userByApiKey.isPremium
        }
      });
    } catch (error) {
      console.error("Error in /api/ai/gemini endpoint:", error.message);
      res.status(500).json({
        success: false, error: error.message || "Internal server error processing Gemini request."
      });
    }
});

module.exports = router;