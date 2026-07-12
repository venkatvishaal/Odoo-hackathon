const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FuelLog = sequelize.define('FuelLog', {
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
  trip_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'trips', key: 'id' }
  },
  liters: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    validate: { min: 0.01 }
  },
  cost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: { min: 0.01 }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  }
}, {
  tableName: 'fuel_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { fields: ['vehicle_id'] },
    { fields: ['trip_id'] },
    { fields: ['date'] }
  ]
});

module.exports = FuelLog;
