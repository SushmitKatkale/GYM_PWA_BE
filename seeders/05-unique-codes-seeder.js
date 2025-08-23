const { Gym, GymUniqueCodes } = require('../models');

/**
 * Unique Codes Seeder
 * Creates unique access codes for gym check-in system
 */
const seedUniqueCodes = async () => {
  console.log('🔢 Seeding gym unique access codes...');

  try {
    // Get all gyms that have unique code check-in enabled
    const gyms = await Gym.findAll({
      where: { 
        activeStatus: true,
        uniqueCodeCheckinEnabled: true 
      }
    });

    if (gyms.length === 0) {
      console.log('⚠️  No gyms with unique code check-in enabled found.');
      return { success: false, message: 'No gyms with unique codes enabled' };
    }

    const createdUniqueCodes = [];

    for (const gym of gyms) {
      console.log(`\n🏋️ Creating unique codes for: ${gym.name}`);

      // Main permanent access code
      try {
        const [mainCode, mainCreated] = await GymUniqueCodes.findOrCreate({
          where: { 
            gymId: gym.id,
            codeType: 'permanent',
            codeName: `${gym.name} - Main Access`
          },
          defaults: {
            gymId: gym.id,
            uniqueCode: await GymUniqueCodes.generateUniqueCodeForGym(gym.id, 6),
            codeType: 'permanent',
            codeName: `${gym.name} - Main Access`,
            codeDescription: `Main access code for ${gym.name}. Share with members for easy check-in.`,
            isActive: true,
            usageCount: Math.floor(Math.random() * 100), // Simulate usage
            maxUsageCount: null, // No limit for permanent codes
            autoRegenerate: false,
            createdBy: 'admin@gym.com'
          }
        });

        createdUniqueCodes.push(mainCode);
        if (mainCreated) {
          console.log(`  ✅ Created main access code: ${mainCode.uniqueCode}`);
        } else {
          console.log(`  ℹ️  Main access code already exists: ${mainCode.uniqueCode}`);
        }

      } catch (error) {
        console.error(`  ❌ Error creating main code for ${gym.name}:`, error.message);
      }

      // Staff/Emergency code for all gyms
      try {
        const [staffCode, staffCreated] = await GymUniqueCodes.findOrCreate({
          where: { 
            gymId: gym.id,
            codeType: 'permanent',
            codeName: `${gym.name} - Staff Code`
          },
          defaults: {
            gymId: gym.id,
            uniqueCode: await GymUniqueCodes.generateUniqueCodeForGym(gym.id, 8), // Longer for staff
            codeType: 'permanent',
            codeName: `${gym.name} - Staff Code`,
            codeDescription: `Staff and emergency access code for ${gym.name}`,
            isActive: true,
            usageCount: Math.floor(Math.random() * 20),
            maxUsageCount: null,
            autoRegenerate: false,
            createdBy: 'admin@gym.com'
          }
        });

        createdUniqueCodes.push(staffCode);
        if (staffCreated) {
          console.log(`  ✅ Created staff code: ${staffCode.uniqueCode}`);
        } else {
          console.log(`  ℹ️  Staff code already exists: ${staffCode.uniqueCode}`);
        }

      } catch (error) {
        console.error(`  ❌ Error creating staff code for ${gym.name}:`, error.message);
      }

      // Daily rotating code (auto-regenerate enabled)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      try {
        const [dailyCode, dailyCreated] = await GymUniqueCodes.findOrCreate({
          where: { 
            gymId: gym.id,
            codeType: 'daily'
          },
          defaults: {
            gymId: gym.id,
            uniqueCode: await GymUniqueCodes.generateUniqueCodeForGym(gym.id, 4), // Shorter daily codes
            codeType: 'daily',
            codeName: `${gym.name} - Daily Code`,
            codeDescription: `Daily rotating access code for ${gym.name}. Changes every day at midnight.`,
            expiresAt: tomorrow,
            isActive: true,
            usageCount: Math.floor(Math.random() * 30),
            maxUsageCount: null,
            autoRegenerate: true,
            createdBy: 'admin@gym.com'
          }
        });

        createdUniqueCodes.push(dailyCode);
        if (dailyCreated) {
          console.log(`  ✅ Created daily code: ${dailyCode.uniqueCode} (expires: ${tomorrow.toDateString()})`);
        } else {
          console.log(`  ℹ️  Daily code already exists: ${dailyCode.uniqueCode}`);
        }

      } catch (error) {
        console.error(`  ❌ Error creating daily code for ${gym.name}:`, error.message);
      }

      // Weekly guest code for premium gyms
      if (gym.rating >= 4.0) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(0, 0, 0, 0);

        try {
          const [weeklyCode, weeklyCreated] = await GymUniqueCodes.findOrCreate({
            where: { 
              gymId: gym.id,
              codeType: 'weekly',
              codeName: `${gym.name} - Guest Code`
            },
            defaults: {
              gymId: gym.id,
              uniqueCode: await GymUniqueCodes.generateUniqueCodeForGym(gym.id, 5),
              codeType: 'weekly',
              codeName: `${gym.name} - Guest Code`,
              codeDescription: `Weekly guest pass code for ${gym.name}. For trial members and visitors.`,
              expiresAt: nextWeek,
              isActive: true,
              usageCount: Math.floor(Math.random() * 15),
              maxUsageCount: 25, // Limited usage for guests
              autoRegenerate: true,
              createdBy: 'admin@gym.com'
            }
          });

          createdUniqueCodes.push(weeklyCode);
          if (weeklyCreated) {
            console.log(`  ✅ Created weekly guest code: ${weeklyCode.uniqueCode} (max uses: 25, expires: ${nextWeek.toDateString()})`);
          } else {
            console.log(`  ℹ️  Weekly guest code already exists: ${weeklyCode.uniqueCode}`);
          }

        } catch (error) {
          console.error(`  ❌ Error creating weekly code for ${gym.name}:`, error.message);
        }
      }

      // Monthly VIP code for high-end gyms
      if (gym.rating >= 4.5) {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setHours(0, 0, 0, 0);

        try {
          const [monthlyCode, monthlyCreated] = await GymUniqueCodes.findOrCreate({
            where: { 
              gymId: gym.id,
              codeType: 'monthly',
              codeName: `${gym.name} - VIP Code`
            },
            defaults: {
              gymId: gym.id,
              uniqueCode: await GymUniqueCodes.generateUniqueCodeForGym(gym.id, 6),
              codeType: 'monthly',
              codeName: `${gym.name} - VIP Code`,
              codeDescription: `Monthly VIP access code for ${gym.name}. Provides premium access privileges.`,
              expiresAt: nextMonth,
              isActive: true,
              usageCount: Math.floor(Math.random() * 10),
              maxUsageCount: 100, // Higher limit for VIP
              autoRegenerate: true,
              createdBy: 'admin@gym.com'
            }
          });

          createdUniqueCodes.push(monthlyCode);
          if (monthlyCreated) {
            console.log(`  ✅ Created monthly VIP code: ${monthlyCode.uniqueCode} (max uses: 100, expires: ${nextMonth.toDateString()})`);
          } else {
            console.log(`  ℹ️  Monthly VIP code already exists: ${monthlyCode.uniqueCode}`);
          }

        } catch (error) {
          console.error(`  ❌ Error creating monthly code for ${gym.name}:`, error.message);
        }
      }

      // Limited trial code for budget gyms
      if (gym.rating < 4.5) {
        const trialExpiry = new Date();
        trialExpiry.setDate(trialExpiry.getDate() + 3); // 3-day trial

        try {
          const [trialCode, trialCreated] = await GymUniqueCodes.findOrCreate({
            where: { 
              gymId: gym.id,
              codeName: `${gym.name} - Trial Code`
            },
            defaults: {
              gymId: gym.id,
              uniqueCode: await GymUniqueCodes.generateUniqueCodeForGym(gym.id, 4),
              codeType: 'temporary',
              codeName: `${gym.name} - Trial Code`,
              codeDescription: `3-day trial access code for ${gym.name}. Limited uses for new members.`,
              expiresAt: trialExpiry,
              isActive: true,
              usageCount: Math.floor(Math.random() * 5),
              maxUsageCount: 10, // Very limited for trials
              autoRegenerate: false,
              createdBy: 'admin@gym.com'
            }
          });

          createdUniqueCodes.push(trialCode);
          if (trialCreated) {
            console.log(`  ✅ Created trial code: ${trialCode.uniqueCode} (max uses: 10, expires: ${trialExpiry.toDateString()})`);
          } else {
            console.log(`  ℹ️  Trial code already exists: ${trialCode.uniqueCode}`);
          }

        } catch (error) {
          console.error(`  ❌ Error creating trial code for ${gym.name}:`, error.message);
        }
      }
    }

    console.log(`\n📊 Unique Codes Summary:`);
    console.log(`   Total gyms processed: ${gyms.length}`);
    console.log(`   Total unique codes created: ${createdUniqueCodes.length}`);
    console.log(`   Codes per gym (avg): ${(createdUniqueCodes.length / gyms.length).toFixed(1)}`);
    
    // Count code types
    const codeTypes = {};
    const autoRegenCount = { true: 0, false: 0 };
    let totalUsage = 0;
    let codesWithLimits = 0;

    createdUniqueCodes.forEach(code => {
      codeTypes[code.codeType] = (codeTypes[code.codeType] || 0) + 1;
      autoRegenCount[code.autoRegenerate] = autoRegenCount[code.autoRegenerate] + 1;
      totalUsage += code.usageCount || 0;
      if (code.maxUsageCount) codesWithLimits++;
    });

    console.log(`   Code types:`);
    Object.entries(codeTypes).forEach(([type, count]) => {
      console.log(`     - ${type}: ${count} codes`);
    });

    console.log(`   Auto-regenerating codes: ${autoRegenCount.true}`);
    console.log(`   Static codes: ${autoRegenCount.false}`);
    console.log(`   Codes with usage limits: ${codesWithLimits}`);
    console.log(`   Total simulated usage: ${totalUsage} check-ins`);

    return {
      uniqueCodes: createdUniqueCodes,
      count: createdUniqueCodes.length,
      gymCount: gyms.length,
      totalUsage: totalUsage,
      success: true
    };

  } catch (error) {
    console.error('❌ Error seeding unique codes:', error);
    throw error;
  }
};

/**
 * Standalone execution if run directly
 */
if (require.main === module) {
  const { sequelize } = require('../models');
  
  seedUniqueCodes()
    .then((result) => {
      console.log('✅ Unique codes seeding completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Unique codes seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedUniqueCodes };
