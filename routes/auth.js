const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Notification = require('../models/notification');
const jwt = require('jsonwebtoken');
const { protect } = require('../middlewares/authMiddleware');

router.get('/register', (req, res) => {
    if (res.locals.user) return res.redirect('/');
    res.render('register', { title: 'Register', formData: {} });
});

router.post('/register', async (req, res) => {
  if (res.locals.user) return res.redirect('/');
  const { username, email, password } = req.body;
  try {
    if (!username || !email || !password) {
        req.flash('error_msg', 'All fields are required.');
        return res.render('register', { title: 'Register', formData: req.body });
    }
    const userExists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    if (userExists) {
      req.flash('error_msg', 'User with that email or username already exists.');
      return res.render('register', { title: 'Register', formData: req.body });
    }
    await User.create({ username, email, password });
    req.flash('success_msg', 'Registration successful! Please log in.');
    res.redirect('/auth/login');
  } catch (error) {
    console.error('ERROR DURING REGISTRATION:', error);
    req.flash('error_msg', 'Server error during registration. Please try again.');
    res.render('register', { title: 'Register', formData: req.body });
  }
});

router.get('/login', (req, res) => {
    if (res.locals.user) {
        return res.redirect('/');
    }
    let successMessageFromQuery = null;
    if (req.query.loggedout === 'true') {
        successMessageFromQuery = 'You have been logged out successfully.';
    }
    res.render('login', {
        title: 'Login',
        email: req.flash('email') ? req.flash('email')[0] : '',
        custom_success_msg: successMessageFromQuery
    });
});

router.post('/login', async (req, res) => {
  if (res.locals.user) return res.redirect('/');
  const { email, password } = req.body;
  try {
    if (!email || !password) {
        req.flash('error_msg', 'Email and password are required.');
        req.flash('email', email);
        return res.redirect('/auth/login');
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (user && (await user.matchPassword(password))) {
      const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
      res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000, path: '/' });
      req.flash('success_msg', `Welcome back, ${user.username}!`);
      res.redirect(user.role === 'admin' ? '/admin/dashboard' : '/');
    } else {
      req.flash('error_msg', 'Invalid email or password.');
      req.flash('email', email);
      res.redirect('/auth/login');
    }
  } catch (error) {
    console.error('ERROR DURING LOGIN:', error);
    req.flash('error_msg', 'Server error during login. Please try again.');
    req.flash('email', email);
    res.redirect('/auth/login');
  }
});

router.get('/logout', (req, res, next) => {
  try {
    res.clearCookie('token', { path: '/' });
    if (req.session) {
        req.session.destroy(err => {
            if (err) {
                console.error('[GET /auth/logout] Error destroying session:', err);
            }
            res.locals.user = null;
            res.locals.unreadNotificationsCount = 0;
            return res.redirect('/auth/login?loggedout=true');
        });
    } else {
        res.locals.user = null;
        res.locals.unreadNotificationsCount = 0;
        return res.redirect('/auth/login?loggedout=true');
    }
  } catch (error) {
      console.error('[GET /auth/logout] Unexpected error during logout:', error);
      next(error);
  }
});

router.get('/profile', protect, (req, res) => {
    res.render('profile', { title: 'My Profile' });
});

router.get('/notifications', protect, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.render('notifications', {
            title: 'My Notifications',
            notifications: notifications
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        req.flash('error_msg', 'Could not load notifications.');
        res.redirect('/');
    }
});

router.post('/notifications/:id/mark-read', protect, async (req, res) => {
    try {
        await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { isRead: true }
        );
        res.redirect(req.query.redirect || '/auth/notifications');
    } catch (error) {
        console.error('Error marking notification as read:', error);
        req.flash('error_msg', 'Failed to mark notification as read.');
        res.redirect('/auth/notifications');
    }
});

module.exports = router;