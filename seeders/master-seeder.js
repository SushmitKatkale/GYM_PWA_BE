const { sequelize } = require('../models');
const { seedUsers } = require('./01-users-seeder');
const { seedGyms } = require('./02-gyms-seeder');
const { seedCheckInMethods } = require('./03-checkin-methods-seeder');
const { seedQRCodes } = require('./04-qr-codes-seeder');
const { seedUniqueCodes } = require('./05-unique-codes-seeder');
const { seedAttendance } = require('./06-attendance-seeder');

/**
 * Master Seeder
 * Runs all seeders in the correct dependency order
 */
const runMasterSeeder = async (options = {}) => {
  const {
    includeAttendance = true,
    forceReseed = false,
    verbose = true
  } = options;

  console.log('🌱 Starting master database seeder...');
  console.log('=====================================\n');

  if (verbose) {
    console.log('📋 Seeding plan:');
    console.log('  1. Users (test accounts for all user types)');
    console.log('  2. Gyms (realistic gym data with locations)');
    console.log('  3. Check-in methods (attendance system configurations)');
    console.log('  4. QR codes (for gym check-in system)');
    console.log('  5. Unique codes (access codes for gyms)');
    if (includeAttendance) {
      console.log('  6. Sample attendance records (for testing analytics)');
    }
    console.log('');
  }

  const results = {
    users: null,
    gyms: null,
    checkInMethods: null,
    qrCodes: null,
    uniqueCodes: null,
    attendance: null,
    success: false,
    errors: []
  };

  try {
    // Ensure database connection
    await sequelize.authenticate();
    console.log('✅ Database connection verified\n');

    // 1. Seed Users
    console.log('STEP 1: Seeding Users');
    console.log('====================');
    try {
      results.users = await seedUsers();
      console.log(`✅ Users seeded: ${results.users.count} users created\n`);
    } catch (error) {
      console.error('❌ Failed to seed users:', error.message);
      results.errors.push({ step: 'users', error: error.message });
      throw error; // Users are required for other steps
    }

    // 2. Seed Gyms
    console.log('STEP 2: Seeding Gyms');
    console.log('===================');
    try {
      results.gyms = await seedGyms();
      console.log(`✅ Gyms seeded: ${results.gyms.count} gyms created\n`);
    } catch (error) {
      console.error('❌ Failed to seed gyms:', error.message);
      results.errors.push({ step: 'gyms', error: error.message });
      throw error; // Gyms are required for other steps
    }

    // 3. Seed Check-in Methods
    console.log('STEP 3: Seeding Check-in Methods');
    console.log('===============================');
    try {
      results.checkInMethods = await seedCheckInMethods();
      console.log(`✅ Check-in methods seeded: ${results.checkInMethods.count} methods created\n`);
    } catch (error) {
      console.error('❌ Failed to seed check-in methods:', error.message);
      results.errors.push({ step: 'checkInMethods', error: error.message });
      // Continue with other steps even if this fails
    }

    // 4. Seed QR Codes
    console.log('STEP 4: Seeding QR Codes');
    console.log('=======================');
    try {
      results.qrCodes = await seedQRCodes();
      console.log(`✅ QR codes seeded: ${results.qrCodes.count} QR codes created\n`);
    } catch (error) {
      console.error('❌ Failed to seed QR codes:', error.message);
      results.errors.push({ step: 'qrCodes', error: error.message });
      // Continue with other steps
    }

    // 5. Seed Unique Codes
    console.log('STEP 5: Seeding Unique Codes');
    console.log('===========================');
    try {
      results.uniqueCodes = await seedUniqueCodes();
      console.log(`✅ Unique codes seeded: ${results.uniqueCodes.count} access codes created\n`);
    } catch (error) {
      console.error('❌ Failed to seed unique codes:', error.message);
      results.errors.push({ step: 'uniqueCodes', error: error.message });
      // Continue with other steps
    }

    // 6. Seed Attendance Records (optional)
    if (includeAttendance) {
      console.log('STEP 6: Seeding Sample Attendance Records');
      console.log('========================================');
      try {
        results.attendance = await seedAttendance();
        console.log(`✅ Attendance records seeded: ${results.attendance.count} records created\n`);
      } catch (error) {
        console.error('❌ Failed to seed attendance records:', error.message);
        results.errors.push({ step: 'attendance', error: error.message });
        // This is optional, so continue
      }
    }

    // Generate final summary
    console.log('🎉 MASTER SEEDING COMPLETED!');
    console.log('============================');
    console.log('');
    console.log('📊 Final Summary:');
    console.log(`   👤 Users: ${results.users?.count || 0} created`);
    console.log(`   🏋️ Gyms: ${results.gyms?.count || 0} created`);
    console.log(`   ⚙️ Check-in methods: ${results.checkInMethods?.count || 0} created`);
    console.log(`   📱 QR codes: ${results.qrCodes?.count || 0} created`);
    console.log(`   🔢 Unique codes: ${results.uniqueCodes?.count || 0} created`);
    if (includeAttendance && results.attendance) {
      console.log(`   📊 Attendance records: ${results.attendance.count} created`);
      console.log(`   🔄 Active sessions: ${results.attendance.activeSessionsCount} users currently checked in`);
    }

    if (results.errors.length > 0) {
      console.log('');
      console.log('⚠️  Some steps had errors:');
      results.errors.forEach(({ step, error }) => {
        console.log(`   - ${step}: ${error}`);
      });
    }

    console.log('');
    console.log('🔐 Default Login Credentials:');
    console.log('   Regular User: testuser@gym.com / 123456');
    console.log('   Additional Users: testuser2@gym.com, testuser3@gym.com / 123456');
    console.log('   Gym Owner: gymowner@gym.com / 123456');
    console.log('   Additional Owner: gymowner2@gym.com / 123456');
    console.log('   Admin: admin@gym.com / 123456');
    console.log('   Super Admin: superadmin@gym.com / 123456');
    console.log('');
    console.log('🚀 Your gym management system is ready for testing!');
    console.log('');
    
    // Show some quick access codes for testing
    if (results.uniqueCodes?.uniqueCodes?.length > 0) {
      console.log('🔑 Quick Access Codes for Testing:');
      const sampleCodes = results.uniqueCodes.uniqueCodes.slice(0, 3);
      sampleCodes.forEach(code => {
        const gym = results.gyms.gyms.find(g => g.id === code.gymId);
        console.log(`   ${code.uniqueCode} - ${gym?.name || `Gym ID ${code.gymId}`} (${code.codeType})`);
      });
      console.log('');
    }

    results.success = true;
    return results;

  } catch (error) {
    console.error('❌ Master seeding failed:', error);
    results.success = false;
    results.errors.push({ step: 'master', error: error.message });
    return results;
  }
};

/**
 * Standalone execution if run directly
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    includeAttendance: !args.includes('--no-attendance'),
    forceReseed: args.includes('--force'),
    verbose: !args.includes('--quiet')
  };

  if (args.includes('--help')) {
    console.log('🌱 Master Database Seeder');
    console.log('========================');
    console.log('');
    console.log('Usage: node master-seeder.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --no-attendance  Skip creating sample attendance records');
    console.log('  --force          Force re-seed even if data exists');
    console.log('  --quiet          Reduce verbose output');
    console.log('  --help           Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node master-seeder.js                    # Full seed with all data');
    console.log('  node master-seeder.js --no-attendance    # Seed without attendance records');
    console.log('  node master-seeder.js --force --quiet    # Force reseed with minimal output');
    process.exit(0);
  }

  runMasterSeeder(options)
    .then((result) => {
      if (result.success) {
        console.log('✅ Master seeding completed successfully!');
        process.exit(0);
      } else {
        console.log('⚠️  Master seeding completed with some errors.');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Master seeding failed completely:', error);
      process.exit(1);
    });
}

module.exports = { runMasterSeeder };
