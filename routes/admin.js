const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middlewares/authMiddleware');
const User = require('../models/user');
const Promo = require('../models/promo');
const Notification = require('../models/notification');
const Setting = require('../models/setting');
const { v4: uuidv4 } = require('uuid');
router.use(protect, isAdmin); 
router.get('/dashboard', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const premiumUsers = await User.countDocuments({ isPremium: true });
    const activePromos = await Promo.countDocuments({ isActive: true, $or: [{ endDate: { $gte: new Date() } }, { endDate: null }] });
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5);
    const recentPromos = await Promo.find().sort({ createdAt: -1 }).limit(5);

    res.render('admin/dashboard', {
        title: 'Admin Dashboard',
        totalUsers,
        premiumUsers,
        activePromos,
        users: recentUsers,
        promos: recentPromos,
        success_msg: req.flash ? req.flash('success_msg') : null, // Jika menggunakan connect-flash
        error_msg: req.flash ? req.flash('error_msg') : null
    });
  } catch (error) {
    console.error('Admin Dashboard Error:', error);
    res.status(500).render('error', { title: 'Server Error', message: 'Could not load admin dashboard.', status: 500 });
  }
});

// USER MANAGEMENT
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const searchTerm = req.query.search || '';
    let query = {};

    if (searchTerm) {
        const searchRegex = new RegExp(searchTerm, 'i');
        query = {
            $or: [
                { username: searchRegex },
                { email: searchRegex }
            ]
        };
    }

    const users = await User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const totalUsers = await User.countDocuments(query);

    res.render('admin/users', {
        title: 'Manage Users',
        users,
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        searchTerm,
        limit,
        success_msg: req.flash ? req.flash('success_msg') : null,
        error_msg: req.flash ? req.flash('error_msg') : null
    });
  } catch (error) {
    console.error('Admin Users List Error:', error);
    res.status(500).render('error', { title: 'Server Error', message: 'Could not load user list.', status: 500 });
  }
});

router.get('/users/:id/edit', async (req, res) => {
    try {
        const userToEdit = await User.findById(req.params.id);
        if (!userToEdit) {
            if (req.flash) req.flash('error_msg', 'User not found.');
            return res.redirect('/admin/users');
        }
        res.render('admin/edit-user', { title: `Edit User: ${userToEdit.username}`, userToEdit });
    } catch (error) {
        console.error('Admin Edit User GET Error:', error);
        if (req.flash) req.flash('error_msg', 'Error loading user for editing.');
        res.redirect('/admin/users');
    }
});

router.post('/users/:id/edit', async (req, res) => {
    const { username, email, role, isPremium, premiumExpiryDate, apiKey, apiCallLimit } = req.body;
    let userToUpdate;
    try {
        userToUpdate = await User.findById(req.params.id);
        if (!userToUpdate) {
            if (req.flash) req.flash('error_msg', 'User not found.');
            return res.redirect('/admin/users');
        }

        // Cegah admin mengubah role diri sendiri menjadi non-admin dari form ini
        if (userToUpdate._id.equals(req.user._id) && userToUpdate.role === 'admin' && role !== 'admin') {
            return res.render('admin/edit-user', { title: `Edit User: ${userToUpdate.username}`, userToUpdate, error: 'Admin tidak bisa mengubah role diri sendiri menjadi non-admin melalui form ini.' });
        }

        userToUpdate.username = username || userToUpdate.username;
        const newEmail = email ? email.toLowerCase() : userToUpdate.email;
        if (newEmail !== userToUpdate.email) { // Cek jika email diubah dan apakah sudah ada
            const emailExists = await User.findOne({ email: newEmail, _id: { $ne: userToUpdate._id } });
            if (emailExists) {
                return res.render('admin/edit-user', { title: `Edit User: ${userToUpdate.username}`, userToUpdate, error: 'Email sudah digunakan oleh user lain.' });
            }
            userToUpdate.email = newEmail;
        }

        if (!userToUpdate._id.equals(req.user._id)) { // Admin tidak bisa ubah role diri sendiri di form ini
             userToUpdate.role = role || userToUpdate.role;
        }
        userToUpdate.isPremium = isPremium === 'on';
        userToUpdate.premiumExpiryDate = premiumExpiryDate ? new Date(premiumExpiryDate) : null;
        userToUpdate.apiCallLimit = parseInt(apiCallLimit) >= 0 ? parseInt(apiCallLimit) : userToUpdate.apiCallLimit;

        if (apiKey) { // Hanya update jika ada input baru
            const apiKeyExists = await User.findOne({ apiKey: apiKey, _id: { $ne: userToUpdate._id } });
            if (apiKeyExists) {
                 return res.render('admin/edit-user', { title: `Edit User: ${userToUpdate.username}`, userToUpdate, error: 'API Key tersebut sudah digunakan.' });
            }
            userToUpdate.apiKey = apiKey;
        } else if (req.body.generateApiKey === 'on' && !userToUpdate.apiKey) { // Generate jika dicentang & belum ada
            userToUpdate.apiKey = uuidv4();
        }


        await userToUpdate.save();
        if (req.flash) req.flash('success_msg', 'User updated successfully.');
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Admin Edit User POST Error:', error);
        // Re-fetch userToUpdate jika error terjadi setelah findById
        if(!userToUpdate && req.params.id) userToUpdate = await User.findById(req.params.id).catch(() => null);
        res.render('admin/edit-user', { title: `Edit User: ${userToUpdate ? userToUpdate.username : 'Error'}`, userToUpdate, error: 'Error updating user: ' + error.message });
    }
});

