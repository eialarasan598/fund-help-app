const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },

  // Admin user reference
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Members: array of User _id references
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Monthly contribution amount for each member or group expectation
  monthlyContribution: { type: Number, default: 0 },

  // Total group balance
  totalBalance: { type: Number, default: 0 },
}, {
  timestamps: true,
});

// Contribution history: who paid how much and when
groupSchema.add({
  contributions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now }
  }]
});

// Validation helpers
groupSchema.statics.MAX_MEMBERS = 200; // sensible default limit

// Instance helper to add a contribution and update totalBalance
groupSchema.methods.addContribution = async function (userId, amount) {
  if (amount <= 0) throw new Error('Contribution amount must be positive');
  this.contributions.push({ user: userId, amount });
  this.totalBalance = (this.totalBalance || 0) + amount;
  await this.save();
  return this;
};

// Recalculate totalBalance from contributions (aggregation helper)
groupSchema.methods.recalculateTotal = function () {
  const total = (this.contributions || []).reduce((sum, c) => sum + (c.amount || 0), 0);
  this.totalBalance = total;
  return this.save();
};

module.exports = mongoose.models.Group || mongoose.model('Group', groupSchema);
