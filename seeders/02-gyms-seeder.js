const { Gym } = require('../models');

/**
 * Default Gyms Seeder
 * Creates test gyms with realistic data and attendance system configurations
 */
const seedGyms = async () => {
  console.log('🏋️ Seeding default gyms...');

  try {
    const testGyms = [
      {
        name: 'PowerFit Gym Downtown',
        capacity: 100,
        address: '123 Main Street, Downtown District, New York, NY 10001',
        latitude: 40.7128,
        longitude: -74.0060,
        description: 'Modern gym with state-of-the-art equipment, personal trainers, and group fitness classes. Located in the heart of downtown with easy access to public transportation.',
        openingTime: '06:00:00',
        closingTime: '23:00:00',
        activeStatus: true,
        ownerId: 'gymowner@gym.com',
        rating: 4.5,
        currentOccupancy: 15,
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        // Attendance system configuration
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
        address: '456 Oak Avenue, Uptown District, New York, NY 10002',
        latitude: 40.7589,
        longitude: -73.9851,
        description: 'Premium fitness center offering personal training, group classes, spa services, and nutrition counseling. Features Olympic-grade equipment and professional athlete training programs.',
        openingTime: '05:00:00',
        closingTime: '24:00:00',
        activeStatus: true,
        ownerId: 'gymowner@gym.com',
        rating: 4.8,
        currentOccupancy: 25,
        city: 'New York',
        state: 'NY',
        zipCode: '10002',
        // Attendance system configuration
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
        address: '789 Pine Street, Suburb District, New York, NY 10003',
        latitude: 40.6892,
        longitude: -74.0445,
        description: '24/7 affordable gym with essential equipment for basic fitness needs. Perfect for budget-conscious fitness enthusiasts. Self-service facility with keycard access.',
        openingTime: '00:00:00',
        closingTime: '23:59:59',
        activeStatus: true,
        ownerId: 'gymowner2@gym.com',
        rating: 4.0,
        currentOccupancy: 8,
        city: 'New York',
        state: 'NY',
        zipCode: '10003',
        // Attendance system configuration
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
      },
      {
        name: 'CrossFit Iron Warriors',
        capacity: 80,
        address: '321 Fitness Boulevard, Sports District, Los Angeles, CA 90210',
        latitude: 34.0522,
        longitude: -118.2437,
        description: 'High-intensity CrossFit gym specializing in functional fitness, Olympic lifting, and competitive training. Features outdoor workout areas and specialized equipment.',
        openingTime: '05:30:00',
        closingTime: '22:30:00',
        activeStatus: true,
        ownerId: 'gymowner2@gym.com',
        rating: 4.7,
        currentOccupancy: 12,
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90210',
        // Attendance system configuration
        checkInRadiusMeters: 60,
        defaultSessionDurationMinutes: 75,
        autoCheckoutEnabled: true,
        autoCheckoutAfterHours: 4,
        locationVerificationRequired: true,
        maxOccupancy: 80,
        allowMultipleCheckins: false,
        checkInNotificationEnabled: true,
        checkOutNotificationEnabled: true,
        attendanceTrackingEnabled: true,
        biometricCheckinEnabled: true,
        ownerScanEnabled: true,
        qrCodeCheckinEnabled: true,
        uniqueCodeCheckinEnabled: false,
        quickCheckinEnabled: true
      },
      {
        name: 'Yoga & Wellness Studio',
        capacity: 40,
        address: '654 Zen Avenue, Peaceful Valley, San Francisco, CA 94102',
        latitude: 37.7749,
        longitude: -122.4194,
        description: 'Tranquil yoga and wellness studio offering various yoga styles, meditation classes, and holistic wellness programs. Features natural lighting and eco-friendly equipment.',
        openingTime: '06:30:00',
        closingTime: '21:30:00',
        activeStatus: true,
        ownerId: 'gymowner@gym.com',
        rating: 4.9,
        currentOccupancy: 6,
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        // Attendance system configuration
        checkInRadiusMeters: 30,
        defaultSessionDurationMinutes: 60,
        autoCheckoutEnabled: false,
        autoCheckoutAfterHours: 3,
        locationVerificationRequired: true,
        maxOccupancy: 40,
        allowMultipleCheckins: true,
        checkInNotificationEnabled: true,
        checkOutNotificationEnabled: false,
        attendanceTrackingEnabled: true,
        biometricCheckinEnabled: false,
        ownerScanEnabled: true,
        qrCodeCheckinEnabled: true,
        uniqueCodeCheckinEnabled: true,
        quickCheckinEnabled: true
      },
      {
        name: 'Muscle Factory Gym',
        capacity: 200,
        address: '987 Strength Street, Industrial Park, Chicago, IL 60601',
        latitude: 41.8781,
        longitude: -87.6298,
        description: 'Hardcore bodybuilding gym with heavy-duty equipment, powerlifting platforms, and dedicated areas for serious lifters. Open to all fitness levels with professional coaching.',
        openingTime: '04:00:00',
        closingTime: '23:59:59',
        activeStatus: true,
        ownerId: 'gymowner2@gym.com',
        rating: 4.6,
        currentOccupancy: 35,
        city: 'Chicago',
        state: 'IL',
        zipCode: '60601',
        // Attendance system configuration
        checkInRadiusMeters: 120,
        defaultSessionDurationMinutes: 150,
        autoCheckoutEnabled: false,
        autoCheckoutAfterHours: 10,
        locationVerificationRequired: true,
        maxOccupancy: 200,
        allowMultipleCheckins: false,
        checkInNotificationEnabled: true,
        checkOutNotificationEnabled: true,
        attendanceTrackingEnabled: true,
        biometricCheckinEnabled: true,
        ownerScanEnabled: true,
        qrCodeCheckinEnabled: true,
        uniqueCodeCheckinEnabled: true,
        quickCheckinEnabled: true
      }
    ];

    const createdGyms = [];

    for (const gymData of testGyms) {
      try {
        const [gym, created] = await Gym.findOrCreate({
          where: { name: gymData.name },
          defaults: {
            ...gymData,
            createTimestamp: new Date(),
            updateTimestamp: new Date(),
            createdBy: gymData.ownerId
          }
        });

        createdGyms.push(gym);

        if (created) {
          console.log(`✅ Created gym: ${gymData.name} (${gymData.city}, ${gymData.state})`);
          console.log(`   Owner: ${gymData.ownerId} | Capacity: ${gymData.capacity} | Rating: ${gymData.rating}`);
        } else {
          console.log(`ℹ️  Gym already exists: ${gymData.name}`);
        }

      } catch (error) {
        console.error(`❌ Error creating gym ${gymData.name}:`, error.message);
      }
    }

    console.log(`\n📊 Gyms Summary:`);
    console.log(`   Total gyms processed: ${testGyms.length}`);
    console.log(`   Total capacity: ${testGyms.reduce((sum, gym) => sum + gym.capacity, 0)}`);
    console.log(`   Average rating: ${(testGyms.reduce((sum, gym) => sum + gym.rating, 0) / testGyms.length).toFixed(1)}`);
    console.log(`   Cities: ${[...new Set(testGyms.map(g => `${g.city}, ${g.state}`))].join(', ')}`);

    return {
      gyms: createdGyms,
      count: createdGyms.length,
      success: true
    };

  } catch (error) {
    console.error('❌ Error seeding gyms:', error);
    throw error;
  }
};

/**
 * Standalone execution if run directly
 */
if (require.main === module) {
  const { sequelize } = require('../models');
  
  seedGyms()
    .then((result) => {
      console.log('✅ Gyms seeding completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Gyms seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedGyms };
