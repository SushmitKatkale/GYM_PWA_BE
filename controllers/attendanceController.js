const {
  Attendance,
  Gym,
  User,
  GymCheckInMethods,
  GymQRCodes,
  GymUniqueCodes,
  sequelize
} = require('../models');
const ResponseUtil = require('../utils/response');
const locationService = require('../services/locationService');
const { Op } = require('sequelize');

/**
 * Quick check-in based on user location and subscribed gyms
 * Uses location to find nearby gyms and allows check-in
 */
const quickCheckIn = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { location, accuracy, gymId } = req.body;
    const { latitude, longitude } = location;
    const userId = req.user.id; // Updated to use user ID
    const userEmail = req.user.email; // Keep for backward compatibility

    // Validate required fields
    if (!latitude || !longitude) {
      await transaction.rollback();
      return ResponseUtil.validationError(res, {
        latitude: 'Latitude is required',
        longitude: 'Longitude is required'
      });
    }

    // Validate location coordinates
    if (!locationService.validateCoordinates(latitude, longitude)) {
      await transaction.rollback();
      return ResponseUtil.validationError(res, {
        location: 'Invalid latitude or longitude coordinates'
      });
    }

    // Check if user has an active check-in - support both user ID and email
    const activeCheckInWhere = {
      checkOutTime: null,
      isActive: true
    };
    if (userId) {
      activeCheckInWhere.userId = userId;
    } else {
      activeCheckInWhere.userEmail = userEmail;
    }
    
    const activeCheckIn = await Attendance.findOne({
      where: activeCheckInWhere
    });

    if (activeCheckIn) {
      await transaction.rollback();
      return ResponseUtil.conflictError(res, 'You are already checked in. Please check out first.');
    }

    // Get user's active subscriptions (subscriptions that haven't expired)
    const { UserSubscription, Subscription } = require('../models');
    const subscriptionWhere = {
      record_status: 1, // Updated field name
      validTo: { [Op.gte]: new Date() } // Only check if subscription hasn't expired
    };
    if (userId) {
      subscriptionWhere.userId = userId;
    } else {
      subscriptionWhere.userEmail = userEmail;
    }
    
    const activeSubscriptions = await UserSubscription.findAll({
      where: subscriptionWhere,
      include: [{
        model: Subscription,
        as: 'subscription',
        required: true,
        include: [{
          model: Gym,
          as: 'gym',
          required: true,
          where: {
            record_status: 1, // Updated field name
            attendanceTrackingEnabled: true
          }
        }]
      }]
    });

    if (activeSubscriptions.length === 0) {
      await transaction.rollback();
      return ResponseUtil.notFoundError(res, 'No active gym subscriptions found. Please subscribe to a gym first.');
    }

    // Check which subscribed gyms allow quick check-in and user is within range
    const availableGyms = [];
    for (const subscription of activeSubscriptions) {
      const gym = subscription.subscription.gym;
      
      // Check if gym has quick check-in enabled
      const checkInMethods = await GymCheckInMethods.findOne({
        where: {
          gymId: gym.id,
          methodType: 'quick_checkin',
          isActive: true
        }
      });

      if (checkInMethods && checkInMethods.isActive) {
        // Validate location against gym's check-in radius
        const locationValidation = await locationService.validateLocationForGym(
          latitude,
          longitude,
          gym.id
        );

        if (locationValidation.isValid) {
          availableGyms.push({
            gym: gym.toJSON(),
            subscription: {
              id: subscription.id,
              validTo: subscription.validTo,
              subscriptionTitle: subscription.subscription.title
            },
            distance: locationValidation.distance,
            distanceText: locationValidation.distanceText,
            walkingDuration: locationValidation.walkingDuration,
            accuracy: locationValidation.locationAccuracy
          });
        }
      }
    }

    if (availableGyms.length === 0) {
      await transaction.rollback();
      return ResponseUtil.notFoundError(res, 'You are not within check-in range of any of your subscribed gyms, or they do not have quick check-in enabled.');
    }

    // Select the closest gym for auto check-in
    const selectedGym = availableGyms.reduce((closest, gym) =>
      gym.distance < closest.distance ? gym : closest
    );

    // Create attendance record
    const attendanceData = {
      gymId: selectedGym.gym.id,
      checkInTime: new Date(),
      checkInMethod: 'quick_checkin',
      userLocationLat: latitude,
      userLocationLng: longitude,
      distanceFromGym: selectedGym.distance,
      isActive: true,
      createdBy: userId || userEmail,
      updatedBy: userId || userEmail
    };
    if (userId) {
      attendanceData.userId = userId;
    }
    if (userEmail) {
      attendanceData.userEmail = userEmail; // Keep for compatibility
    }
    
    const attendance = await Attendance.create(attendanceData, { transaction });

    await transaction.commit();

    return ResponseUtil.success(res, {
      attendance,
      gym: selectedGym.gym,
      subscription: selectedGym.subscription,
      distance: selectedGym.distanceText,
      walkingTime: selectedGym.walkingDuration,
      message: `Successfully checked in to ${selectedGym.gym.name}`
    }, 'Quick check-in successful', 201);

  } catch (error) {
    await transaction.rollback();
    console.error('Error in quick check-in:', error);
    return ResponseUtil.error(res, 'Failed to process quick check-in', 500);
  }
};

