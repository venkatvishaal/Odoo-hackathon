const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authMiddleware, authorize } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/dashboard', analyticsController.getDashboard);
// Finance exports are for fleet managers and financial analysts only; the dashboard stays open to every role.
router.get('/export', authorize('fleet_manager', 'financial_analyst'), analyticsController.exportCSV);

module.exports = router;
