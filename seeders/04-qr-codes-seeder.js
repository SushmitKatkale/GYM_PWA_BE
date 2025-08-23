const { Gym, GymQRCodes } = require('../models');

/**
 * QR Codes Seeder
 * Creates QR codes for gym check-in system
 */
const seedQRCodes = async () => {
  console.log('📱 Seeding gym QR codes...');

  try {
    // Get all gyms that have QR code check-in enabled
    const gyms = await Gym.findAll({
      where: { 
        activeStatus: true,
        qrCodeCheckinEnabled: true 
      }
    });

    if (gyms.length === 0) {
      console.log('⚠️  No gyms with QR code check-in enabled found.');
      return { success: false, message: 'No gyms with QR enabled' };
    }

    const createdQRCodes = [];

    for (const gym of gyms) {
      console.log(`\n🏋️ Creating QR codes for: ${gym.name}`);

      // Main permanent QR code
      try {
        const [mainQR, mainCreated] = await GymQRCodes.findOrCreate({
          where: { 
            gymId: gym.id,
            qrType: 'permanent',
            locationName: 'Main Entrance'
          },
          defaults: {
            gymId: gym.id,
            qrCode: `GYM_${gym.id}_MAIN_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
            qrType: 'permanent',
            qrName: `${gym.name} - Main QR`,
            qrDescription: `Main check-in QR code for ${gym.name}`,
            locationName: 'Main Entrance',
            isActive: true,
            usageCount: Math.floor(Math.random() * 50), // Simulate some usage
            maxUsageCount: null, // No limit for permanent QRs
            createdBy: 'admin@gym.com'
          }
        });

        createdQRCodes.push(mainQR);
        if (mainCreated) {
          console.log(`  ✅ Created main QR code: ${mainQR.qrCode}`);
        } else {
          console.log(`  ℹ️  Main QR code already exists`);
        }

      } catch (error) {
        console.error(`  ❌ Error creating main QR for ${gym.name}:`, error.message);
      }

      // Secondary entrance QR for larger gyms
      if (gym.capacity >= 100) {
        try {
          const [secondaryQR, secondaryCreated] = await GymQRCodes.findOrCreate({
            where: { 
              gymId: gym.id,
              qrType: 'permanent',
              locationName: 'Secondary Entrance'
            },
            defaults: {
              gymId: gym.id,
              qrCode: `GYM_${gym.id}_SEC_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
              qrType: 'permanent',
              qrName: `${gym.name} - Secondary QR`,
              qrDescription: `Secondary entrance QR code for ${gym.name}`,
              locationName: 'Secondary Entrance',
              isActive: true,
              usageCount: Math.floor(Math.random() * 30),
              maxUsageCount: null,
              createdBy: 'admin@gym.com'
            }
          });

          createdQRCodes.push(secondaryQR);
          if (secondaryCreated) {
            console.log(`  ✅ Created secondary QR code: ${secondaryQR.qrCode}`);
          } else {
            console.log(`  ℹ️  Secondary QR code already exists`);
          }

        } catch (error) {
          console.error(`  ❌ Error creating secondary QR for ${gym.name}:`, error.message);
        }
      }

      // Locker room QR for premium gyms
      if (gym.rating >= 4.5) {
        try {
          const [lockerQR, lockerCreated] = await GymQRCodes.findOrCreate({
            where: { 
              gymId: gym.id,
              qrType: 'permanent',
              locationName: 'Locker Room'
            },
            defaults: {
              gymId: gym.id,
              qrCode: `GYM_${gym.id}_LOCK_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
              qrType: 'permanent',
              qrName: `${gym.name} - Locker Access`,
              qrDescription: `Locker room access QR code for ${gym.name}`,
              locationName: 'Locker Room',
              isActive: true,
              usageCount: Math.floor(Math.random() * 20),
              maxUsageCount: null,
              createdBy: 'admin@gym.com'
            }
          });

          createdQRCodes.push(lockerQR);
          if (lockerCreated) {
            console.log(`  ✅ Created locker room QR code: ${lockerQR.qrCode}`);
          } else {
            console.log(`  ℹ️  Locker room QR code already exists`);
          }

        } catch (error) {
          console.error(`  ❌ Error creating locker QR for ${gym.name}:`, error.message);
        }
      }

      // Daily QR code (for testing temporary QRs)
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      try {
        const dailyCode = `GYM_${gym.id}_DAILY_${today.toISOString().split('T')[0].replace(/-/g, '')}_${Math.random().toString(36).substr(2, 6)}`;
        
        const [dailyQR, dailyCreated] = await GymQRCodes.findOrCreate({
          where: { 
            gymId: gym.id,
            qrType: 'daily',
            qrCode: dailyCode
          },
          defaults: {
            gymId: gym.id,
            qrCode: dailyCode,
            qrType: 'daily',
            qrName: `${gym.name} - Daily QR`,
            qrDescription: `Daily rotating QR code for ${gym.name}`,
            locationName: 'Main Entrance',
            expiresAt: tomorrow,
            isActive: true,
            usageCount: Math.floor(Math.random() * 10),
            maxUsageCount: null,
            createdBy: 'admin@gym.com'
          }
        });

        createdQRCodes.push(dailyQR);
        if (dailyCreated) {
          console.log(`  ✅ Created daily QR code: ${dailyQR.qrCode} (expires: ${tomorrow.toDateString()})`);
        } else {
          console.log(`  ℹ️  Daily QR code already exists`);
        }

      } catch (error) {
        console.error(`  ❌ Error creating daily QR for ${gym.name}:`, error.message);
      }

      // Limited use temporary QR for special events (premium gyms only)
      if (gym.rating >= 4.5) {
        const eventExpiry = new Date();
        eventExpiry.setDate(eventExpiry.getDate() + 7); // Valid for a week

        try {
          const eventCode = `GYM_${gym.id}_EVENT_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
          
          const [eventQR, eventCreated] = await GymQRCodes.findOrCreate({
            where: { 
              gymId: gym.id,
              qrType: 'temporary',
              qrName: `${gym.name} - Event QR`
            },
            defaults: {
              gymId: gym.id,
              qrCode: eventCode,
              qrType: 'temporary',
              qrName: `${gym.name} - Event QR`,
              qrDescription: `Special event QR code with limited uses`,
              locationName: 'Event Area',
              expiresAt: eventExpiry,
              isActive: true,
              usageCount: Math.floor(Math.random() * 5),
              maxUsageCount: 50, // Limited to 50 uses
              createdBy: 'admin@gym.com'
            }
          });

          createdQRCodes.push(eventQR);
          if (eventCreated) {
            console.log(`  ✅ Created event QR code: ${eventQR.qrCode} (max uses: 50, expires: ${eventExpiry.toDateString()})`);
          } else {
            console.log(`  ℹ️  Event QR code already exists`);
          }

        } catch (error) {
          console.error(`  ❌ Error creating event QR for ${gym.name}:`, error.message);
        }
      }
    }

    console.log(`\n📊 QR Codes Summary:`);
    console.log(`   Total gyms processed: ${gyms.length}`);
    console.log(`   Total QR codes created: ${createdQRCodes.length}`);
    console.log(`   QR codes per gym (avg): ${(createdQRCodes.length / gyms.length).toFixed(1)}`);
    
    // Count QR code types
    const qrTypes = {};
    const locations = {};
    createdQRCodes.forEach(qr => {
      qrTypes[qr.qrType] = (qrTypes[qr.qrType] || 0) + 1;
      locations[qr.locationName] = (locations[qr.locationName] || 0) + 1;
    });

    console.log(`   QR code types:`);
    Object.entries(qrTypes).forEach(([type, count]) => {
      console.log(`     - ${type}: ${count} codes`);
    });

    console.log(`   Locations:`);
    Object.entries(locations).forEach(([location, count]) => {
      console.log(`     - ${location}: ${count} codes`);
    });

    return {
      qrCodes: createdQRCodes,
      count: createdQRCodes.length,
      gymCount: gyms.length,
      success: true
    };

  } catch (error) {
    console.error('❌ Error seeding QR codes:', error);
    throw error;
  }
};

/**
 * Standalone execution if run directly
 */
if (require.main === module) {
  const { sequelize } = require('../models');
  
  seedQRCodes()
    .then((result) => {
      console.log('✅ QR codes seeding completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ QR codes seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedQRCodes };
