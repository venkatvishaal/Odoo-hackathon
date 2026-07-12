const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { authMiddleware, authorize } = require('../middleware/auth');
const { validators, handleValidationErrors } = require('../middleware/validation');

router.use(authMiddleware);

router.get('/', expenseController.getAll);
router.post('/', authorize('fleet_manager', 'driver'), validators.createExpense, handleValidationErrors, expenseController.create);

module.exports = router;
