const { User } = require('./models');
const bcrypt = require('bcrypt');

/**
 * Test authentication and verify user data
 */
async function testAuth() {
  console.log('🧪 Testing authentication system...\n');

  try {
    // Check if users exist
    console.log('1. Checking users in database...');
    const users = await User.findAll({
      attributes: ['email', 'firstName', 'lastName', 'type', 'isVerified', 'activeStatus'],
      order: ['email']
    });

    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`   - ${user.email} (${user.firstName} ${user.lastName}) - Type: ${user.type}, Active: ${user.activeStatus}, Verified: ${user.isVerified}`);
    });

    if (users.length === 0) {
      console.log('❌ No users found in database!');
      return;
    }

    // Test password verification
    console.log('\n2. Testing password verification...');
    const testUser = await User.findOne({ 
      where: { email: 'testuser@gym.com' }
    });

    if (!testUser) {
      console.log('❌ Test user not found!');
      return;
    }

    console.log(`Found test user: ${testUser.email}`);
    console.log(`Stored password hash: ${testUser.password.substring(0, 20)}...`);

    // Test password comparison
    const isValidPassword = await bcrypt.compare('123456', testUser.password);
    console.log(`Password '123456' is valid: ${isValidPassword}`);

    if (!isValidPassword) {
      console.log('❌ Password verification failed!');
      console.log('This suggests the password was not hashed correctly or the comparison is failing.');
      
      // Try manual verification
      const manualHash = await bcrypt.hash('123456', 10);
      console.log(`Manual hash of '123456': ${manualHash.substring(0, 20)}...`);
      
      const manualTest = await bcrypt.compare('123456', manualHash);
      console.log(`Manual hash test passed: ${manualTest}`);
    } else {
      console.log('✅ Password verification works correctly!');
    }

    // Test User model methods
    console.log('\n3. Testing User model methods...');
    const foundUser = await User.findByEmail('testuser@gym.com');
    console.log(`findByEmail result: ${foundUser ? 'Found' : 'Not found'}`);

    if (foundUser && foundUser.verifyPassword) {
      const modelVerification = await foundUser.verifyPassword('123456');
      console.log(`User.verifyPassword('123456'): ${modelVerification}`);
    }

    // Check database connection
    console.log('\n4. Database connection info...');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Database host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`Database name: ${process.env.DB_NAME || 'gym_pwa_db'}`);

    console.log('\n✅ Authentication system test completed!');

  } catch (error) {
    console.error('❌ Error testing authentication:', error);
  }
}

// Run the test
if (require.main === module) {
  testAuth()
    .then(() => {
      console.log('\n🏁 Test completed.');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testAuth };