/**
 * Check-in using gym QR code
 * Validates QR code and location if required
 */
const qrCodeCheckIn = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { qrCode, latitude, longitude, accuracy } = req.body;
    const userId = req.user.id; // Updated to use user ID
    const userEmail = req.user.email; // Keep for backward compatibility

    // Validate required fields
    if (!qrCode) {
      await transaction.rollback();
      return ResponseUtil.validationError(res, {
        qrCode: 'QR code is required'
      });
    }

    // Check if user has an active check-in - support both user ID and email
    const activeCheckInWhere = {
      checkOutTime: null,
      isActive: true
    };
    if (userId) {
      activeCheckInWhere.userId = userId;
    } else {
      activeCheckInWhere.userEmail = userEmail;
    }
    
    const activeCheckIn = await Attendance.findOne({
      where: activeCheckInWhere
    });

    if (activeCheckIn) {
      await transaction.rollback();
      return ResponseUtil.conflictError(res, 'You are already checked in. Please check out first.');
    }

    // Find and validate QR code
    const gymQRCode = await GymQRCodes.findOne({
      where: {
        qrCode,
        isActive: true
      },
      include: [{
        model: Gym,
        as: 'gym',
        required: true
      }]
    });

    if (!gymQRCode) {
      await transaction.rollback();
      return ResponseUtil.notFoundError(res, 'Invalid or expired QR code');
    }

    // Check if QR code is expired
    if (gymQRCode.expiresAt && new Date() > gymQRCode.expiresAt) {
      await transaction.rollback();
      return ResponseUtil.validationError(res, {
        qrCode: 'QR code has expired'
      });
    }

    // Validate location if required by gym settings
    const checkInMethods = await GymCheckInMethods.findOne({
      where: { gymId: gymQRCode.gymId }
    });

    let locationValidation = { isValid: true, distance: null };
    if (checkInMethods && checkInMethods.qrCodeLocationRequired && latitude && longitude) {
      if (!locationService.isValidCoordinate(latitude, longitude)) {
        await transaction.rollback();
        return ResponseUtil.validationError(res, {
          location: 'Invalid latitude or longitude coordinates'
        });
      }

      locationValidation = await locationService.validateLocationForGym(
        latitude,
        longitude,
        gymQRCode.gymId
      );

      if (!locationValidation.isValid) {
        await transaction.rollback();
        return ResponseUtil.validationError(res, {
          location: `You must be within ${checkInMethods.checkInRadius || 100}m of the gym to check in`
        });
      }
    }

    // Create attendance record
    const attendanceData = {
      gymId: gymQRCode.gymId,
      checkInTime: new Date(),
      checkInMethod: 'gym_qr_scan',
      userLocationLat: latitude,
      userLocationLng: longitude,
      qrCodeUsed: qrCode,
      isActive: true,
      createdBy: userId || userEmail,
      updatedBy: userId || userEmail
    };
    if (userId) {
      attendanceData.userId = userId;
    }
    if (userEmail) {
      attendanceData.userEmail = userEmail; // Keep for compatibility
    }
    
    const attendance = await Attendance.create(attendanceData, { transaction });

    // Update QR code usage
    await gymQRCode.increment('usageCount', { transaction });

    await transaction.commit();

    return ResponseUtil.success(res, {
      attendance,
      gym: gymQRCode.gym,
      message: `Successfully checked in to ${gymQRCode.gym.name} using QR code`
    }, 'QR code check-in successful', 201);

  } catch (error) {
    await transaction.rollback();
    console.error('Error in QR code check-in:', error);
    return ResponseUtil.error(res, 'Failed to process QR code check-in', 500);
  }
};

/**
 * Check-in using gym unique code
 * Validates unique code and location if required
 */
