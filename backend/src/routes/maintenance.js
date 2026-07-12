const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const { authMiddleware, authorize } = require('../middleware/auth');
const { validators, handleValidationErrors } = require('../middleware/validation');

router.use(authMiddleware);
router.use(authorize('fleet_manager'));

router.get('/', maintenanceController.getAll);
router.post('/', validators.createMaintenance, handleValidationErrors, maintenanceController.create);
router.put('/:id/close', maintenanceController.close);

module.exports = router;
