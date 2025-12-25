const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const dashboard = require('../controllers/dashboardController');

// Protected dashboard
router.get('/', auth, dashboard.getDashboard);

module.exports = router;
