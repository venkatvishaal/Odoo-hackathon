const sequelize = require('../config/database');
require('../models'); // load all models & associations

const syncDatabase = async (force = false) => {
  try {
    console.log(`Syncing database (force=${force})...`);
    await sequelize.sync({ force });
    console.log('Database synced successfully.');
    if (require.main === module) {
      process.exit(0);
    }
  } catch (error) {
    console.error('Database sync failed:', error);
    if (require.main === module) {
      process.exit(1);
    }
    throw error;
  }
};

if (require.main === module) {
  const force = process.argv.includes('--force');
  syncDatabase(force);
}

module.exports = { syncDatabase };
