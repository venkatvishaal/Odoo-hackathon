const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');
const { authMiddleware, authorize } = require('../middleware/auth');
const { validators, handleValidationErrors } = require('../middleware/validation');

// ── Public Routes (anyone can track cargo) ──
router.get('/:tripId', trackingController.getTrackingHistory);
router.get('/:tripId/latest', trackingController.getLatestCheckpoint);

// ── Private Routes (drivers or managers logging coordinates) ──
router.post(
  '/',
  authMiddleware,
  authorize('fleet_manager', 'driver'),
  trackingController.addTracking
);

module.exports = router;
