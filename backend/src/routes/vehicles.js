const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const sharedBookingController = require('../controllers/sharedBookingController');
const { authMiddleware, authorize } = require('../middleware/auth');
const { validators, handleValidationErrors } = require('../middleware/validation');

router.use(authMiddleware);

// ── Shared Fleet endpoints (must be before :id routes) ──
router.get('/search', sharedBookingController.searchAvailableSpace);
router.post('/shared-booking', sharedBookingController.requestSharedSpace);

// ── Standard vehicle CRUD ───────────────────────────────
router.get('/', vehicleController.getAll);
router.get('/eligible-for-dispatch', vehicleController.getEligibleForDispatch);
router.get('/:id', vehicleController.getById);
router.post('/', authorize('fleet_manager'), validators.createVehicle, handleValidationErrors, vehicleController.create);
router.put('/:id', authorize('fleet_manager'), vehicleController.update);
router.delete('/:id', authorize('fleet_manager'), vehicleController.delete);

// ── Route publishing on a specific vehicle ──────────────
router.post('/:id/publish-route', authorize('fleet_manager', 'driver'), sharedBookingController.publishRoute);
router.get('/:id/routes', sharedBookingController.getVehicleRoutes);

module.exports = router;
