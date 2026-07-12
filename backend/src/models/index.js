const Role = require('./Role');
const User = require('./User');
const Vehicle = require('./Vehicle');
const Driver = require('./Driver');
const Trip = require('./Trip');
const MaintenanceLog = require('./MaintenanceLog');
const FuelLog = require('./FuelLog');
const Expense = require('./Expense');

// ── User ↔ Role ────────────────────────────────────────
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

// ── Driver ↔ User (optional link) ──────────────────────
User.hasOne(Driver, { foreignKey: 'user_id', as: 'driver_profile' });
Driver.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ── Vehicle → Trips, Maintenance, FuelLogs, Expenses ───
Vehicle.hasMany(Trip, { foreignKey: 'vehicle_id', as: 'trips' });
Vehicle.hasMany(MaintenanceLog, { foreignKey: 'vehicle_id', as: 'maintenance_logs' });
Vehicle.hasMany(FuelLog, { foreignKey: 'vehicle_id', as: 'fuel_logs' });
Vehicle.hasMany(Expense, { foreignKey: 'vehicle_id', as: 'expenses' });

// ── Driver → Trips ─────────────────────────────────────
Driver.hasMany(Trip, { foreignKey: 'driver_id', as: 'trips' });

// ── Trip → Vehicle, Driver ──────────────────────────────
Trip.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
Trip.belongsTo(Driver, { foreignKey: 'driver_id', as: 'driver' });

// ── Trip → FuelLogs ─────────────────────────────────────
Trip.hasMany(FuelLog, { foreignKey: 'trip_id', as: 'fuel_logs' });
FuelLog.belongsTo(Trip, { foreignKey: 'trip_id', as: 'trip' });

// ── FuelLog/Expense → Vehicle ───────────────────────────
FuelLog.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
Expense.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
MaintenanceLog.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });

module.exports = {
  Role,
  User,
  Vehicle,
  Driver,
  Trip,
  MaintenanceLog,
  FuelLog,
  Expense
};
