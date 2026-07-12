const { Driver } = require('../models');
const { Op } = require('sequelize');

const driverController = {
  getAll: async (req, res) => {
    try {
      const { status } = req.query;
      const where = {};
      if (status) where.status = status;

      const drivers = await Driver.findAll({ where, order: [['name', 'ASC']] });
      res.json({ success: true, data: drivers });
    } catch (error) {
      console.error('Get drivers error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch drivers' });
    }
  },

  getById: async (req, res) => {
    try {
      const driver = await Driver.findByPk(req.params.id);
      if (!driver) {
        return res.status(404).json({ success: false, message: 'Driver not found' });
      }
      res.json({ success: true, data: driver });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch driver' });
    }
  },

  create: async (req, res) => {
    try {
      const { name, license_number, license_category,
              license_expiry_date, contact_number, safety_score } = req.body;

      const existing = await Driver.findOne({ where: { license_number } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'A driver with this license number already exists'
        });
      }

      const driver = await Driver.create({
        name, license_number, license_category,
        license_expiry_date, contact_number,
        safety_score: safety_score || 5.0,
        status: 'Available'
      });

      res.status(201).json({ success: true, message: 'Driver added successfully', data: driver });
    } catch (error) {
      console.error('Create driver error:', error);
      res.status(500).json({ success: false, message: 'Failed to add driver' });
    }
  },

  update: async (req, res) => {
    try {
      const driver = await Driver.findByPk(req.params.id);
      if (!driver) {
        return res.status(404).json({ success: false, message: 'Driver not found' });
      }

      const allowedFields = ['name', 'license_number', 'license_category',
                             'license_expiry_date', 'contact_number', 'safety_score', 'status'];
      const updateData = {};
      allowedFields.forEach(f => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });

      await driver.update(updateData);
      res.json({ success: true, message: 'Driver updated', data: driver });
    } catch (error) {
      console.error('Update driver error:', error);
      res.status(500).json({ success: false, message: 'Failed to update driver' });
    }
  },

  delete: async (req, res) => {
    try {
      const driver = await Driver.findByPk(req.params.id);
      if (!driver) {
        return res.status(404).json({ success: false, message: 'Driver not found' });
      }
      await driver.destroy();
      res.json({ success: true, message: 'Driver removed' });
    } catch (error) {
      if (error.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete driver with trip history. Mark as Suspended instead.'
        });
      }
      res.status(500).json({ success: false, message: 'Failed to delete driver' });
    }
  },

  getEligibleForDispatch: async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const drivers = await Driver.findAll({
        where: {
          status: 'Available',
          license_expiry_date: { [Op.gte]: today }
        },
        order: [['name', 'ASC']]
      });
      res.json({ success: true, data: drivers });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch eligible drivers' });
    }
  }
};

module.exports = driverController;
