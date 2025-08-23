const { User, Gym, Attendance, GymQRCodes, GymUniqueCodes } = require('../models');

/**
 * Sample Attendance Records Seeder
 * Creates realistic attendance records for testing analytics and system functionality
 */
const seedAttendance = async () => {
  console.log('📊 Seeding sample attendance records...');

  try {
    // Get all users, gyms, QR codes, and unique codes
    const users = await User.findAll({ where: { type: '1', activeStatus: '1' } }); // Regular users only
    const gyms = await Gym.findAll({ where: { activeStatus: true } });
    const qrCodes = await GymQRCodes.findAll({ where: { isActive: true } });
    const uniqueCodes = await GymUniqueCodes.findAll({ where: { isActive: true } });

    if (users.length === 0 || gyms.length === 0) {
      console.log('⚠️  No users or gyms found. Please run user and gym seeders first.');
      return { success: false, message: 'No users or gyms found' };
    }

    console.log(`Found ${users.length} users and ${gyms.length} gyms for attendance simulation`);

    const createdAttendances = [];
    const checkInMethods = ['quick_checkin', 'gym_qr_scan', 'gym_code', 'owner_scan_user', 'fingerprint'];
    
    // Helper function to get random element from array
    const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
    
    // Helper function to generate random date within last N days
    const getRandomDateWithinDays = (days) => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
      return new Date(pastDate.getTime() + Math.random() * (now.getTime() - pastDate.getTime()));
    };

    // Helper function to simulate realistic workout durations
    const getWorkoutDuration = (method) => {
      const baseDurations = {
        'quick_checkin': [60, 90, 120], // 1-2 hours typical
        'gym_qr_scan': [45, 75, 105, 135], // Mix of durations
        'gym_code': [30, 60, 90, 120, 150], // Various
        'owner_scan_user': [90, 120, 150], // Longer (personal training)
        'fingerprint': [60, 90, 120, 180] // Mix
      };
      
      const durations = baseDurations[method] || [60, 90, 120];
      return getRandomElement(durations) + Math.floor(Math.random() * 30) - 15; // ±15 min variance
    };

    // Create attendance records for the last 30 days
    const totalRecords = 200; // Adjust as needed
    let successfulCreations = 0;

    for (let i = 0; i < totalRecords; i++) {
      try {
        const user = getRandomElement(users);
        const gym = getRandomElement(gyms);
        const method = getRandomElement(checkInMethods);
        
        // Generate check-in time (last 30 days, weighted towards recent days)
        const daysBack = Math.floor(Math.random() * 30) + 1;
        const checkInTime = getRandomDateWithinDays(daysBack);
        
        // Ensure check-in time is during gym hours
        const gymOpenHour = parseInt(gym.openingTime.split(':')[0]);
        const gymCloseHour = parseInt(gym.closingTime.split(':')[0]);
        const checkInHour = gymOpenHour + Math.floor(Math.random() * (gymCloseHour - gymOpenHour - 1));
        const checkInMinute = Math.floor(Math.random() * 60);
        
        checkInTime.setHours(checkInHour, checkInMinute, 0, 0);
        
        // Calculate checkout time (80% of records have checkout)
        let checkOutTime = null;
        let durationMinutes = 0;
        
        if (Math.random() < 0.8) { // 80% have checkout
          durationMinutes = getWorkoutDuration(method);
          checkOutTime = new Date(checkInTime.getTime() + (durationMinutes * 60 * 1000));
          
          // Ensure checkout is before gym closes
          const maxCheckout = new Date(checkInTime);
          maxCheckout.setHours(gymCloseHour, 0, 0, 0);
          if (checkOutTime > maxCheckout) {
            checkOutTime = maxCheckout;
            durationMinutes = Math.floor((checkOutTime - checkInTime) / (1000 * 60));
          }
        }

        // Generate location data (simulate being near gym)
        const userLat = gym.latitude + (Math.random() - 0.5) * 0.002; // ±~100m variance
        const userLng = gym.longitude + (Math.random() - 0.5) * 0.002;
        const distance = Math.floor(Math.random() * gym.checkInRadiusMeters * 0.8); // Within radius

        // Select QR code or unique code if applicable
        let qrCodeUsed = null;
        if (method === 'gym_qr_scan' && qrCodes.length > 0) {
          const gymQRs = qrCodes.filter(qr => qr.gymId === gym.id);
          if (gymQRs.length > 0) {
            qrCodeUsed = getRandomElement(gymQRs).qrCode;
          }
        }

        // Generate session notes and ratings occasionally
        let sessionNotes = null;
        let sessionRating = null;
        
        if (Math.random() < 0.3) { // 30% have notes
          const notes = [
            'Great workout session!',
            'Busy gym today',
            'New equipment was excellent',
            'Good personal training session',
            'Cardio and weights',
            'Group class was fun',
            'Quick workout between meetings',
            'Morning routine complete'
          ];
          sessionNotes = getRandomElement(notes);
        }
        
        if (Math.random() < 0.4 && checkOutTime) { // 40% of completed sessions have ratings
          sessionRating = Math.floor(Math.random() * 5) + 1; // 1-5 stars
        }

        // Generate device info occasionally
        let deviceInfo = null;
        if (Math.random() < 0.6) { // 60% have device info
          deviceInfo = {
            platform: getRandomElement(['iOS', 'Android', 'Web']),
            version: getRandomElement(['1.0.0', '1.1.0', '1.2.0']),
            model: getRandomElement(['iPhone 13', 'Samsung Galaxy S21', 'Pixel 6', 'iPad', 'Chrome Browser'])
          };
        }

        // Create attendance record
        const attendanceData = {
          userEmail: user.email,
          gymId: gym.id,
          checkInTime: checkInTime,
          checkOutTime: checkOutTime,
          checkInMethod: method,
          userLocationLat: userLat,
          userLocationLng: userLng,
          gymLocationLat: gym.latitude,
          gymLocationLng: gym.longitude,
          distanceFromGym: distance,
          durationMinutes: durationMinutes,
          qrCodeUsed: qrCodeUsed,
          sessionNotes: sessionNotes,
          sessionRating: sessionRating,
          isValidSession: true,
          isActive: true,
          deviceInfo: deviceInfo,
          createTimestamp: new Date(),
          updateTimestamp: new Date(),
          createdBy: user.email
        };

        const [attendance, created] = await Attendance.findOrCreate({
          where: {
            userEmail: user.email,
            gymId: gym.id,
            checkInTime: checkInTime
          },
          defaults: attendanceData
        });

        if (created) {
          createdAttendances.push(attendance);
          successfulCreations++;

          if (successfulCreations % 25 === 0) {
            console.log(`  ✅ Created ${successfulCreations} attendance records...`);
          }
        }

      } catch (error) {
        console.error(`  ❌ Error creating attendance record ${i + 1}:`, error.message);
      }
    }

    // Create some active sessions (users currently checked in)
    const activeSessions = Math.min(10, users.length);
    console.log(`\n🔄 Creating ${activeSessions} active check-in sessions...`);

    for (let i = 0; i < activeSessions; i++) {
      try {
        const user = getRandomElement(users);
        const gym = getRandomElement(gyms);
        
        // Check if user already has an active session
        const existingSession = await Attendance.findOne({
          where: {
            userEmail: user.email,
            checkOutTime: null,
            isActive: true
          }
        });

        if (!existingSession) {
          const now = new Date();
          const checkInTime = new Date(now.getTime() - (Math.random() * 180 * 60 * 1000)); // Up to 3 hours ago
          
          const activeAttendance = {
            userEmail: user.email,
            gymId: gym.id,
            checkInTime: checkInTime,
            checkOutTime: null, // Still active
            checkInMethod: getRandomElement(checkInMethods),
            userLocationLat: gym.latitude + (Math.random() - 0.5) * 0.001,
            userLocationLng: gym.longitude + (Math.random() - 0.5) * 0.001,
            gymLocationLat: gym.latitude,
            gymLocationLng: gym.longitude,
            distanceFromGym: Math.floor(Math.random() * 30), // Close to gym
            durationMinutes: 0,
            isValidSession: true,
            isActive: true,
            createTimestamp: new Date(),
            updateTimestamp: new Date(),
            createdBy: user.email
          };

          await Attendance.create(activeAttendance);
          console.log(`  ✅ Created active session for ${user.email} at ${gym.name}`);
        }
      } catch (error) {
        console.error(`  ❌ Error creating active session:`, error.message);
      }
    }

    // Generate summary statistics
    const totalAttendances = await Attendance.count();
    const activeSessionsCount = await Attendance.count({
      where: { checkOutTime: null, isActive: true }
    });

    const methodStats = {};
    const userStats = {};
    const gymStats = {};

    for (const attendance of createdAttendances) {
      methodStats[attendance.checkInMethod] = (methodStats[attendance.checkInMethod] || 0) + 1;
      userStats[attendance.userEmail] = (userStats[attendance.userEmail] || 0) + 1;
      gymStats[attendance.gymId] = (gymStats[attendance.gymId] || 0) + 1;
    }

    console.log(`\n📊 Attendance Records Summary:`);
    console.log(`   Total attendance records in database: ${totalAttendances}`);
    console.log(`   New records created in this session: ${successfulCreations}`);
    console.log(`   Active sessions (not checked out): ${activeSessionsCount}`);
    console.log(`   Average sessions per user: ${(successfulCreations / users.length).toFixed(1)}`);
    
    console.log(`\n   Check-in method distribution:`);
    Object.entries(methodStats).forEach(([method, count]) => {
      console.log(`     - ${method}: ${count} sessions (${((count/successfulCreations)*100).toFixed(1)}%)`);
    });

    console.log(`\n   Most active users:`);
    const topUsers = Object.entries(userStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    topUsers.forEach(([email, count]) => {
      console.log(`     - ${email}: ${count} sessions`);
    });

    const avgDuration = createdAttendances
      .filter(a => a.durationMinutes > 0)
      .reduce((sum, a) => sum + a.durationMinutes, 0) / 
      createdAttendances.filter(a => a.durationMinutes > 0).length;

    console.log(`\n   Average workout duration: ${avgDuration?.toFixed(0) || 0} minutes`);
    console.log(`   Sessions with ratings: ${createdAttendances.filter(a => a.sessionRating).length}`);
    console.log(`   Sessions with notes: ${createdAttendances.filter(a => a.sessionNotes).length}`);

    return {
      attendances: createdAttendances,
      count: successfulCreations,
      totalInDatabase: totalAttendances,
      activeSessionsCount: activeSessionsCount,
      userCount: users.length,
      gymCount: gyms.length,
      success: true
    };

  } catch (error) {
    console.error('❌ Error seeding attendance records:', error);
    throw error;
  }
};

/**
 * Standalone execution if run directly
 */
if (require.main === module) {
  const { sequelize } = require('../models');
  
  seedAttendance()
    .then((result) => {
      console.log('✅ Attendance records seeding completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Attendance records seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedAttendance };
