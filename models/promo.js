const mongoose = require('mongoose');
const promoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  code: { type: String, unique: true, sparse: true },
  discountPercentage: { type: Number, min: 0, max: 100 },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  isActive: { type: Boolean, default: true },
  usageCount: { type: Number, default: 0 }, 
  targetAudience: { type: String, enum: ['all', 'premium', 'free'], default: 'all' }, 
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

promoSchema.pre('save', function(next) {
    if (this.isModified()) {
        this.updatedAt = Date.now();
    }
    next();
});

const Promo = mongoose.model('Promo', promoSchema);
module.exports = Promo;