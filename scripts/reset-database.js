const { sequelize } = require('../config/database');

/**
 * Database Reset Script
 * Use this script to reset the database when encountering issues like "too many keys"
 * 
 * Usage: node scripts/reset-database.js
 */

const resetDatabase = async () => {
  try {
    console.log('🔄 Starting database reset...');
    
    // Drop all tables
    await sequelize.drop();
    console.log('✅ All tables dropped successfully.');
    
    // Recreate all tables
    await sequelize.sync({ force: true });
    console.log('✅ All tables recreated successfully.');
    
    console.log('🎉 Database reset completed successfully!');
    
    // Close the connection
    await sequelize.close();
    
  } catch (error) {
    console.error('❌ Error resetting database:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
};

// Run the reset
resetDatabase();
