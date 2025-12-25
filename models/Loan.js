const mongoose = require('mongoose');

/**
 * Loan schema
 * - userId: borrower (ref User)
 * - groupId: optional group that issued loan (ref Group)
 * - amount: principal amount (required, >0)
 * - tenure: number of months (required, integer, >0)
 * - interest: annual interest rate in percent (>=0)
 * - emi: computed monthly EMI (optional; computed automatically if not provided)
 * - status: loan lifecycle status
 */

const loanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  amount: { type: Number, required: true, min: [0, 'Amount must be positive'] },
  tenure: { type: Number, required: true, min: [1, 'Tenure must be at least 1 month'] },
  interest: { type: Number, default: 0, min: [0, 'Interest must be non-negative'] },
  emi: { type: Number, default: 0, min: [0, 'EMI must be non-negative'] },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'active', 'closed'], default: 'pending' },
  // remaining balance of the loan (principal outstanding)
  remainingBalance: { type: Number, default: 0, min: [0, 'Remaining balance must be non-negative'] },
  // payments history
  payments: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, amount: { type: Number, min: 0 }, date: { type: Date, default: Date.now } }],
  // number of installments paid
  installmentsPaid: { type: Number, default: 0 },
  // total amount paid so far
  totalPaid: { type: Number, default: 0, min: 0 },
}, {
  timestamps: true,
});

// Helper to calculate EMI given principal, annual interest percent, and tenure in months
function calculateEmi(principal, annualInterestPercent, months) {
  const P = Number(principal);
  const n = Number(months);
  const annual = Number(annualInterestPercent) || 0;
  if (n <= 0) return 0;
  if (annual === 0) return +(P / n).toFixed(2);
  const r = annual / 100 / 12; // monthly rate
  const numerator = P * r * Math.pow(1 + r, n);
  const denominator = Math.pow(1 + r, n) - 1;
  const emi = numerator / denominator;
  return +emi.toFixed(2);
}

// Pre-save: compute EMI if not provided or if key fields changed
loanSchema.pre('save', function () {
  // only compute when amount/tenure/interest available
  if (this.amount && this.tenure) {
    const shouldCompute = !this.emi || this.isModified('amount') || this.isModified('tenure') || this.isModified('interest');
    if (shouldCompute) {
      this.emi = calculateEmi(this.amount, this.interest || 0, this.tenure);
    }
  }
});

// Instance method to refresh EMI and save
loanSchema.methods.refreshEmi = function () {
  this.emi = calculateEmi(this.amount, this.interest || 0, this.tenure);
  return this.save();
};

// Static helper to compute EMI without saving
loanSchema.statics.calculateEmi = calculateEmi;

module.exports = mongoose.models.Loan || mongoose.model('Loan', loanSchema);
