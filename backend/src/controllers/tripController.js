const { Trip, Vehicle, Driver, FuelLog } = require('../models');
const sequelize = require('../config/database');

const tripController = {
  getAll: async (req, res) => {
    try {
      const { status } = req.query;
      const where = {};
      if (status) where.status = status;

      const trips = await Trip.findAll({
        where,
        include: [
          { model: Vehicle, as: 'vehicle', attributes: ['id', 'registration_number', 'model_name', 'max_load_capacity_kg', 'status'] },
          { model: Driver, as: 'driver', attributes: ['id', 'name', 'license_number', 'status'] }
        ],
        order: [['created_at', 'DESC']]
      });
      res.json({ success: true, data: trips });
    } catch (error) {
      console.error('Get trips error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch trips' });
    }
  },

  create: async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { source, destination, vehicle_id, driver_id, cargo_weight, planned_distance } = req.body;

      // ① Fetch and validate vehicle
      const vehicle = await Vehicle.findByPk(vehicle_id, { transaction: t, lock: true });
      if (!vehicle) {
        await t.rollback();
        return res.status(404).json({ success: false, message: 'Vehicle not found' });
      }
      if (vehicle.status !== 'Available') {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `Vehicle is currently "${vehicle.status}" and cannot be assigned to a trip`
        });
      }

      // ② Validate cargo capacity
      if (parseFloat(cargo_weight) > parseFloat(vehicle.max_load_capacity_kg)) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `Cargo weight (${cargo_weight}kg) exceeds vehicle capacity (${vehicle.max_load_capacity_kg}kg)`,
          errors: [{ field: 'cargo_weight', message: `Maximum capacity is ${vehicle.max_load_capacity_kg}kg` }]
        });
      }

      // ③ Fetch and validate driver
      const driver = await Driver.findByPk(driver_id, { transaction: t, lock: true });
      if (!driver) {
        await t.rollback();
        return res.status(404).json({ success: false, message: 'Driver not found' });
      }
      if (driver.status === 'Suspended') {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'Driver is suspended and cannot be assigned to trips'
        });
      }
      if (driver.status !== 'Available') {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `Driver is currently "${driver.status}" and cannot be assigned`
        });
      }

      // ④ Check license expiry
      const today = new Date().toISOString().split('T')[0];
      if (driver.license_expiry_date < today) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `Driver's license expired on ${driver.license_expiry_date}. Cannot assign to trip.`
        });
      }

      // ⑤ Create trip with status Draft
      const trip = await Trip.create({
        source, destination, vehicle_id, driver_id,
        cargo_weight, planned_distance, status: 'Draft'
      }, { transaction: t });

      await t.commit();

      // Fetch full trip with associations for response
      const fullTrip = await Trip.findByPk(trip.id, {
        include: [
          { model: Vehicle, as: 'vehicle', attributes: ['id', 'registration_number', 'model_name'] },
          { model: Driver, as: 'driver', attributes: ['id', 'name'] }
        ]
      });

      res.status(201).json({ success: true, message: 'Trip created as Draft', data: fullTrip });
    } catch (error) {
      await t.rollback();
      console.error('Create trip error:', error);
      res.status(500).json({ success: false, message: 'Failed to create trip' });
    }
  },

  dispatch: async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const trip = await Trip.findByPk(req.params.id, { transaction: t, lock: true });
      if (!trip) { await t.rollback(); return res.status(404).json({ success: false, message: 'Trip not found' }); }
      if (trip.status !== 'Draft') {
        await t.rollback();
        return res.status(400).json({ success: false, message: `Cannot dispatch a trip with status "${trip.status}". Only Draft trips can be dispatched.` });
      }

      // Re-validate vehicle and driver (race-condition safe)
      const vehicle = await Vehicle.findByPk(trip.vehicle_id, { transaction: t, lock: true });
      const driver = await Driver.findByPk(trip.driver_id, { transaction: t, lock: true });

      if (vehicle.status !== 'Available') {
        await t.rollback();
        return res.status(400).json({ success: false, message: `Vehicle is now "${vehicle.status}" and cannot be dispatched` });
      }
      if (driver.status !== 'Available') {
        await t.rollback();
        return res.status(400).json({ success: false, message: `Driver is now "${driver.status}" and cannot be dispatched` });
      }

      // Atomic state transition
      await trip.update({ status: 'Dispatched', dispatched_at: new Date() }, { transaction: t });
      await vehicle.update({ status: 'On Trip' }, { transaction: t });
      await driver.update({ status: 'On Trip' }, { transaction: t });

      await t.commit();

      // Emit Socket.io event
      const io = req.app.get('io');
      if (io) io.emit('fleet:update', { event: 'trip_dispatched', tripId: trip.id });

      res.json({ success: true, message: 'Trip dispatched. Vehicle and driver are now On Trip.', data: trip });
    } catch (error) {
      await t.rollback();
      console.error('Dispatch trip error:', error);
      res.status(500).json({ success: false, message: 'Failed to dispatch trip' });
    }
  },

  complete: async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { final_odometer, fuel_consumed_liters } = req.body;
      const trip = await Trip.findByPk(req.params.id, { transaction: t, lock: true });
      if (!trip) { await t.rollback(); return res.status(404).json({ success: false, message: 'Trip not found' }); }
      if (trip.status !== 'Dispatched') {
        await t.rollback();
        return res.status(400).json({ success: false, message: `Cannot complete a trip with status "${trip.status}". Only Dispatched trips can be completed.` });
      }

      const vehicle = await Vehicle.findByPk(trip.vehicle_id, { transaction: t, lock: true });
      const driver = await Driver.findByPk(trip.driver_id, { transaction: t, lock: true });

      // Update trip
      await trip.update({
        status: 'Completed', completed_at: new Date(),
        final_odometer, fuel_consumed_liters
      }, { transaction: t });

      // Update vehicle odometer and restore status
      await vehicle.update({ odometer: final_odometer, status: 'Available' }, { transaction: t });
      await driver.update({ status: 'Available' }, { transaction: t });

      // Auto-create fuel log entry
      await FuelLog.create({
        vehicle_id: trip.vehicle_id,
        trip_id: trip.id,
        liters: fuel_consumed_liters,
        cost: parseFloat(fuel_consumed_liters) * 100, // placeholder rate
        date: new Date().toISOString().split('T')[0]
      }, { transaction: t });

      await t.commit();

      const io = req.app.get('io');
      if (io) io.emit('fleet:update', { event: 'trip_completed', tripId: trip.id });

      res.json({ success: true, message: 'Trip completed. Vehicle odometer updated. Driver and vehicle restored to Available.', data: trip });
    } catch (error) {
      await t.rollback();
      console.error('Complete trip error:', error);
      res.status(500).json({ success: false, message: 'Failed to complete trip' });
    }
  },

  cancel: async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const trip = await Trip.findByPk(req.params.id, { transaction: t, lock: true });
      if (!trip) { await t.rollback(); return res.status(404).json({ success: false, message: 'Trip not found' }); }
      if (!['Draft', 'Dispatched'].includes(trip.status)) {
        await t.rollback();
        return res.status(400).json({ success: false, message: `Cannot cancel a trip with status "${trip.status}"` });
      }

      const wasDispatched = trip.status === 'Dispatched';
      await trip.update({ status: 'Cancelled' }, { transaction: t });

      // Only restore if was Dispatched (vehicle/driver were locked)
      if (wasDispatched) {
        const vehicle = await Vehicle.findByPk(trip.vehicle_id, { transaction: t });
        const driver = await Driver.findByPk(trip.driver_id, { transaction: t });
        if (vehicle) await vehicle.update({ status: 'Available' }, { transaction: t });
        if (driver) await driver.update({ status: 'Available' }, { transaction: t });
      }

      await t.commit();

      const io = req.app.get('io');
      if (io) io.emit('fleet:update', { event: 'trip_cancelled', tripId: trip.id });

      res.json({ success: true, message: 'Trip cancelled.', data: trip });
    } catch (error) {
      await t.rollback();
      console.error('Cancel trip error:', error);
      res.status(500).json({ success: false, message: 'Failed to cancel trip' });
    }
  }
};

module.exports = tripController;
