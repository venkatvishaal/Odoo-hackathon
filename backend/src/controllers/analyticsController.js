const { Vehicle, Driver, Trip, FuelLog, Expense, MaintenanceLog } = require('../models');
const sequelize = require('../config/database');
const { Op } = require('sequelize');

const analyticsController = {
  getDashboard: async (req, res) => {
    try {
      // Vehicle counts
      const vehicleCounts = await Vehicle.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status']
      });

      const vehicleStats = { total: 0, Available: 0, 'On Trip': 0, 'In Shop': 0, Retired: 0 };
      vehicleCounts.forEach(v => {
        const status = v.getDataValue('status');
        const count = parseInt(v.getDataValue('count'));
        vehicleStats[status] = count;
        vehicleStats.total += count;
      });

      // Driver counts
      const driverCounts = await Driver.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status']
      });

      const driverStats = { total: 0, Available: 0, 'On Trip': 0, 'Off Duty': 0, Suspended: 0 };
      driverCounts.forEach(d => {
        const status = d.getDataValue('status');
        const count = parseInt(d.getDataValue('count'));
        driverStats[status] = count;
        driverStats.total += count;
      });

      // Trip counts
      const tripCounts = await Trip.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status']
      });

      const tripStats = { total: 0, Draft: 0, Dispatched: 0, Completed: 0, Cancelled: 0 };
      tripCounts.forEach(t => {
        const status = t.getDataValue('status');
        const count = parseInt(t.getDataValue('count'));
        tripStats[status] = count;
        tripStats.total += count;
      });

      // Fleet utilization %
      const activeFleet = vehicleStats.total - vehicleStats.Retired;
      const utilization = activeFleet > 0 ? Math.round(((vehicleStats['On Trip']) / activeFleet) * 100) : 0;

      // Fuel efficiency (top 5 vehicles by distance/fuel)
      const fuelEfficiency = await Trip.findAll({
        attributes: [
          'vehicle_id',
          [sequelize.fn('SUM', sequelize.col('planned_distance')), 'total_distance'],
          [sequelize.fn('SUM', sequelize.col('fuel_consumed_liters')), 'total_fuel']
        ],
        where: { status: 'Completed', fuel_consumed_liters: { [Op.gt]: 0 } },
        group: ['vehicle_id'],
        include: [{ model: Vehicle, as: 'vehicle', attributes: ['registration_number', 'model_name'] }],
        order: [[sequelize.literal('"total_distance" / NULLIF("total_fuel", 0)'), 'DESC']],
        limit: 10,
        raw: false
      });

      // Operational costs per vehicle
      const opCosts = await sequelize.query(
        `SELECT * FROM vehicle_operational_costs ORDER BY total_operational_cost DESC`,
        { type: sequelize.QueryTypes.SELECT }
      ).catch(() => []);

      // Open maintenance count
      const openMaintenance = await MaintenanceLog.count({ where: { status: 'open' } });

      res.json({
        success: true,
        data: {
          vehicles: vehicleStats,
          drivers: driverStats,
          trips: tripStats,
          utilization,
          openMaintenance,
          fuelEfficiency: fuelEfficiency.map(fe => ({
            vehicle_id: fe.vehicle_id,
            vehicle: fe.vehicle,
            total_distance: parseFloat(fe.getDataValue('total_distance')),
            total_fuel: parseFloat(fe.getDataValue('total_fuel')),
            efficiency: parseFloat(fe.getDataValue('total_fuel')) > 0
              ? (parseFloat(fe.getDataValue('total_distance')) / parseFloat(fe.getDataValue('total_fuel'))).toFixed(2)
              : 0
          })),
          operationalCosts: opCosts
        }
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({ success: false, message: 'Failed to load dashboard data' });
    }
  },

  exportCSV: async (req, res) => {
    try {
      const vehicles = await Vehicle.findAll({ raw: true });
      const { Parser } = require('json2csv');

      const fields = ['registration_number', 'model_name', 'vehicle_type',
                      'max_load_capacity_kg', 'odometer', 'acquisition_cost', 'region', 'status'];
      const parser = new Parser({ fields });
      const csv = parser.parse(vehicles);

      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', 'attachment; filename="transitops_fleet_report.csv"');
      res.send(csv);
    } catch (error) {
      console.error('CSV export error:', error);
      res.status(500).json({ success: false, message: 'Failed to export CSV' });
    }
  }
};

module.exports = analyticsController;
