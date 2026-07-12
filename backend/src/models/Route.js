const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Route = sequelize.define('Route', {
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
  source: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  destination: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  intermediate_points: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of stops/cities along the route'
  },
  departure_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  estimated_arrival: {
    type: DataTypes.DATE,
    allowNull: true
  },
  price_per_kg: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'routes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['vehicle_id'] },
    { fields: ['is_active'] }
  ]
});

module.exports = Route;
