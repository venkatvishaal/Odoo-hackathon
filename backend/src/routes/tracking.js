const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');
const { authMiddleware, authorize } = require('../middleware/auth');
const { validators, handleValidationErrors } = require('../middleware/validation');

// ── Public Routes (anyone can track cargo) ──
router.get('/:tripId', trackingController.getTrackingHistory);
router.get('/:tripId/latest', trackingController.getLatestCheckpoint);

// ── Private Routes (any authenticated role; controller checks per-trip permissions) ──
router.post(
  '/',
  authMiddleware,
  authorize('fleet_manager', 'driver', 'safety_officer', 'financial_analyst'),
  trackingController.addTracking
);

module.exports = router;
