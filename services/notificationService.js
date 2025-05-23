const Notification = require('../models/notification');
const User = require('../models/user');
const createNotification = async (userId, title, message, link = null) => {
  try {
    const notification = await Notification.create({ userId, title, message, link });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

const createNotificationForAllUsers = async (title, message, link = null) => {
    try {
        const users = await User.find({ role: 'user' }).select('_id'); // Ambil semua user (non-admin)
        const notifications = users.map(user => ({
            userId: user._id,
            title,
            message,
            link,
        }));
        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
            console.log(`Created ${notifications.length} notifications for all users.`);
        }
    } catch (error) {
        console.error('Error creating notifications for all users:', error);
        throw error;
    }
};


module.exports = { createNotification, createNotificationForAllUsers };