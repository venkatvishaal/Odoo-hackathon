const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validators, handleValidationErrors } = require('../middleware/validation');
const { authMiddleware } = require('../middleware/auth');

router.post('/register', validators.register, handleValidationErrors, authController.register);
router.post('/login', validators.login, handleValidationErrors, authController.login);
router.get('/verify', authMiddleware, authController.verify);
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
