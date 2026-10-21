const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authController = require('../controllers/authController');
const { validators, handleValidationErrors } = require('../middleware/validation');
const { authMiddleware } = require('../middleware/auth');

// Abuse guards, 10 per IP per 15 min, one counter per route.
// shortcut: counters live in process memory, so they reset on deploy and aren't shared across instances; move to a Redis store if you scale past one Render instance.
const limitOptions = {
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please wait 15 minutes and try again.' }
};
// Password checks: only failures count (brute force), so people sharing an office IP can still sign in.
const passwordLimit = () => rateLimit({ ...limitOptions, skipSuccessfulRequests: true });
// Sign-up: only created accounts count (spam), so typos in the form never lock anyone out.
const signupLimit = rateLimit({ ...limitOptions, skipFailedRequests: true });

router.post('/register', signupLimit, validators.register, handleValidationErrors, authController.register);
router.post('/login', passwordLimit(), validators.login, handleValidationErrors, authController.login);
router.get('/verify', authMiddleware, authController.verify);
router.post('/logout', authMiddleware, authController.logout);
router.delete('/me', passwordLimit(), authMiddleware, authController.deleteAccount);

module.exports = router;
