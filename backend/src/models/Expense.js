const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Expense = sequelize.define('Expense', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  vehicle_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'vehicles', key: 'id' }
  },
  type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      isIn: [['tolls', 'maintenance', 'other']]
    }
  },
  cost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: { min: 0.01 }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'expenses',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { fields: ['vehicle_id'] },
    { fields: ['type'] },
    { fields: ['date'] }
  ]
});

module.exports = Expense;
