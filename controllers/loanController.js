const Loan = require('../models/Loan');
const Group = require('../models/Group');
const mongoose = require('mongoose');

// Member requests a loan -> status pending
exports.requestLoan = async (req, res) => {
  try {
    const { groupId, amount, tenure, interest } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Amount must be positive' });
    if (!tenure || tenure < 1) return res.status(400).json({ message: 'Tenure must be at least 1 month' });

    // If groupId provided, optionally verify membership
    if (groupId) {
      if (!mongoose.isValidObjectId(groupId)) return res.status(400).json({ message: 'Invalid groupId' });
      const group = await Group.findById(groupId);
      if (!group) return res.status(404).json({ message: 'Group not found' });
      // ensure req.user is member
      if (!group.members.find(m => m.toString() === req.user._id.toString())) return res.status(403).json({ message: 'Only group members can request a loan' });
      // Check group has sufficient totalBalance to cover requested amount
      if (group.totalBalance < amount) return res.status(400).json({ message: 'Insufficient group balance for requested loan' });
    }

    const loan = await Loan.create({ userId: req.user._id, groupId: groupId || null, amount, tenure, interest: interest || 0, status: 'pending' });
    // Set remainingBalance initially to amount
    loan.remainingBalance = loan.amount;
    await loan.save();
    return res.status(201).json(loan);
  } catch (err) {
    console.error('requestLoan error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Approve loan: only group admin can approve -> status active, compute EMI and set remainingBalance
exports.approveLoan = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid loan id' });
    const loan = await Loan.findById(id);
    if (!loan) return res.status(404).json({ message: 'Loan not found' });
    if (!loan.groupId) return res.status(400).json({ message: 'Loan is not associated with a group' });

    const group = await Group.findById(loan.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.adminId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Only group admin can approve loans' });

  // Double-check group has sufficient funds (in case balance changed since request)
  if (group.totalBalance < loan.amount) return res.status(400).json({ message: 'Insufficient group balance at approval time' });

  // Deduct the loan amount from group's balance (reserve/disburse funds)
  group.totalBalance = Math.max(0, group.totalBalance - loan.amount);
  await group.save();

  // Compute EMI and activate loan
  loan.emi = Loan.calculateEmi(loan.amount, loan.interest || 0, loan.tenure);
  loan.remainingBalance = loan.amount;
  loan.status = 'active';
  await loan.save();
  return res.json(loan);
  } catch (err) {
    console.error('approveLoan error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Pay EMI: any member/borrower can pay (we'll allow borrower only)
exports.payEmi = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid loan id' });
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Amount must be positive' });

    const loan = await Loan.findById(id);
    if (!loan) return res.status(404).json({ message: 'Loan not found' });
    if (loan.status !== 'active') return res.status(400).json({ message: 'Loan is not active' });
    // Only borrower can pay
    if (loan.userId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Only borrower can pay the loan' });

    // Record payment
    loan.payments.push({ user: req.user._id, amount });
    loan.totalPaid = (loan.totalPaid || 0) + amount;
    loan.remainingBalance = Math.max(0, (loan.remainingBalance || loan.amount) - amount);
    // Count installment if amount >= emi (simple heuristic)
    if (loan.emi && amount >= loan.emi) loan.installmentsPaid = (loan.installmentsPaid || 0) + 1;

    // Close loan when remainingBalance is zero or installmentsPaid >= tenure
    if (loan.remainingBalance <= 0 || (loan.installmentsPaid >= loan.tenure)) {
      loan.status = 'closed';
    }

    await loan.save();
    return res.json(loan);
  } catch (err) {
    console.error('payEmi error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Optional: get loan details
exports.getLoan = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid loan id' });
    const loan = await Loan.findById(id).populate('userId', '-password').populate('groupId').lean();
    if (!loan) return res.status(404).json({ message: 'Loan not found' });
    return res.json(loan);
  } catch (err) {
    console.error('getLoan error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