// PROMO MANAGEMENT
router.get('/promos', async (req, res) => {
    try {
        const promos = await Promo.find().populate('createdBy', 'username').sort({ createdAt: -1 });
        res.render('admin/promos', {
            title: 'Manage Promos',
            promos,
            success_msg: req.flash ? req.flash('success_msg') : null,
            error_msg: req.flash ? req.flash('error_msg') : null
        });
    } catch (error) {
        console.error('Admin Promos List Error:', error);
        res.status(500).render('error', { title: 'Server Error', message: 'Could not load promo list.', status: 500 });
    }
});

router.get('/promos/add', (req, res) => {
  res.render('admin/add-promo', { title: 'Add New Promo', formData: {} });
});

router.post('/promos/add', async (req, res) => {
  const { title, description, code, discountPercentage, startDate, endDate, isActive, targetAudience, sendNotification } = req.body;
  try {
    if (code) {
        const codeExists = await Promo.findOne({ code });
        if (codeExists) {
            return res.render('admin/add-promo', { title: 'Add New Promo', error: 'Promo code already exists.', formData: req.body });
        }
    }

    const newPromo = await Promo.create({
      title, description,
      code: code || null,
      discountPercentage: discountPercentage ? parseFloat(discountPercentage) : null,
      startDate: startDate ? new Date(startDate) : Date.now(),
      endDate: endDate ? new Date(endDate) : null,
      isActive: isActive === 'on',
      targetAudience: targetAudience || 'all',
      createdBy: req.user._id
    });

    if (sendNotification === 'on') {
        let usersToNotifyQuery = {};
        if (newPromo.targetAudience === 'premium') usersToNotifyQuery.isPremium = true;
        if (newPromo.targetAudience === 'free') usersToNotifyQuery.isPremium = false;

        const usersToNotify = await User.find(usersToNotifyQuery).select('_id');
        const notifications = usersToNotify.map(u => ({
            userId: u._id,
            title: `✨ New Promo: ${newPromo.title}!`,
            message: `${newPromo.description.substring(0, 100)}... ${newPromo.code ? `Use code: ${newPromo.code}` : ''}`,
            link: `/promos/detail/${newPromo._id}`,
            type: 'promo',
            relatedId: newPromo._id
        }));
        if (notifications.length > 0) await Notification.insertMany(notifications);
    }
    if (req.flash) req.flash('success_msg', 'Promo added successfully.');
    res.redirect('/admin/promos');
  } catch (error) {
    console.error('Admin Add Promo Error:', error);
    res.render('admin/add-promo', { title: 'Add New Promo', error: 'Error adding promo: ' + error.message, formData: req.body });
  }
});

router.get('/promos/:id/edit', async (req, res) => {
    try {
        const promo = await Promo.findById(req.params.id);
        if (!promo) {
            if (req.flash) req.flash('error_msg', 'Promo not found.');
            return res.redirect('/admin/promos');
        }
        res.render('admin/edit-promo', { title: `Edit Promo: ${promo.title}`, promo });
    } catch (error) {
        console.error('Admin Edit Promo GET Error:', error);
        if (req.flash) req.flash('error_msg', 'Error loading promo for editing.');
        res.redirect('/admin/promos');
    }
});

