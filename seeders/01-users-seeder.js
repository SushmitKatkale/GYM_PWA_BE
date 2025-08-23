const { User } = require('../models');
const bcrypt = require('bcrypt');

/**
 * Default Users Seeder
 * Creates test users for testing authentication and different user roles
 */
const seedUsers = async () => {
  console.log('👤 Seeding default users...');

  try {
    // Define test users with proper data structure
    const testUsers = [
      {
        email: 'testuser@gym.com',
        id: 'USR00001',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        password: '123456',
        phoneNumber: '+1234567890',
        type: '1', // Regular user
        activeStatus: '1',
        isVerified: true,
        locationSharingEnabled: true,
        biometricEnabled: false,
        autoCheckinEnabled: true,
        checkinNotificationEnabled: true,
        checkoutNotificationEnabled: true,
        locationAccuracyPreference: 'medium',
        preferredCheckinMethod: 'quick_checkin'
      },
      {
        email: 'testuser2@gym.com',
        id: 'USR00002',
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
        password: '123456',
        phoneNumber: '+1234567891',
        type: '1', // Regular user
        activeStatus: '1',
        isVerified: true,
        locationSharingEnabled: true,
        biometricEnabled: true,
        autoCheckinEnabled: false,
        checkinNotificationEnabled: true,
        checkoutNotificationEnabled: true,
        locationAccuracyPreference: 'high',
        preferredCheckinMethod: 'fingerprint'
      },
      {
        email: 'testuser3@gym.com',
        id: 'USR00003',
        firstName: 'Mike',
        lastName: 'Johnson',
        username: 'mikejohnson',
        password: '123456',
        phoneNumber: '+1234567892',
        type: '1', // Regular user
        activeStatus: '1',
        isVerified: true,
        locationSharingEnabled: false,
        biometricEnabled: false,
        autoCheckinEnabled: true,
        checkinNotificationEnabled: false,
        checkoutNotificationEnabled: false,
        locationAccuracyPreference: 'low',
        preferredCheckinMethod: 'gym_qr_scan'
      },
      {
        email: 'gymowner@gym.com',
        id: 'USR00004',
        firstName: 'Sarah',
        lastName: 'Wilson',
        username: 'sarahwilson',
        password: '123456',
        phoneNumber: '+1234567893',
        type: '2', // Gym owner
        activeStatus: '1',
        isVerified: true,
        locationSharingEnabled: true,
        biometricEnabled: false,
        autoCheckinEnabled: false,
        checkinNotificationEnabled: true,
        checkoutNotificationEnabled: true,
        locationAccuracyPreference: 'high',
        preferredCheckinMethod: 'owner_scan_user'
      },
      {
        email: 'gymowner2@gym.com',
        id: 'USR00005',
        firstName: 'David',
        lastName: 'Brown',
        username: 'davidbrown',
        password: '123456',
        phoneNumber: '+1234567894',
        type: '2', // Gym owner
        activeStatus: '1',
        isVerified: true,
        locationSharingEnabled: true,
        biometricEnabled: true,
        autoCheckinEnabled: false,
        checkinNotificationEnabled: true,
        checkoutNotificationEnabled: true,
        locationAccuracyPreference: 'high',
        preferredCheckinMethod: 'gym_qr_scan'
      },
      {
        email: 'admin@gym.com',
        id: 'USR00006',
        firstName: 'Admin',
        lastName: 'User',
        username: 'admin',
        password: '123456',
        phoneNumber: '+1234567895',
        type: '3', // Admin
        activeStatus: '1',
        isVerified: true,
        locationSharingEnabled: true,
        biometricEnabled: true,
        autoCheckinEnabled: false,
        checkinNotificationEnabled: true,
        checkoutNotificationEnabled: true,
        locationAccuracyPreference: 'high',
        preferredCheckinMethod: 'gym_qr_scan'
      },
      {
        email: 'superadmin@gym.com',
        id: 'USR00007',
        firstName: 'Super',
        lastName: 'Admin',
        username: 'superadmin',
        password: '123456',
        phoneNumber: '+1234567896',
        type: '3', // Admin
        activeStatus: '1',
        isVerified: true,
        locationSharingEnabled: true,
        biometricEnabled: true,
        autoCheckinEnabled: false,
        checkinNotificationEnabled: true,
        checkoutNotificationEnabled: true,
        locationAccuracyPreference: 'high',
        preferredCheckinMethod: 'face_scan'
      }
    ];

    const createdUsers = [];

    // Create users with hashed passwords
    for (const userData of testUsers) {
      try {
        // Hash password before creating user
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        // Create user data without password for findOrCreate
        const userCreateData = {
          ...userData,
          password: hashedPassword,
          createTimestamp: new Date(),
          updateTimestamp: new Date()
        };

        const [user, created] = await User.findOrCreate({
          where: { email: userData.email },
          defaults: userCreateData
        });

        createdUsers.push(user);

        if (created) {
          console.log(`✅ Created user: ${userData.email} (${userData.firstName} ${userData.lastName}) - Type: ${userData.type === '1' ? 'User' : userData.type === '2' ? 'Owner' : 'Admin'}`);
        } else {
          console.log(`ℹ️  User already exists: ${userData.email}`);
        }

      } catch (error) {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
      }
    }

    console.log(`\n📊 Users Summary:`);
    console.log(`   Total users processed: ${testUsers.length}`);
    console.log(`   Regular users: ${testUsers.filter(u => u.type === '1').length}`);
    console.log(`   Gym owners: ${testUsers.filter(u => u.type === '2').length}`);
    console.log(`   Admins: ${testUsers.filter(u => u.type === '3').length}`);

    return {
      users: createdUsers,
      count: createdUsers.length,
      success: true
    };

  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
};

/**
 * Standalone execution if run directly
 */
if (require.main === module) {
  const { sequelize } = require('../models');
  
  seedUsers()
    .then((result) => {
      console.log('✅ Users seeding completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Users seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedUsers };
