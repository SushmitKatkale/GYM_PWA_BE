const dotenv = require('dotenv');
const { sequelize } = require('../config/database');

// Load environment variables for testing
dotenv.config({ path: '.env.test' });

// Global test setup
beforeAll(async () => {
  console.log('Setting up test environment...');
  
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Test database connection established');
    
    // Force sync database schema for tests (be careful in production!)
    if (process.env.NODE_ENV === 'test') {
      await sequelize.sync({ force: false }); // Don't force drop tables, just sync
      console.log('Test database schema synchronized');
    }
    
  } catch (error) {
    console.error('Failed to setup test environment:', error);
    process.exit(1);
  }
});

// Global test cleanup
afterAll(async () => {
  console.log('Cleaning up test environment...');
  
  try {
    // Close database connection
    await sequelize.close();
    console.log('Test database connection closed');
  } catch (error) {
    console.error('Error during test cleanup:', error);
  }
});

// Global test configuration
global.testConfig = {
  db: sequelize,
  timeouts: {
    short: 5000,
    medium: 10000,
    long: 30000
  }
};
