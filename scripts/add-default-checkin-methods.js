const { sequelize } = require('../config/database');
const { Gym, GymCheckInMethods } = require('../models');

async function checkAndAddDefaultCheckInMethods() {
  try {
    console.log('🔍 Checking gym check-in methods...');

    // Get all gyms
    const gyms = await Gym.findAll({
      attributes: ['id', 'name', 'ownerId'],
      where: {
        activeStatus: true
      }
    });

    console.log(`📊 Found ${gyms.length} active gyms`);

    // Check which gyms already have check-in methods
    const existingMethods = await GymCheckInMethods.findAll({
          });

    const gymsWithMethods = new Set(existingMethods.map(method => method.gymId));
    console.log(`✅ ${gymsWithMethods.size} gyms already have check-in methods configured`);

    // Find gyms without check-in methods
    const gymsNeedingMethods = gyms.filter(gym => !gymsWithMethods.has(gym.id));
    console.log(`⚠️  ${gymsNeedingMethods.length} gyms need default check-in methods`);

    if (gymsNeedingMethods.length === 0) {
      console.log('✅ All gyms already have check-in methods configured');
      return;
    }

    // Create default check-in methods for gyms that don't have them
    const defaultCheckInMethods = [];

    for (const gym of gymsNeedingMethods) {
      console.log(`🏢 Adding default check-in methods for: ${gym.name}`);
      
      defaultCheckInMethods.push({
        gymId: gym.id,
        quickCheckInEnabled: true,
        qrCodeCheckInEnabled: true,
        uniqueCodeCheckInEnabled: true,
        ownerScanEnabled: true,
        biometricCheckInEnabled: false,
        checkInRadius: 100, // 100 meters default
        locationValidationRequired: true,
        autoCheckoutEnabled: false,
        autoCheckoutAfterMinutes: 480, // 8 hours
        maxSessionDurationMinutes: 240, // 4 hours
        allowMultipleActiveSessionsPerUser: false,
        qrCodeLocationRequired: false,
        uniqueCodeLocationRequired: true,
        requireCheckoutForNewCheckin: true,
        sendCheckInNotifications: true,
        sendCheckOutNotifications: true,
        allowGracePeriodMinutes: 15,
        trackSessionDuration: true,
        requireSessionRating: false,
        isActive: true,
        createdBy: gym.ownerId || 'system',
        updatedBy: gym.ownerId || 'system',
        createTimestamp: new Date(),
        updateTimestamp: new Date()
      });
    }

    // Bulk create default check-in methods
    if (defaultCheckInMethods.length > 0) {
      await GymCheckInMethods.bulkCreate(defaultCheckInMethods);
      console.log(`✅ Successfully created default check-in methods for ${defaultCheckInMethods.length} gyms`);
    }

    // Verify the results
    const totalMethodsAfter = await GymCheckInMethods.count();
    console.log(`📈 Total gym check-in methods in database: ${totalMethodsAfter}`);

    console.log('\n🎉 Default check-in methods setup completed successfully!');
    console.log('\nDefault settings applied:');
    console.log('✅ Quick check-in: Enabled');
    console.log('✅ QR code check-in: Enabled');
    console.log('✅ Unique code check-in: Enabled');
    console.log('✅ Owner scan: Enabled');
    console.log('❌ Biometric check-in: Disabled');
    console.log('📍 Check-in radius: 100 meters');
    console.log('🔒 Location validation: Required');
    console.log('⏰ Auto-checkout: Disabled (can be enabled per gym)');
    console.log('🕐 Max session duration: 4 hours');

  } catch (error) {
    console.error('❌ Error setting up default check-in methods:', error);
    throw error;
  }
}

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    await checkAndAddDefaultCheckInMethods();
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('📊 Database connection closed');
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { checkAndAddDefaultCheckInMethods };
