const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authController = require('../controllers/authController');
const { validators, handleValidationErrors } = require('../middleware/validation');
const { authMiddleware } = require('../middleware/auth');

// Brute-force guard for everything that checks a password or sends an email.
// shortcut: counters live in process memory, so they reset on deploy and aren't shared across instances; move to a Redis store if you scale past one Render instance.
const limitOptions = {
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please wait 15 minutes and try again.' }
};
// One counter per route, so a normal register → verify → reset journey can't exhaust a shared budget.
const strictLimit = () => rateLimit(limitOptions);
// Only failed sign-ins count, so several people behind one office IP can still log in.
const loginLimit = rateLimit({ ...limitOptions, skipSuccessfulRequests: true });

router.post('/register', strictLimit(), validators.register, handleValidationErrors, authController.register);
router.post('/login', loginLimit, validators.login, handleValidationErrors, authController.login);
router.post('/verify-email', strictLimit(), validators.token, handleValidationErrors, authController.verifyEmail);
router.post('/resend-verification', strictLimit(), validators.emailOnly, handleValidationErrors, authController.resendVerification);
router.post('/forgot-password', strictLimit(), validators.emailOnly, handleValidationErrors, authController.forgotPassword);
router.post('/reset-password', strictLimit(), validators.resetPassword, handleValidationErrors, authController.resetPassword);
router.get('/verify', authMiddleware, authController.verify);
router.post('/logout', authMiddleware, authController.logout);
router.delete('/me', strictLimit(), authMiddleware, authController.deleteAccount);

module.exports = router;
