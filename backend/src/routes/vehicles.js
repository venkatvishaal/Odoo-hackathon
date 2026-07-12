const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { authMiddleware, authorize } = require('../middleware/auth');
const { validators, handleValidationErrors } = require('../middleware/validation');

router.use(authMiddleware);

router.get('/', vehicleController.getAll);
router.get('/eligible-for-dispatch', vehicleController.getEligibleForDispatch);
router.get('/:id', vehicleController.getById);
router.post('/', authorize('fleet_manager'), validators.createVehicle, handleValidationErrors, vehicleController.create);
router.put('/:id', authorize('fleet_manager'), vehicleController.update);
router.delete('/:id', authorize('fleet_manager'), vehicleController.delete);

module.exports = router;
