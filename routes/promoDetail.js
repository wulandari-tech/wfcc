const express = require('express');
const router = express.Router();
const Promo = require('../models/promo');
const { protect } = require('../middlewares/authMiddleware'); 
router.get('/promos/detail/:promoId', protect, async (req, res) => { 
    try {
        const promo = await Promo.findById(req.params.promoId).populate('createdBy', 'username');
        if (!promo) {
            return res.status(404).render('error', { title: 'Promo Not Found', message: 'The promo you are looking for does not exist.', status: 404 });
        }
        res.render('promo-detail', { title: promo.title, promo });
    } catch (error) {
        console.error('Error fetching promo detail:', error);
        res.status(500).render('error', { title: 'Server Error', message: 'Could not load promo details.', status: 500 });
    }
});

module.exports = router;