const sequelize = require('../config/database');

const runMigrations = async () => {
  const transaction = await sequelize.transaction();
  try {
    console.log('Running migrations for Shared Fleet feature...');

    // 1. Create routes table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS routes (
        id UUID PRIMARY KEY,
        vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        source VARCHAR(200) NOT NULL,
        destination VARCHAR(200) NOT NULL,
        intermediate_points JSONB DEFAULT '[]'::jsonb,
        departure_time TIMESTAMPTZ,
        estimated_arrival TIMESTAMPTZ,
        price_per_kg NUMERIC(10,2) NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `, { transaction });

    // 2. Add indexes on routes table
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_routes_vehicle_id ON routes(vehicle_id)
    `, { transaction });
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_routes_active ON routes(is_active)
    `, { transaction });

    // 3. Alter trips table
    await sequelize.query(`
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE
    `, { transaction });
    await sequelize.query(`
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS price_quote NUMERIC(12, 2) DEFAULT 0
    `, { transaction });
    await sequelize.query(`
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES routes(id) ON DELETE SET NULL
    `, { transaction });

    await transaction.commit();
    console.log('Migrations completed successfully.');
    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigrations();
