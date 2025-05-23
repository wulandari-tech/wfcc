const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Notification = require('../models/notification');

const protect = async (req, res, next) => {
  let token;
  if (req.cookies.token) {
    try {
      token = req.cookies.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        req.flash('error_msg', 'Sesi tidak valid, silakan login kembali.');
        res.clearCookie('token', { path: '/' });
        return res.redirect('/login');
      }
      next();
    } catch (error) {
      console.error('Protect Middleware Error:', error.message);
      req.flash('error_msg', 'Sesi berakhir atau tidak valid, silakan login kembali.');
      res.clearCookie('token', { path: '/' });
      return res.redirect('/login');
    }
  } else {
    req.flash('error_msg', 'Anda harus login untuk mengakses halaman ini.');
    res.redirect('/login');
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    req.flash('error_msg', 'Akses ditolak: Anda bukan admin.');
    res.redirect('/'); // Atau ke halaman error khusus
  }
};

const checkAuthStatus = async (req, res, next) => {
  res.locals.user = null; // Default
  if (req.cookies.token) {
    try {
      const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        res.locals.user = user; // User tersedia di semua view jika login
      } else {
        // Token ada tapi user tidak ditemukan (mungkin dihapus), clear cookie
        res.clearCookie('token', { path: '/' });
      }
    } catch (error) {
      // Token tidak valid atau kadaluarsa, clear cookie
      console.warn('checkAuthStatus: Invalid token, clearing cookie -', error.message);
      res.clearCookie('token', { path: '/' });
    }
  }
  next();
};

const addUnreadNotificationCountToLocals = async (req, res, next) => {
    res.locals.unreadNotificationsCount = 0; // Default
    if (res.locals.user && res.locals.user._id) { // Jika user sudah login (dari checkAuthStatus)
        try {
            const count = await Notification.countDocuments({ userId: res.locals.user._id, isRead: false });
            res.locals.unreadNotificationsCount = count;
        } catch (error) {
            console.error('Error fetching unread notification count:', error);
        }
    }
    next();
};


module.exports = { protect, isAdmin, checkAuthStatus, addUnreadNotificationCountToLocals };