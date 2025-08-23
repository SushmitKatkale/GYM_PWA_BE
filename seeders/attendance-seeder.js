const { sequelize, User, Gym, GymCheckInMethod, GymQRCode, GymUniqueCode } = require('../models');
const bcrypt = require('bcrypt');

/**
 * Database seeder for attendance system
 * Creates default users, gyms, and attendance configurations for testing
 */
async function seedAttendanceData() {
  console.log('🌱 Starting attendance system seeding...');

  try {
    // Ensure all models are synced
    await sequelize.sync({ force: false });

    // Hash passwords
    const defaultPassword = await bcrypt.hash('123456', 10);

    // 1. Create test users
    console.log('👤 Creating test users...');
    
    const testUsers = [
      {
        email: 'testuser@gym.com',
        id: 'USR00001',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        password: defaultPassword,
        phoneNumber: '+1234567890',
        type: '1', // Regular user
        activeStatus: '1',
        isVerified: true,
        createTimestamp: new Date(),
        updateTimestamp: new Date(),
        locationSharingEnabled: true,
        biometricEnabled: false,
        autoCheckinEnabled: true,
        checkinNotificationEnabled: true,
        checkoutNotificationEnabled: true,
        locationAccuracyPreference: 'medium',
        preferredCheckinMethod: 'quick_checkin'
      },
      {
        email: 'gymowner@gym.com',
        id: 'USR00002',
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
        password: defaultPassword,
        phoneNumber: '+1234567891',
        type: '2', // Gym owner
        activeStatus: '1',
        isVerified: true,
        createTimestamp: new Date(),
        updateTimestamp: new Date(),
        locationSharingEnabled: true,
        biometricEnabled: false,
        autoCheckinEnabled: false,
        checkinNotificationEnabled: true,
        checkoutNotificationEnabled: true,
        locationAccuracyPreference: 'high',
        preferredCheckinMethod: 'owner_scan_user'
      },
      {
        email: 'admin@gym.com',
        id: 'USR00003',
        firstName: 'Admin',
        lastName: 'User',
        username: 'admin',
        password: defaultPassword,
        phoneNumber: '+1234567892',
        type: '3', // Admin
        activeStatus: '1',
        isVerified: true,
        createTimestamp: new Date(),
        updateTimestamp: new Date(),
        locationSharingEnabled: true,
        biometricEnabled: true,
        autoCheckinEnabled: false,
        checkinNotificationEnabled: true,
        checkoutNotificationEnabled: true,
        locationAccuracyPreference: 'high',
        preferredCheckinMethod: 'gym_qr_scan'
      }
    ];

    // Create users if they don't exist
    for (const userData of testUsers) {
      const [user, created] = await User.findOrCreate({
        where: { email: userData.email },
        defaults: userData
      });
      
      if (created) {
        console.log(`✅ Created user: ${userData.email}`);
      } else {
        console.log(`ℹ️  User already exists: ${userData.email}`);
      }
    }

    // 2. Create test gyms
    console.log('🏋️ Creating test gyms...');
    
    const testGyms = [
      {
        name: 'PowerFit Gym Downtown',
        capacity: 100,
        address: '123 Main St, Downtown City, State 12345',
        latitude: 40.7128,
        longitude: -74.0060,
        description: 'Modern gym with state-of-the-art equipment and expert trainers.',
        openingTime: '06:00:00',
        closingTime: '23:00:00',
        activeStatus: true,
        createTimestamp: new Date(),
        updateTimestamp: new Date(),
        ownerId: 'gymowner@gym.com',
        rating: 4.5,
        currentOccupancy: 15,
        city: 'Downtown City',
        state: 'State',
        zipCode: '12345',
        checkInRadiusMeters: 100,
        defaultSessionDurationMinutes: 120,
        autoCheckoutEnabled: true,
        autoCheckoutAfterHours: 8,
        locationVerificationRequired: true,
        maxOccupancy: 100,
        allowMultipleCheckins: false,
        checkInNotificationEnabled: true,
        checkOutNotificationEnabled: true,
        attendanceTrackingEnabled: true,
        biometricCheckinEnabled: true,
        ownerScanEnabled: true,
        qrCodeCheckinEnabled: true,
        uniqueCodeCheckinEnabled: true,
        quickCheckinEnabled: true
      },
      {
        name: 'Elite Fitness Center',
        capacity: 150,
        address: '456 Oak Ave, Uptown City, State 12346',
        latitude: 40.7589,
        longitude: -73.9851,
        description: 'Premium fitness center with personal training and group classes.',
        openingTime: '05:00:00',
        closingTime: '24:00:00',
        activeStatus: true,
        createTimestamp: new Date(),
        updateTimestamp: new Date(),
        ownerId: 'gymowner@gym.com',
        rating: 4.8,
        currentOccupancy: 25,
        city: 'Uptown City',
        state: 'State',
        zipCode: '12346',
        checkInRadiusMeters: 75,
        defaultSessionDurationMinutes: 90,
        autoCheckoutEnabled: false,
        autoCheckoutAfterHours: 12,
        locationVerificationRequired: true,
        maxOccupancy: 150,
        allowMultipleCheckins: false,
        checkInNotificationEnabled: true,
        checkOutNotificationEnabled: true,
        attendanceTrackingEnabled: true,
        biometricCheckinEnabled: false,
        ownerScanEnabled: true,
        qrCodeCheckinEnabled: true,
        uniqueCodeCheckinEnabled: true,
        quickCheckinEnabled: true
      },
      {
        name: 'Budget Gym Express',
        capacity: 50,
        address: '789 Pine St, Suburb City, State 12347',
        latitude: 40.6892,
        longitude: -74.0445,
        description: '24/7 affordable gym with essential equipment.',
        openingTime: '00:00:00',
        closingTime: '23:59:59',
        activeStatus: true,
        createTimestamp: new Date(),
        updateTimestamp: new Date(),
        ownerId: 'gymowner@gym.com',
        rating: 4.0,
        currentOccupancy: 8,
        city: 'Suburb City',
        state: 'State',
        zipCode: '12347',
        checkInRadiusMeters: 50,
        defaultSessionDurationMinutes: 60,
        autoCheckoutEnabled: true,
        autoCheckoutAfterHours: 6,
        locationVerificationRequired: false,
        maxOccupancy: 50,
        allowMultipleCheckins: true,
        checkInNotificationEnabled: false,
        checkOutNotificationEnabled: false,
        attendanceTrackingEnabled: true,
        biometricCheckinEnabled: false,
        ownerScanEnabled: false,
        qrCodeCheckinEnabled: true,
        uniqueCodeCheckinEnabled: true,
        quickCheckinEnabled: true
      }
    ];

    const createdGyms = [];
    for (const gymData of testGyms) {
      const [gym, created] = await Gym.findOrCreate({
        where: { name: gymData.name },
        defaults: gymData
      });
      
      createdGyms.push(gym);
      
      if (created) {
        console.log(`✅ Created gym: ${gymData.name}`);
      } else {
        console.log(`ℹ️  Gym already exists: ${gymData.name}`);
      }
    }

    // 3. Create check-in method configurations for each gym
    console.log('⚙️ Creating check-in method configurations...');
    
    for (const gym of createdGyms) {
      const [config, created] = await GymCheckInMethod.findOrCreate({
        where: { gymId: gym.id },
        defaults: {
          gymId: gym.id,
          quickCheckinEnabled: gym.quickCheckinEnabled,
          qrCodeCheckinEnabled: gym.qrCodeCheckinEnabled,
          uniqueCodeCheckinEnabled: gym.uniqueCodeCheckinEnabled,
          biometricCheckinEnabled: gym.biometricCheckinEnabled,
          ownerScanEnabled: gym.ownerScanEnabled,
          locationVerificationRequired: gym.locationVerificationRequired,
          checkInRadiusMeters: gym.checkInRadiusMeters,
          autoCheckoutEnabled: gym.autoCheckoutEnabled,
          autoCheckoutAfterHours: gym.autoCheckoutAfterHours,
          allowMultipleCheckins: gym.allowMultipleCheckins,
          createTimestamp: new Date(),
          updateTimestamp: new Date()
        }
      });
      
      if (created) {
        console.log(`✅ Created check-in config for: ${gym.name}`);
      } else {
        console.log(`ℹ️  Check-in config already exists for: ${gym.name}`);
      }
    }

    // 4. Create QR codes for each gym
    console.log('📱 Creating gym QR codes...');
    
    for (const gym of createdGyms) {
      if (gym.qrCodeCheckinEnabled) {
        const qrCodeData = `GYM-${gym.id}-QR-${Date.now()}`;
        
        const [qrCode, created] = await GymQRCode.findOrCreate({
          where: { gymId: gym.id },
          defaults: {
            gymId: gym.id,
            qrCode: qrCodeData,
            isActive: true,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
            description: `QR Code for ${gym.name}`,
            createTimestamp: new Date(),
            updateTimestamp: new Date(),
            createdBy: 'gymowner@gym.com'
          }
        });
        
        if (created) {
          console.log(`✅ Created QR code for: ${gym.name} (${qrCodeData})`);
        } else {
          console.log(`ℹ️  QR code already exists for: ${gym.name}`);
        }
      }
    }

    // 5. Create unique codes for each gym
    console.log('🔢 Creating gym unique codes...');
    
    for (const gym of createdGyms) {
      if (gym.uniqueCodeCheckinEnabled) {
        const uniqueCode = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code
        
        const [code, created] = await GymUniqueCode.findOrCreate({
          where: { gymId: gym.id },
          defaults: {
            gymId: gym.id,
            uniqueCode: uniqueCode,
            isActive: true,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            description: `Access code for ${gym.name}`,
            maxUsage: null, // Unlimited usage
            currentUsage: 0,
            createTimestamp: new Date(),
            updateTimestamp: new Date(),
            createdBy: 'gymowner@gym.com'
          }
        });
        
        if (created) {
          console.log(`✅ Created unique code for: ${gym.name} (Code: ${uniqueCode})`);
        } else {
          console.log(`ℹ️  Unique code already exists for: ${gym.name}`);
        }
      }
    }

    console.log('🎉 Attendance system seeding completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   👤 Users: ${testUsers.length} test users created`);
    console.log(`   🏋️ Gyms: ${testGyms.length} test gyms created`);
    console.log(`   ⚙️ Check-in configs: ${createdGyms.length} configurations created`);
    console.log(`   📱 QR codes: Generated for enabled gyms`);
    console.log(`   🔢 Unique codes: Generated for enabled gyms`);
    console.log('');
    console.log('🔐 Default login credentials:');
    console.log('   User: testuser@gym.com / 123456');
    console.log('   Owner: gymowner@gym.com / 123456');
    console.log('   Admin: admin@gym.com / 123456');
    
    return {
      users: testUsers.length,
      gyms: createdGyms.length,
      success: true
    };

  } catch (error) {
    console.error('❌ Error seeding attendance data:', error);
    throw error;
  }
}

/**
 * Standalone execution if run directly
 */
if (require.main === module) {
  seedAttendanceData()
    .then((result) => {
      console.log('✅ Seeding completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedAttendanceData };
