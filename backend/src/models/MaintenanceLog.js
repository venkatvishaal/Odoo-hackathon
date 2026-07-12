const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MaintenanceLog = sequelize.define('MaintenanceLog', {
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
      isIn: [['preventive', 'corrective']]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  cost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 }
  },
  scheduled_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  completed_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'open',
    validate: {
      isIn: [['open', 'closed']]
    }
  }
}, {
  tableName: 'maintenance_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['vehicle_id'] },
    { fields: ['status'] }
  ]
});

module.exports = MaintenanceLog;
