const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const { authMiddleware, authorize } = require('../middleware/auth');
const { validators, handleValidationErrors } = require('../middleware/validation');

router.use(authMiddleware);

router.get('/', tripController.getAll);
router.post('/', authorize('fleet_manager', 'driver'), validators.createTrip, handleValidationErrors, tripController.create);
router.post('/:id/dispatch', authorize('fleet_manager', 'driver'), tripController.dispatch);
router.post('/:id/complete', authorize('fleet_manager', 'driver'), validators.completeTrip, handleValidationErrors, tripController.complete);
router.post('/:id/cancel', authorize('fleet_manager', 'driver'), tripController.cancel);

module.exports = router;
