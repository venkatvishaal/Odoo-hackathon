const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Tracking = sequelize.define('Tracking', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  trip_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'trips',
      key: 'id'
    }
  },
  location: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  latitude: {
    type: DataTypes.DECIMAL(9, 6),
    allowNull: false
  },
  longitude: {
    type: DataTypes.DECIMAL(9, 6),
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'in_transit'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'tracking',
  timestamps: false,
  indexes: [
    { fields: ['trip_id'] },
    { fields: ['timestamp'] }
  ]
});

module.exports = Tracking;
