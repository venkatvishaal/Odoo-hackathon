const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');

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

      const token = jwt.sign(
        { id: user.id, email: user.email, role: roleRecord.name },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: roleRecord.name
        },
        token
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

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role.name },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.name
        },
        token
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
        attributes: { exclude: ['password_hash'] },
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

  logout: (req, res) => {
    res.json({ success: true, message: 'Logout successful' });
  }
};

module.exports = authController;
