const sequelize = require('../config/database');

const createView = async () => {
  try {
    await sequelize.query(`
      CREATE OR REPLACE VIEW vehicle_operational_costs AS
      SELECT
          v.id                AS vehicle_id,
          v.model_name,
          v.registration_number,
          v.acquisition_cost,
          COALESCE(fuel_agg.total_fuel_cost, 0)          AS total_fuel_cost,
          COALESCE(maint_agg.total_maintenance_cost, 0)  AS total_maintenance_cost,
          COALESCE(fuel_agg.total_fuel_cost, 0)
            + COALESCE(maint_agg.total_maintenance_cost, 0)
            + COALESCE(exp_agg.total_expense_cost, 0) AS total_operational_cost,
          -- Appended last: CREATE OR REPLACE VIEW can only add columns at the end.
          COALESCE(exp_agg.total_expense_cost, 0)        AS total_expense_cost
      FROM vehicles v
      LEFT JOIN (
          SELECT vehicle_id, SUM(cost) AS total_fuel_cost
          FROM fuel_logs GROUP BY vehicle_id
      ) fuel_agg ON fuel_agg.vehicle_id = v.id
      LEFT JOIN (
          SELECT vehicle_id, SUM(cost) AS total_maintenance_cost
          FROM maintenance_logs WHERE status = 'closed' GROUP BY vehicle_id
      ) maint_agg ON maint_agg.vehicle_id = v.id
      -- Tolls and other running costs. 'maintenance'-type expenses are left out so they
      -- aren't counted twice alongside closed maintenance_logs.
      LEFT JOIN (
          SELECT vehicle_id, SUM(cost) AS total_expense_cost
          FROM expenses WHERE type IN ('tolls', 'other') GROUP BY vehicle_id
      ) exp_agg ON exp_agg.vehicle_id = v.id;
    `);
    console.log('Vehicle operational costs view created successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error creating database view:', err);
    process.exit(1);
  }
};

createView();
