const bcrypt = require('bcryptjs');
const { User, Role } = require('../models');
const { signSession } = require('../utils/tokens');

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
        phone,
        // shortcut: no email verification until we have a sending domain; re-add a verify step
        // (and default this to false) once we can email any address.
        email_verified: true
      });

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: roleRecord.name
        },
        token: signSession(user, roleRecord.name)
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
