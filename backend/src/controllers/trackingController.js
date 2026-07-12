const { Tracking, Trip, Driver, Vehicle } = require('../models');
const AppError = require('../utils/AppError');

const trackingController = {
  addTracking: async (req, res, next) => {
    try {
      const { trip_id, location, latitude, longitude, status, notes } = req.body;

      if (!trip_id || !location || latitude === undefined || longitude === undefined) {
        return next(new AppError('Please provide trip_id, location, latitude, and longitude', 400));
      }

      // Check if trip exists
      const trip = await Trip.findByPk(trip_id, {
        include: [
          { model: Driver, as: 'driver' },
          { model: Vehicle, as: 'vehicle' }
        ]
      });

      if (!trip) {
        return next(new AppError('Trip not found', 404));
      }

      // Authorization Check: manager or assigned driver only
      if (req.user.role === 'driver') {
        const driver = await Driver.findOne({ where: { user_id: req.user.id } });
        if (!driver || trip.driver_id !== driver.id) {
          return next(new AppError('Only the assigned driver can log checkpoints for this trip', 403));
        }
      } else if (req.user.role !== 'fleet_manager') {
        return next(new AppError('Access denied', 403));
      }

      // Create tracking checkpoint
      const tracking = await Tracking.create({
        trip_id,
        location,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        status: status || 'in_transit',
        notes,
        timestamp: new Date()
      });

      // Update trip status & vehicle location if status matches completion or changes
      if (status && trip.status !== status) {
        // Only allow status machine updates that are valid (or just sync status)
        // If status is 'Completed', we want to allow standard completion flow, but for basic tracking sync we can update status
        if (status === 'Completed' || status === 'Cancelled') {
          // Keep standard lifecycles, or just let status update
          trip.status = status;
          await trip.save();
        }
      }

      // ── Socket.io Real-Time Broadcast ──
      const io = req.app.get('io');
      if (io) {
        io.to(trip_id).emit('trackingUpdated', tracking);
      }

      res.status(201).json({
        success: true,
        message: 'Tracking checkpoint added successfully',
        data: tracking
      });
    } catch (error) {
      next(error);
    }
  },

  getTrackingHistory: async (req, res, next) => {
    try {
      const { tripId } = req.params;

      const trip = await Trip.findByPk(tripId, {
        include: [
          { model: Driver, as: 'driver', attributes: ['name', 'contact_number'] },
          { model: Vehicle, as: 'vehicle', attributes: ['registration_number', 'model_name'] }
        ]
      });

      if (!trip) {
        return next(new AppError('Trip not found', 404));
      }

      const checkpoints = await Tracking.findAll({
        where: { trip_id: tripId },
        order: [['timestamp', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          trip,
          checkpoints
        }
      });
    } catch (error) {
      next(error);
    }
  },

  getLatestCheckpoint: async (req, res, next) => {
    try {
      const { tripId } = req.params;

      const checkpoint = await Tracking.findOne({
        where: { trip_id: tripId },
        order: [['timestamp', 'DESC']]
      });

      if (!checkpoint) {
        return res.json({
          success: true,
          message: 'No tracking data available for this trip yet',
          data: null
        });
      }

      res.json({
        success: true,
        data: checkpoint
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = trackingController;