const uniqueCodeCheckIn = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { uniqueCode, latitude, longitude, accuracy } = req.body;
    const userId = req.user.id; // Updated to use user ID
    const userEmail = req.user.email; // Keep for backward compatibility

    // Validate required fields
    if (!uniqueCode) {
      await transaction.rollback();
      return ResponseUtil.validationError(res, {
        uniqueCode: 'Unique code is required'
      });
    }

    // Check if user has an active check-in - support both user ID and email
    const activeCheckInWhere = {
      checkOutTime: null,
      isActive: true
    };
    if (userId) {
      activeCheckInWhere.userId = userId;
    } else {
      activeCheckInWhere.userEmail = userEmail;
    }
    
    const activeCheckIn = await Attendance.findOne({
      where: activeCheckInWhere
    });

    if (activeCheckIn) {
      await transaction.rollback();
      return ResponseUtil.conflictError(res, 'You are already checked in. Please check out first.');
    }

    // Find and validate unique code
    const gymUniqueCode = await GymUniqueCodes.findOne({
      where: {
        uniqueCode: uniqueCode.toUpperCase(),
        isActive: true
      },
      include: [{
        model: Gym,
        as: 'gym',
        required: true
      }]
    });

    if (!gymUniqueCode) {
      await transaction.rollback();
      return ResponseUtil.notFoundError(res, 'Invalid or inactive unique code');
    }

    // Check if unique code is expired
    if (gymUniqueCode.expiresAt && new Date() > gymUniqueCode.expiresAt) {
      await transaction.rollback();
      return ResponseUtil.validationError(res, {
        uniqueCode: 'Unique code has expired'
      });
    }

    // Validate location if required by gym settings
    const checkInMethods = await GymCheckInMethods.findOne({
      where: { gymId: gymUniqueCode.gymId }
    });

    let locationValidation = { isValid: true, distance: null };
    if (checkInMethods && checkInMethods.uniqueCodeLocationRequired && latitude && longitude) {
      if (!locationService.isValidCoordinate(latitude, longitude)) {
        await transaction.rollback();
        return ResponseUtil.validationError(res, {
          location: 'Invalid latitude or longitude coordinates'
        });
      }

      locationValidation = await locationService.validateLocationForGym(
        latitude,
        longitude,
        gymUniqueCode.gymId
      );

      if (!locationValidation.isValid) {
        await transaction.rollback();
        return ResponseUtil.validationError(res, {
          location: `You must be within ${checkInMethods.checkInRadius || 100}m of the gym to check in`
        });
      }
    }

    // Create attendance record
    const attendanceData = {
      gymId: gymUniqueCode.gymId,
      checkInTime: new Date(),
      checkInMethod: 'gym_code',
      userLocationLat: latitude,
      userLocationLng: longitude,
      isActive: true,
      createdBy: userId || userEmail,
      updatedBy: userId || userEmail
    };
    if (userId) {
      attendanceData.userId = userId;
    }
    if (userEmail) {
      attendanceData.userEmail = userEmail; // Keep for compatibility
    }
    
    const attendance = await Attendance.create(attendanceData, { transaction });

    // Update unique code usage
    await gymUniqueCode.increment('usageCount', { transaction });

    await transaction.commit();

    return ResponseUtil.success(res, {
      attendance,
      gym: gymUniqueCode.gym,
      message: `Successfully checked in to ${gymUniqueCode.gym.name} using unique code`
    }, 'Unique code check-in successful', 201);

  } catch (error) {
    await transaction.rollback();
    console.error('Error in unique code check-in:', error);
    return ResponseUtil.error(res, 'Failed to process unique code check-in', 500);
  }
};

/**
 * Owner scan user QR (for gym owners to check in users)
 * No location validation required
 */
