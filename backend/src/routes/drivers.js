const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { authMiddleware, authorize } = require('../middleware/auth');
const { validators, handleValidationErrors } = require('../middleware/validation');

router.use(authMiddleware);

router.get('/', driverController.getAll);
router.get('/eligible-for-dispatch', driverController.getEligibleForDispatch);
router.get('/:id', driverController.getById);
router.post('/', authorize('fleet_manager'), validators.createDriver, handleValidationErrors, driverController.create);
router.put('/:id', authorize('fleet_manager', 'safety_officer'), driverController.update);
router.delete('/:id', authorize('fleet_manager'), driverController.delete);

module.exports = router;
