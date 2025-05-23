const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('endpoints', { title: 'API Endpoints' });
});

module.exports = router;