const ownerScanCheckIn = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { userQRCode, gymId } = req.body;
    const ownerEmail = req.user.email;

    // Validate required fields
    if (!userQRCode || !gymId) {
      await transaction.rollback();
      return ResponseUtil.validationError(res, {
        userQRCode: 'User QR code is required',
        gymId: 'Gym ID is required'
      });
    }

    // Verify owner owns the gym
    const gym = await Gym.findOne({
      where: {
        id: gymId,
        owner_id: req.user.id // Updated to use owner_id field and user ID
      }
    });

    if (!gym) {
      await transaction.rollback();
      return ResponseUtil.forbiddenError(res, 'You are not authorized to check in users to this gym');
    }

    // Extract user email from QR code (assuming QR code contains user email)
    // This might need adjustment based on QR code format
    let userEmail;
    try {
      // If QR code is just the email
      userEmail = userQRCode;

      // Verify user exists
      const user = await User.findOne({
        where: { email: userEmail }
      });

      if (!user) {
        await transaction.rollback();
        return ResponseUtil.notFoundError(res, 'User not found');
      }
    } catch (error) {
      await transaction.rollback();
      return ResponseUtil.validationError(res, {
        userQRCode: 'Invalid user QR code format'
      });
    }

    // Check if user has an active check-in
    const activeCheckIn = await Attendance.findOne({
      where: {
        userEmail,
        checkOutTime: null,
        isActive: true
      }
    });

    if (activeCheckIn) {
      await transaction.rollback();
      return ResponseUtil.conflictError(res, 'User is already checked in somewhere. Please check them out first.');
    }

    // Create attendance record
    const attendance = await Attendance.create({
      userEmail,
      gymId,
      checkInTime: new Date(),
      checkInMethod: 'owner_scan_user',
      isActive: true,
      createdBy: ownerEmail,
      updatedBy: ownerEmail
    }, { transaction });

    await transaction.commit();

    const user = await User.findOne({
      where: { email: userEmail },
      attributes: ['firstName', 'lastName', 'email']
    });

    return ResponseUtil.success(res, {
      attendance,
      user,
      gym,
      message: `Successfully checked in ${user.firstName} ${user.lastName} to ${gym.name}`
    }, 'Owner scan check-in successful', 201);

  } catch (error) {
    await transaction.rollback();
    console.error('Error in owner scan check-in:', error);
    return ResponseUtil.error(res, 'Failed to process owner scan check-in', 500);
  }
};

/**
 * Check out user from gym
 * Can be used by user or gym owner
 */
const checkOut = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { attendanceId, latitude, longitude, accuracy } = req.body;
    const userEmail = req.user.email;
    const userType = req.user.type;

    let whereClause = {
      checkOutTime: null,
      isActive: true
    };

    if (attendanceId) {
      whereClause.id = attendanceId;
    } else {
      whereClause.userEmail = userEmail;
    }

    // Find active attendance
    const attendance = await Attendance.findOne({
      where: whereClause,
      include: [{
        model: Gym,
        as: 'gym',
        required: true
      }, {
        model: User,
        as: 'user',
        attributes: ['firstName', 'lastName', 'email'],
        required: true
      }]
    });

    if (!attendance) {
      await transaction.rollback();
      return ResponseUtil.notFoundError(res, 'No active check-in found');
    }

    // Authorization check - updated to use role field and user ID
    const isOwner = req.user.role === 2 && attendance.gym.owner_id === req.user.id;
    const isUser = attendance.userEmail === userEmail || attendance.userId === req.user.id;
    const isAdmin = req.user.role === 4; // Updated role value

    if (!isOwner && !isUser && !isAdmin) {
      await transaction.rollback();
      return ResponseUtil.forbiddenError(res, 'Not authorized to check out this attendance');
    }

    // Update attendance record
    const checkOutTime = new Date();
    const duration = Math.floor((checkOutTime - attendance.checkInTime) / 1000 / 60); // Duration in minutes

    await attendance.update({
      checkOutTime,
      durationMinutes: duration,
      isActive: false,
      updatedBy: userEmail
    }, { transaction });

    await transaction.commit();

    return ResponseUtil.success(res, {
      attendance: await attendance.reload({
        include: [{
          model: Gym,
          as: 'gym'
        }, {
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName', 'email']
        }]
      }),
      duration: `${Math.floor(duration / 60)}h ${duration % 60}m`,
      message: `Successfully checked out from ${attendance.gym.name}`
    }, 'Check-out successful');

  } catch (error) {
    await transaction.rollback();
    console.error('Error in check-out:', error);
    return ResponseUtil.error(res, 'Failed to process check-out', 500);
  }
};

/**
 * Get current user's active check-in status
 */
const getCheckInStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;

    // Support both user ID and email
    const whereClause = {
      checkOutTime: null,
      isActive: true
    };
    if (userId) {
      whereClause.userId = userId;
    } else {
      whereClause.userEmail = userEmail;
    }

    const activeCheckIn = await Attendance.findOne({
      where: whereClause,
      include: [{
        model: Gym,
        as: 'gym',
        attributes: ['id', 'name', 'address', 'latitude', 'longitude']
      }],
      order: [['checkInTime', 'DESC']]
    });

    if (!activeCheckIn) {
      return ResponseUtil.success(res, {
        isCheckedIn: false,
        attendance: null
      }, 'No active check-in found');
    }

    const currentTime = new Date();
    const durationMinutes = Math.floor((currentTime - activeCheckIn.checkInTime) / 1000 / 60);

    return ResponseUtil.success(res, {
      isCheckedIn: true,
      attendance: activeCheckIn,
      currentDuration: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
    }, 'Active check-in found');

  } catch (error) {
    console.error('Error getting check-in status:', error);
    return ResponseUtil.error(res, 'Failed to get check-in status', 500);
  }
};

