const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/dashboard', analyticsController.getDashboard);
router.get('/export', analyticsController.exportCSV);

module.exports = router;
