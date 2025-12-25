const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const loanCtrl = require('../controllers/loanController');

// All loan routes protected
router.use(auth);

// POST /api/loans/request - member requests loan
router.post('/request', loanCtrl.requestLoan);

// PUT /api/loans/:id/approve - admin approves loan
router.put('/:id/approve', loanCtrl.approveLoan);

// POST /api/loans/:id/pay - borrower pays EMI
router.post('/:id/pay', loanCtrl.payEmi);

// GET /api/loans/:id - get loan
router.get('/:id', loanCtrl.getLoan);

module.exports = router;