/**
 * Validate location for a specific gym
 */
const validateLocation = async (req, res) => {
  try {
    const { latitude, longitude, gymId } = req.body;

    // Validate required fields
    if (!latitude || !longitude || !gymId) {
      return ResponseUtil.validationError(res, {
        latitude: 'Latitude is required',
        longitude: 'Longitude is required',
        gymId: 'Gym ID is required'
      });
    }

    // Validate coordinates
    if (!locationService.isValidCoordinate(latitude, longitude)) {
      return ResponseUtil.validationError(res, {
        location: 'Invalid latitude or longitude coordinates'
      });
    }

    // Validate location for gym
    const validation = await locationService.validateLocationForGym(latitude, longitude, gymId);

    return ResponseUtil.success(res, validation, 'Location validation completed');

  } catch (error) {
    console.error('Error validating location:', error);
    return ResponseUtil.error(res, 'Failed to validate location', 500);
  }
};

/**
 * Get user's attendance history
 */
const getUserAttendance = async (req, res) => {
  try {
    const { userId } = req.params;
    const userEmail = req.user.email;
    const userType = req.user.type;

    // Determine if request is authorized
    let targetUserEmail = userId;

    // If userId looks like an email, use it directly
    // Otherwise, try to find user by ID
    if (!userId.includes('@')) {
      const user = await User.findByPk(userId);
      if (!user) {
        return ResponseUtil.notFoundError(res, 'User not found');
      }
      targetUserEmail = user.email;
    }

    // Authorization: users can only see their own data unless they're admin/owner
    if (userType === '1' && targetUserEmail !== userEmail) {
      return ResponseUtil.forbiddenError(res, 'Not authorized to view this user\'s attendance');
    }

    // Get attendance history
    const attendance = await Attendance.findAll({
      where: {
        userEmail: targetUserEmail
      },
      include: [{
        model: Gym,
        as: 'gym',
        attributes: ['id', 'name', 'address', 'latitude', 'longitude']
      }],
      order: [['checkInTime', 'DESC']],
      limit: 50 // Limit to last 50 records
    });

    // Format the response data
    const formattedAttendance = attendance.map(record => ({
      id: record.id,
      gymId: record.gymId,
      gymName: record.gym?.name,
      checkIn: record.checkInTime,
      checkOut: record.checkOutTime,
      duration: record.durationMinutes,
      date: record.checkInTime.toISOString().split('T')[0], // Date only
      method: record.checkInMethod,
      isActive: record.isActive
    }));

    return ResponseUtil.success(res, {
      attendance: formattedAttendance,
      total: attendance.length
    }, 'User attendance retrieved successfully');

  } catch (error) {
    console.error('Error getting user attendance:', error);
    return ResponseUtil.error(res, 'Failed to get user attendance', 500);
  }
};

/**
 * Get user's active session
 */
const getActiveSession = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get active session
    const activeSession = await Attendance.findOne({
      where: {
        userId: userId,
        checkOutTime: null
      },
      include: [{
        model: Gym,
        as: 'gym'
      }],
      order: [['checkInTime', 'DESC']]
    });

    if (!activeSession) {
      return ResponseUtil.success(res, {
        activeSession: null
      }, 'No active session found');
    }

    // Calculate current duration
    const currentTime = new Date();
    const durationMinutes = Math.floor((currentTime - activeSession.checkInTime) / 1000 / 60);

    const formattedSession = {
      id: activeSession.id,
      gymId: activeSession.gymId,
      gymName: activeSession.gym?.name,
      checkIn: activeSession.checkInTime,
      currentDuration: durationMinutes,
      method: activeSession.checkInMethod
    };

    return ResponseUtil.success(res, {
      activeSession: formattedSession,
      isActive: true
    }, 'Active session retrieved successfully');

  } catch (error) {
    console.error('Error getting active session:', error);
    return ResponseUtil.error(res, 'Failed to get active session', 500);
  }
};

module.exports = {
  quickCheckIn,
  qrCodeCheckIn,
  uniqueCodeCheckIn,
  ownerScanCheckIn,
  checkOut,
  getCheckInStatus,
  validateLocation,
  getUserAttendance,
  getActiveSession
};
