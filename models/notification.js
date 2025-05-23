const mongoose = require('mongoose');
const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String }, 
    isRead: { type: Boolean, default: false },
    type: {type: String, enum: ['promo', 'system', 'announcement'], default: 'system'},
    relatedId: { type: mongoose.Schema.Types.ObjectId }, 
    createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;