router.post('/promos/:id/edit', async (req, res) => {
    const { title, description, code, discountPercentage, startDate, endDate, isActive, targetAudience } = req.body;
    let promo;
    try {
        promo = await Promo.findById(req.params.id);
        if (!promo) {
            if (req.flash) req.flash('error_msg', 'Promo not found.');
            return res.redirect('/admin/promos');
        }

        if (code && code !== promo.code) {
            const codeExists = await Promo.findOne({ code: code, _id: { $ne: promo._id } });
            if (codeExists) {
                return res.render('admin/edit-promo', { title: `Edit Promo: ${promo.title}`, promo, error: 'Promo code already exists.' });
            }
        }

        promo.title = title;
        promo.description = description;
        promo.code = code || null;
        promo.discountPercentage = discountPercentage ? parseFloat(discountPercentage) : null;
        promo.startDate = startDate ? new Date(startDate) : promo.startDate;
        promo.endDate = endDate ? new Date(endDate) : null;
        promo.isActive = isActive === 'on';
        promo.targetAudience = targetAudience || promo.targetAudience;

        await promo.save();
        if (req.flash) req.flash('success_msg', 'Promo updated successfully.');
        res.redirect('/admin/promos');
    } catch (error) {
        console.error('Admin Edit Promo POST Error:', error);
        // Re-fetch promo jika error terjadi setelah findById
        if(!promo && req.params.id) promo = await Promo.findById(req.params.id).catch(()=>null);
        res.render('admin/edit-promo', { title: `Edit Promo: ${promo ? promo.title : 'Error'}`, promo, error: 'Error updating promo: ' + error.message });
    }
});

router.post('/promos/:id/delete', async (req, res) => {
    try {
        const promo = await Promo.findByIdAndDelete(req.params.id);
        if (!promo) {
            if (req.flash) req.flash('error_msg', 'Promo not found.');
            return res.redirect('/admin/promos');
        }
        if (req.flash) req.flash('success_msg', 'Promo deleted successfully.');
        res.redirect('/admin/promos');
    } catch (error) {
        console.error('Admin Delete Promo Error:', error);
        if (req.flash) req.flash('error_msg', 'Error deleting promo.');
        res.redirect('/admin/promos');
    }
});

// GLOBAL SETTINGS
router.get('/settings', async (req, res) => {
    try {
        let settings = await Setting.find();
        // Inisialisasi setting default jika belum ada
        const requiredSettings = [
            { key: 'defaultUserApiLimit', value: 100, description: 'Default API call limit per day for new users (numeric).' },
            // Tambahkan setting lain yang diperlukan di sini
            // { key: 'siteMaintenanceMode', value: false, description: 'Enable site-wide maintenance mode (boolean).' }
        ];

        for (const reqSetting of requiredSettings) {
            if (!settings.find(s => s.key === reqSetting.key)) {
                const newSetting = await Setting.create(reqSetting);
                settings.push(newSetting);
            }
        }

        res.render('admin/settings', {
            title: 'Global Settings',
            settings,
            success_msg: req.flash ? req.flash('success_msg') : null,
            error_msg: req.flash ? req.flash('error_msg') : null
        });
    } catch (error) {
        console.error('Admin Settings GET Error:', error);
        res.status(500).render('error', { title: 'Server Error', message: 'Could not load settings.', status: 500 });
    }
});

router.post('/settings/update', async (req, res) => {
    try {
        const updates = [];
        for (const key in req.body) {
            const setting = await Setting.findOne({ key: key });
            if (setting) {
                let value = req.body[key];
                // Konversi tipe data jika perlu
                if (key === 'defaultUserApiLimit') {
                    value = parseInt(value);
                    if (isNaN(value) || value < 0) value = 100; // Default jika invalid
                }
                // if (key === 'siteMaintenanceMode') { // Contoh untuk boolean
                //     value = (value === 'on');
                // }
                updates.push(Setting.updateOne({ key: key }, { value: value }));
            }
        }
        await Promise.all(updates);
        if (req.flash) req.flash('success_msg', 'Settings updated successfully.');
        res.redirect('/admin/settings');
    } catch (error) {
        console.error('Admin Settings POST Error:', error);
        if (req.flash) req.flash('error_msg', 'Failed to update settings: ' + error.message);
        res.redirect('/admin/settings');
    }
});

module.exports = router;