const { Gym, GymCheckInMethods } = require('../models');

/**
 * Check-in Methods Seeder
 * Creates check-in method configurations for all gyms
 */
const seedCheckInMethods = async () => {
  console.log('⚙️ Seeding gym check-in method configurations...');

  try {
    // Get all gyms
    const gyms = await Gym.findAll({
      where: { activeStatus: true }
    });

    if (gyms.length === 0) {
      console.log('⚠️  No gyms found. Please run gym seeder first.');
      return { success: false, message: 'No gyms found' };
    }

    const createdMethods = [];

    for (const gym of gyms) {
      console.log(`\n🏋️ Creating check-in methods for: ${gym.name}`);

      // Define check-in methods based on gym's enabled features
      const methods = [];

      // Quick Check-in (always enabled)
      if (gym.quickCheckinEnabled) {
        methods.push({
          gymId: gym.id,
          methodType: 'quick_checkin',
          isEnabled: true,
          requiresLocationCheck: gym.locationVerificationRequired,
          maxDistanceMeters: gym.checkInRadiusMeters,
          priorityOrder: 1,
          methodName: 'Quick Check-in',
          methodDescription: 'Simple location-based check-in with one tap',
          createdBy: 'admin@gym.com'
        });
      }

      // QR Code Scan
      if (gym.qrCodeCheckinEnabled) {
        methods.push({
          gymId: gym.id,
          methodType: 'gym_qr_scan',
          isEnabled: true,
          requiresLocationCheck: gym.locationVerificationRequired,
          maxDistanceMeters: gym.checkInRadiusMeters,
          priorityOrder: 2,
          methodName: 'Scan QR Code',
          methodDescription: 'Scan the gym QR code to check in',
          createdBy: 'admin@gym.com'
        });
      }

      // Unique Code Entry
      if (gym.uniqueCodeCheckinEnabled) {
        methods.push({
          gymId: gym.id,
          methodType: 'gym_code',
          isEnabled: true,
          requiresLocationCheck: gym.locationVerificationRequired,
          maxDistanceMeters: gym.checkInRadiusMeters,
          priorityOrder: 3,
          methodName: 'Enter Access Code',
          methodDescription: 'Enter the gym unique access code',
          createdBy: 'admin@gym.com'
        });
      }

      // Owner Scan
      if (gym.ownerScanEnabled) {
        methods.push({
          gymId: gym.id,
          methodType: 'owner_scan_user',
          isEnabled: true,
          requiresLocationCheck: false, // Owner is at the gym
          maxDistanceMeters: gym.checkInRadiusMeters * 2, // Larger radius for staff
          priorityOrder: 4,
          methodName: 'Staff Scan',
          methodDescription: 'Gym staff scans your member QR code',
          createdBy: 'admin@gym.com'
        });
      }

      // Biometric Check-in
      if (gym.biometricCheckinEnabled) {
        methods.push({
          gymId: gym.id,
          methodType: 'fingerprint',
          isEnabled: true,
          requiresLocationCheck: gym.locationVerificationRequired,
          maxDistanceMeters: gym.checkInRadiusMeters,
          priorityOrder: 5,
          methodName: 'Fingerprint Scan',
          methodDescription: 'Use fingerprint to check in securely',
          createdBy: 'admin@gym.com'
        });

        // Add face scan for high-end gyms
        if (gym.rating >= 4.5) {
          methods.push({
            gymId: gym.id,
            methodType: 'face_scan',
            isEnabled: true,
            requiresLocationCheck: gym.locationVerificationRequired,
            maxDistanceMeters: gym.checkInRadiusMeters,
            priorityOrder: 6,
            methodName: 'Face Recognition',
            methodDescription: 'Use facial recognition technology',
            createdBy: 'admin@gym.com'
          });
        }
      }

      // Create each method
      for (const methodData of methods) {
        try {
          const [method, created] = await GymCheckInMethods.findOrCreate({
            where: { 
              gymId: methodData.gymId, 
              methodType: methodData.methodType 
            },
            defaults: methodData
          });

          createdMethods.push(method);

          if (created) {
            console.log(`  ✅ Created method: ${methodData.methodName} (${methodData.methodType})`);
          } else {
            console.log(`  ℹ️  Method already exists: ${methodData.methodName}`);
          }

        } catch (error) {
          console.error(`  ❌ Error creating method ${methodData.methodType} for gym ${gym.name}:`, error.message);
        }
      }
    }

    console.log(`\n📊 Check-in Methods Summary:`);
    console.log(`   Total gyms processed: ${gyms.length}`);
    console.log(`   Total methods created: ${createdMethods.length}`);
    console.log(`   Methods per gym (avg): ${(createdMethods.length / gyms.length).toFixed(1)}`);
    
    // Count method types
    const methodTypes = {};
    createdMethods.forEach(method => {
      methodTypes[method.methodType] = (methodTypes[method.methodType] || 0) + 1;
    });

    console.log(`   Method distribution:`);
    Object.entries(methodTypes).forEach(([type, count]) => {
      console.log(`     - ${type}: ${count} gyms`);
    });

    return {
      methods: createdMethods,
      count: createdMethods.length,
      gymCount: gyms.length,
      success: true
    };

  } catch (error) {
    console.error('❌ Error seeding check-in methods:', error);
    throw error;
  }
};

/**
 * Standalone execution if run directly
 */
if (require.main === module) {
  const { sequelize } = require('../models');
  
  seedCheckInMethods()
    .then((result) => {
      console.log('✅ Check-in methods seeding completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Check-in methods seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedCheckInMethods };
