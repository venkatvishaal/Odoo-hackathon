const bcrypt = require('bcryptjs');
const { User, Role } = require('../models');
const { signSession, signVerify, signReset, readPurposeToken } = require('../utils/tokens');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');

const MAIL_DOWN = "We couldn't send the email right now. Please try again in a few minutes.";

const authController = {
  register: async (req, res) => {
    try {
      const { name, email, password, role, phone } = req.body;

      // Check existing user
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'A user with this email already exists'
        });
      }

      // Find role
      const roleRecord = await Role.findOne({ where: { name: role } });
      if (!roleRecord) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role specified'
        });
      }

      const user = await User.create({
        name,
        email,
        password_hash: password, // bcrypt hook handles hashing
        role_id: roleRecord.id,
        phone
      });

      try {
        await sendVerificationEmail(user, signVerify(user));
      } catch (mailError) {
        // The account exists either way; the sign-in page offers "resend verification".
        console.error('Verification email failed:', mailError);
      }

      res.status(201).json({
        success: true,
        message: `Account created. We sent a verification link to ${user.email}. Open it, then sign in.`
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed. Please try again.'
      });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({
        where: { email },
        include: [{ model: Role, as: 'role', attributes: ['name'] }]
      });

      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      if (!user.is_active) {
        return res.status(403).json({ success: false, message: 'This account has been deactivated.' });
      }

      if (!user.email_verified) {
        return res.status(403).json({
          success: false,
          code: 'EMAIL_UNVERIFIED',
          message: 'Please verify your email before signing in. Check your inbox for the link.'
        });
      }

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.name
        },
        token: signSession(user, user.role.name)
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed. Please try again.'
      });
    }
  },

  verify: async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password_hash', 'token_version'] },
        include: [{ model: Role, as: 'role', attributes: ['name'] }]
      });

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Verification failed' });
    }
  },

  // Revokes every token issued to this user, not just the one in this browser.
  logout: async (req, res) => {
    try {
      await User.increment('token_version', { where: { id: req.user.id } });
      res.json({ success: true, message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ success: false, message: 'Logout failed. Please try again.' });
    }
  },

  verifyEmail: async (req, res) => {
    const payload = readPurposeToken(req.body.token, 'verify');
    const user = payload && await User.findByPk(payload.id);
    if (!user) {
      return res.status(400).json({ success: false, message: 'This verification link is invalid or has expired. Request a new one from the sign-in page.' });
    }
    if (!user.email_verified) await user.update({ email_verified: true });
    res.json({ success: true, message: 'Email verified. You can sign in now.' });
  },

  resendVerification: async (req, res) => {
    const user = await User.findOne({ where: { email: req.body.email } });
    if (user && !user.email_verified) {
      try {
        await sendVerificationEmail(user, signVerify(user));
      } catch (mailError) {
        console.error('Verification email failed:', mailError);
        return res.status(502).json({ success: false, message: MAIL_DOWN });
      }
    }
    // Same answer whether or not the account exists, so this can't be used to probe emails.
    res.json({ success: true, message: 'If that account needs verifying, a new link is on its way.' });
  },

  forgotPassword: async (req, res) => {
    const user = await User.findOne({ where: { email: req.body.email } });
    if (user && user.is_active) {
      try {
        await sendPasswordResetEmail(user, signReset(user));
      } catch (mailError) {
        console.error('Reset email failed:', mailError);
        return res.status(502).json({ success: false, message: MAIL_DOWN });
      }
    }
    res.json({ success: true, message: 'If an account exists for that email, a reset link is on its way.' });
  },

  resetPassword: async (req, res) => {
    const payload = readPurposeToken(req.body.token, 'reset');
    const user = payload && await User.findByPk(payload.id);
    // token_version changes on every reset/logout, so each link works once.
    if (!user || user.token_version !== payload.tv) {
      return res.status(400).json({ success: false, message: 'This reset link is invalid, expired or already used. Request a new one.' });
    }
    await user.update({
      password_hash: req.body.password, // bcrypt hook handles hashing
      token_version: user.token_version + 1,
      email_verified: true // they just proved they own the inbox
    });
    res.json({ success: true, message: 'Password updated. Sign in with your new password.' });
  },

  deleteAccount: async (req, res) => {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!(await bcrypt.compare(String(req.body.password || ''), user.password_hash))) {
      // 400, not 401: a 401 would make the frontend treat it as an expired session and log out.
      return res.status(400).json({ success: false, message: 'Password is incorrect.' });
    }
    await user.destroy();
    res.json({ success: true, message: 'Your account has been deleted.' });
  }
};

module.exports = authController;
