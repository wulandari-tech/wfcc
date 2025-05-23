const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const User = require('../models/user');
const Notification = require('../models/notification');
const Promo = require('../models/promo');

router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).render('error', { title: 'Error', message: 'User not found', status: 404 });
        }
        const unreadNotificationsCount = await Notification.countDocuments({ userId: req.user.id, isRead: false });
        res.render('profile', { title: 'My Profile', user, unreadNotificationsCount, success_msg: req.flash ? req.flash('success_msg') : null, error_msg: req.flash ? req.flash('error_msg') : null });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { title: 'Error', message: 'Server error', status: 500 });
    }
});

router.get('/notifications', protect, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
        const unreadNotificationsCount = await Notification.countDocuments({ userId: req.user.id, isRead: false });
        res.render('notifications', { title: 'My Notifications', notifications, unreadNotificationsCount });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { title: 'Error', message: 'Could not load notifications', status: 500 });
    }
});

router.post('/notifications/:id/read', protect, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { isRead: true },
            { new: true }
        );
        if (!notification) {
            return res.status(404).send('Notification not found or not yours.');
        }
        res.redirect('/user/notifications');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error.');
    }
});

router.get('/code', protect, async (req,res) => {
    const unreadNotificationsCount = await Notification.countDocuments({ userId: req.user.id, isRead: false });
    res.render('code', { title: 'Enter Discount Code', unreadNotificationsCount, success_msg: req.flash ? req.flash('success_msg') : null, error_msg: req.flash ? req.flash('error_msg') : null });
});

router.post('/code/apply', protect, async (req, res) => {
    const { promoCode } = req.body;
    try {
        const promo = await Promo.findOne({ code: promoCode, isActive: true, endDate: { $gte: new Date() } });
        if (!promo) {
            if(req.flash) req.flash('error_msg', 'Invalid or expired promo code.');
            return res.redirect('/user/code');
        }
        if(req.flash) req.flash('success_msg', `Promo "${promo.title}" applied! Discount: ${promo.discountPercentage || 0}%`);
        console.log(`User ${req.user.username} applied promo: ${promo.title}`);
        res.redirect('/user/code'); 

    } catch (error) {
        console.error(error);
        if(req.flash) req.flash('error_msg', 'Server error applying promo code.');
        res.redirect('/user/code');
    }
});


module.exports = router;