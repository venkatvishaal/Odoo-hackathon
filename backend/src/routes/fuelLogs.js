const express = require('express');
const router = express.Router();
const fuelLogController = require('../controllers/fuelLogController');
const { authMiddleware, authorize } = require('../middleware/auth');
const { validators, handleValidationErrors } = require('../middleware/validation');

router.use(authMiddleware);

router.get('/', fuelLogController.getAll);
router.post('/', authorize('fleet_manager', 'driver', 'financial_analyst'), validators.createFuelLog, handleValidationErrors, fuelLogController.create);

module.exports = router;
