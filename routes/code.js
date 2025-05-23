const express = require('express');
const router = express.Router();

router.get('/code', (req, res) => {
    res.render('code', { title: 'Code Examples' });
});

module.exports = router;