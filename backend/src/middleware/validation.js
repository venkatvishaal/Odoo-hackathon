const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

const validators = {
  register: [
    body('name').trim().notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').notEmpty().withMessage('Role is required')
      .isIn(['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'])
      .withMessage('Invalid role'),
    body('phone').optional().matches(/^[0-9]{10,15}$/).withMessage('Invalid phone number')
  ],

  login: [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],

  createVehicle: [
    body('registration_number').trim().notEmpty().withMessage('Registration number is required'),
    body('model_name').trim().notEmpty().withMessage('Model name is required'),
    body('vehicle_type').isIn(['bike', 'van', 'truck', 'mini_truck', 'container_truck'])
      .withMessage('Invalid vehicle type'),
    body('max_load_capacity_kg').isFloat({ min: 0.01 }).withMessage('Load capacity must be positive'),
    body('acquisition_cost').isFloat({ min: 0.01 }).withMessage('Acquisition cost must be positive'),
    body('odometer').optional().isFloat({ min: 0 }).withMessage('Odometer must be non-negative'),
    body('region').optional().trim()
  ],

  createDriver: [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('license_number').trim().notEmpty().withMessage('License number is required'),
    body('license_category').trim().notEmpty().withMessage('License category is required'),
    body('license_expiry_date').isISO8601().withMessage('Valid date required (YYYY-MM-DD)'),
    body('contact_number').notEmpty().withMessage('Contact number is required'),
    body('safety_score').optional().isFloat({ min: 0, max: 10 }).withMessage('Safety score must be 0-10')
  ],

  createTrip: [
    body('source').trim().notEmpty().withMessage('Source is required'),
    body('destination').trim().notEmpty().withMessage('Destination is required'),
    body('vehicle_id').isUUID().withMessage('Valid vehicle ID is required'),
    body('driver_id').isUUID().withMessage('Valid driver ID is required'),
    body('cargo_weight').isFloat({ min: 0.01 }).withMessage('Cargo weight must be positive'),
    body('planned_distance').isFloat({ min: 0.01 }).withMessage('Planned distance must be positive')
  ],

  completeTrip: [
    body('final_odometer').isFloat({ min: 0.01 }).withMessage('Final odometer reading is required'),
    body('fuel_consumed_liters').isFloat({ min: 0.01 }).withMessage('Fuel consumed is required')
  ],

  createMaintenance: [
    body('vehicle_id').isUUID().withMessage('Valid vehicle ID is required'),
    body('type').isIn(['preventive', 'corrective']).withMessage('Type must be preventive or corrective'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('cost').optional().isFloat({ min: 0 }).withMessage('Cost must be non-negative'),
    body('scheduled_date').isISO8601().withMessage('Valid date required')
  ],

  createFuelLog: [
    body('vehicle_id').isUUID().withMessage('Valid vehicle ID is required'),
    body('trip_id').optional({ nullable: true }).isUUID().withMessage('Valid trip ID required'),
    body('liters').isFloat({ min: 0.01 }).withMessage('Liters must be positive'),
    body('cost').isFloat({ min: 0.01 }).withMessage('Cost must be positive'),
    body('date').isISO8601().withMessage('Valid date required')
  ],

  createExpense: [
    body('vehicle_id').isUUID().withMessage('Valid vehicle ID is required'),
    body('type').isIn(['tolls', 'maintenance', 'other']).withMessage('Invalid expense type'),
    body('cost').isFloat({ min: 0.01 }).withMessage('Cost must be positive'),
    body('date').isISO8601().withMessage('Valid date required'),
    body('description').optional().trim()
  ]
};

module.exports = { handleValidationErrors, validators };
