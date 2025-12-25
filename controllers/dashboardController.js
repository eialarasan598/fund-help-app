const User = require('../models/User');
const Group = require('../models/Group');
const Loan = require('../models/Loan');

// GET /api/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user && req.user._id;

    // Global aggregates
    const [totalUsers, totalGroups] = await Promise.all([
      User.countDocuments(),
      Group.countDocuments(),
    ]);

    // sum group balances
    const groupAgg = await Group.aggregate([
      { $group: { _id: null, totalGroupBalance: { $sum: '$totalBalance' } } }
    ]);
    const totalGroupBalance = (groupAgg[0] && groupAgg[0].totalGroupBalance) || 0;

    // loans aggregates
    const loanAgg = await Loan.aggregate([
      { $group: { _id: null, totalLoanedAmount: { $sum: '$amount' }, totalOutstanding: { $sum: '$remainingBalance' } } }
    ]);
    const totalLoanedAmount = (loanAgg[0] && loanAgg[0].totalLoanedAmount) || 0;
    const totalOutstanding = (loanAgg[0] && loanAgg[0].totalOutstanding) || 0;

    const [pendingLoans, activeLoans, totalLoans] = await Promise.all([
      Loan.countDocuments({ status: 'pending' }),
      Loan.countDocuments({ status: 'active' }),
      Loan.countDocuments(),
    ]);

    // Top 5 groups by balance
    const topGroups = await Group.find().sort({ totalBalance: -1 }).limit(5).select('name totalBalance').lean();

    // User-specific data (if authenticated)
    let userData = {};
    if (userId) {
      const [userGroups, userLoans, userLoanAgg] = await Promise.all([
        Group.find({ members: userId }).select('name totalBalance members').lean(),
        Loan.find({ userId }).lean(),
        Loan.aggregate([
          { $match: { userId: userId } },
          { $group: { _id: null, loanCount: { $sum: 1 }, loanOutstanding: { $sum: '$remainingBalance' } } }
        ])
      ]);

      userData = {
        groupsCount: userGroups.length,
        groups: userGroups,
        loans: userLoans,
        loansCount: (userLoanAgg[0] && userLoanAgg[0].loanCount) || 0,
        loansOutstanding: (userLoanAgg[0] && userLoanAgg[0].loanOutstanding) || 0,
      };
    }

    return res.json({
      totals: {
        users: totalUsers,
        groups: totalGroups,
        totalGroupBalance,
        loans: totalLoans,
        pendingLoans,
        activeLoans,
        totalLoanedAmount,
        totalOutstanding,
      },
      topGroups,
      user: userData,
    });
  } catch (err) {
    console.error('dashboard error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
