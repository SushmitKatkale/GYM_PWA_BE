const {
  Attendance,
  Gym,
  User,
  CheckInMethod,
  GymCheckInMethods,
  GymQRCodes,
  GymUniqueCodes,
  UserSubscription,
  Subscription,
  Payment,
  sequelize
} = require('../models');
const ResponseUtil = require('../utils/response');
const locationService = require('../services/locationService');
const { Op } = require('sequelize');

/**
 * Helper function to get check-in method ID by name
 */
const getMethodId = async (methodName) => {
  const method = await CheckInMethod.findOne({
    where: { name: methodName }
  });
  return method ? method.id : null;
};

/**
 * Helper function to check if user has active check-in
 */
const hasActiveCheckIn = async (userId) => {
  return await Attendance.findOne({
    where: {
      userId,
      checkOutTime: null
    }
  });
};

/**
 * Unified check-in endpoint that handles different check-in methods
 */
const checkIn = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      method,
      gymId,
      qrCode,
      uniqueCode,
      userQRCode,
      location,
      attendanceType = 'normal'
    } = req.body;
    let latitude = location.latitude || null;
    let longitude = location.longitude || null;

    const userId = req.user.id;

    if (!latitude || !longitude) {
      return ResponseUtil.validationError(res, {
        latitude: 'Latitude is required',
        longitude: 'Longitude is required'
      });
    }

    // Validate required fields
    if (!method) {
      await transaction.rollback();
      return ResponseUtil.validationError(res, {
        method: 'Check-in method is required'
      });
    }

    // Get method ID
    const methodId = await getMethodId(method);
    if (!methodId) {
      await transaction.rollback();
      return ResponseUtil.validationError(res, {
        method: 'Invalid check-in method'
      });
    }

    const subscrpbedGyms = await UserSubscription.findAll({
      where: {
        userId: userId,
        endDate: { [Op.gte]: new Date() }
      },
      include: [
        {
          model: Subscription,
          as: 'subscription',
          include: [{
            model: Gym,
            as: 'gym',
            include: [{
              model: User,
              as: 'owner'
            }]
          }]
        },
        {
          model: Payment,
          as: 'payment'
        }
      ]
    });

    if (subscrpbedGyms.length === 0) {
      await transaction.rollback();
      return ResponseUtil.forbiddenError(res, 'You do not have an active subscription to any gym.');
    }

    // Check if user already has an active check-in
    const activeCheckIn = await hasActiveCheckIn(userId);
    if (activeCheckIn) {
      await transaction.rollback();
      return ResponseUtil.conflictError(res, 'You are already checked in. Please check out first.');
    }

    let targetGymId = null;
    let neabySubscribedGyms = [];

    if (gymId && method == 'owner_scan_user') {
      targetGymId = gymId;
    } else {
      neabySubscribedGyms = await fetchNeabySubscribedGymsInRange(latitude, longitude, subscrpbedGyms, process.env.GYMS_CHECKIN_RANGE_METERS || 1000); // 1000m range
      if (neabySubscribedGyms.length === 0) {
        await transaction.rollback();
        return ResponseUtil.notFoundError(res, 'No nearby subscribed gyms found.');
      }
      targetGymId = neabySubscribedGyms[0].gym.id; // Closest gym
    }

    if(targetGymId === null) {
      await transaction.rollback();
      return ResponseUtil.validationError(res, {
        gym: 'Unable to determine target gym for check-in'
      });
    }

    let targetGymCheckInMethods = await GymCheckInMethods.findOne({
      where: {
        gymId: targetGymId,
        methodId: methodId,
      }
    });

    if (!targetGymCheckInMethods) {
      await transaction.rollback();
      return ResponseUtil.forbiddenError(res, 'The selected gym does not support any check-in methods.');
    }
    
    // Create attendance record
    const attendanceData = {
      userId,
      gymId: targetGymId,
      attendanceType,
      methodId,
      checkInTime: new Date(),
      latitude: latitude || null,
      longitude: longitude || null,
      createdBy: userId,
      updatedBy: userId,
      recordStatus: 1
    };

    const attendance = await Attendance.create(attendanceData, { transaction });

    // Get gym and user information for response
    const gym = await Gym.findByPk(targetGymId, {
      attributes: ['id', 'name', 'address', 'latitude', 'longitude']
    });

    const user = await User.findByPk(userId, {
      attributes: ['id', 'firstName', 'lastName', 'email']
    });

    const checkInMethodInfo = await CheckInMethod.findByPk(methodId);

    await transaction.commit();

    return ResponseUtil.success(res, {
      attendance: {
        id: attendance.id,
        gymId: attendance.gymId,
        userId: attendance.userId,
        attendanceType: attendance.attendanceType,
        checkInTime: attendance.checkInTime,
        method: checkInMethodInfo.name
      },
      gym,
      user,
      message: `Successfully checked in to ${gym.name}`
    }, 'Check-in successful', 201);

  } catch (error) {
    await transaction.rollback();
    console.error('Error in check-in:', error);
    return ResponseUtil.error(res, 'Failed to process check-in', 500);
  }
};

/**
 * Handle quick check-in logic
 */
const handleQuickCheckIn = async (userId, latitude, longitude, transaction) => {
  if (!latitude || !longitude) {
    return {
      success: false,
      response: ResponseUtil.validationError(null, {
        location: 'Latitude and longitude are required for quick check-in'
      })
    };
  }

  // Validate coordinates
  if (!locationService.validateCoordinates(latitude, longitude)) {
    return {
      success: false,
      response: ResponseUtil.validationError(null, {
        location: 'Invalid coordinates'
      })
    };
  }

  // Get user's active subscriptions
  const activeSubscriptions = await UserSubscription.findAll({
    where: {
      userId,
      recordStatus: 1,
      validTo: { [Op.gte]: new Date() }
    },
    include: [{
      model: Subscription,
      as: 'subscription',
      required: true,
      include: [{
        model: Gym,
        as: 'gym',
        required: true,
        where: { recordStatus: 1 }
      }]
    }]
  });

  if (activeSubscriptions.length === 0) {
    return {
      success: false,
      response: ResponseUtil.notFoundError(null, 'No active gym subscriptions found')
    };
  }

  // Find nearby gyms within check-in range
  let closestGym = null;
  let minDistance = Infinity;

  for (const subscription of activeSubscriptions) {
    const gym = subscription.subscription.gym;

    // Check if gym supports quick check-in
    const gymMethod = await GymCheckInMethods.findOne({
      where: {
        gymId: gym.id,
        methodType: 'quick_checkin',
        isActive: true
      }
    });

    if (gymMethod) {
      const validation = await locationService.validateLocationForGym(
        latitude,
        longitude,
        gym.id
      );

      if (validation.isValid && validation.distance < minDistance) {
        minDistance = validation.distance;
        closestGym = gym.id;
      }
    }
  }

  if (!closestGym) {
    return {
      success: false,
      response: ResponseUtil.notFoundError(null, 'No nearby gyms available for quick check-in')
    };
  }

  return {
    success: true,
    gymId: closestGym,
    validation: { distance: minDistance }
  };
};

/**
 * Handle QR code check-in logic
 */
const handleQRCheckIn = async (qrCode, latitude, longitude, transaction) => {
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
    return {
      success: false,
      response: ResponseUtil.notFoundError(null, 'Invalid or expired QR code')
    };
  }

  // Check if QR code is expired
  if (gymQRCode.expiresAt && new Date() > gymQRCode.expiresAt) {
    return {
      success: false,
      response: ResponseUtil.validationError(null, {
        qrCode: 'QR code has expired'
      })
    };
  }

  // Validate location if required
  const gymSettings = await GymCheckInMethods.findOne({
    where: { gymId: gymQRCode.gymId }
  });

  if (gymSettings && gymSettings.qrCodeLocationRequired && latitude && longitude) {
    const validation = await locationService.validateLocationForGym(
      latitude,
      longitude,
      gymQRCode.gymId
    );

    if (!validation.isValid) {
      return {
        success: false,
        response: ResponseUtil.validationError(null, {
          location: `You must be within ${gymSettings.checkInRadius || 100}m of the gym`
        })
      };
    }
  }

  // Update QR code usage
  await gymQRCode.increment('usageCount', { transaction });

  return {
    success: true,
    gymId: gymQRCode.gymId
  };
};

/**
 * Handle unique code check-in logic
 */
const handleUniqueCodeCheckIn = async (uniqueCode, latitude, longitude, transaction) => {
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
    return {
      success: false,
      response: ResponseUtil.notFoundError(null, 'Invalid or inactive unique code')
    };
  }

  // Check if code is expired
  if (gymUniqueCode.expiresAt && new Date() > gymUniqueCode.expiresAt) {
    return {
      success: false,
      response: ResponseUtil.validationError(null, {
        uniqueCode: 'Unique code has expired'
      })
    };
  }

  // Update code usage
  await gymUniqueCode.increment('usageCount', { transaction });

  return {
    success: true,
    gymId: gymUniqueCode.gymId
  };
};

/**
 * Handle different check-in methods and return target gym ID
 * @param {string} method - Check-in method
 * @param {Object} params - Method-specific parameters
 * @param {number} userId - User ID
 * @param {number} latitude - User latitude
 * @param {number} longitude - User longitude
 * @param {Object} transaction - Database transaction
 * @returns {Promise<Object>} Result with success, gymId, and validation info
 */
const handleCheckInMethod = async (method, params, userId, latitude, longitude, transaction) => {
  const { gymId, qrCode, uniqueCode, userQRCode, nearbyGyms } = params;

  switch (method) {
    case 'quick_checkin':
      // For quick check-in, use the closest nearby gym if available
      if (nearbyGyms && nearbyGyms.length > 0) {
        return {
          success: true,
          gymId: nearbyGyms[0].gym.id,
          validation: { distance: nearbyGyms[0].distance }
        };
      }
      // Fall back to the original quick check-in logic
      return await handleQuickCheckIn(userId, latitude, longitude, transaction);

    case 'gym_qr_scan':
      if (!qrCode) {
        return {
          success: false,
          response: { qrCode: 'QR code is required' }
        };
      }
      return await handleQRCheckIn(qrCode, latitude, longitude, transaction);

    case 'gym_code':
      if (!uniqueCode) {
        return {
          success: false,
          response: { uniqueCode: 'Unique code is required' }
        };
      }
      return await handleUniqueCodeCheckIn(uniqueCode, latitude, longitude, transaction);

    case 'owner_scan_user':
      if (!userQRCode || !gymId) {
        return {
          success: false,
          response: {
            userQRCode: 'User QR code is required',
            gymId: 'Gym ID is required'
          }
        };
      }
      const ownerResult = await handleOwnerScanCheckIn(userQRCode, gymId, userId, transaction);
      if (ownerResult.success) {
        return {
          success: true,
          gymId: gymId,
          targetUserId: ownerResult.targetUserId
        };
      }
      return ownerResult;

    case 'nearby_gym':
      // New method for nearby gym check-in
      if (nearbyGyms && nearbyGyms.length > 0) {
        return {
          success: true,
          gymId: nearbyGyms[0].gym.id,
          validation: { distance: nearbyGyms[0].distance },
          selectedGym: nearbyGyms[0]
        };
      }
      return {
        success: false,
        response: { gym: 'No nearby subscribed gyms found' }
      };

    default:
      return {
        success: false,
        response: { method: 'Unsupported check-in method' }
      };
  }
};

/**
 * Fetch nearby subscribed gyms within a specified range
 * @param {number} latitude - User's latitude
 * @param {number} longitude - User's longitude  
 * @param {Array} subscriptions - User's active subscriptions
 * @param {number} rangeMeters - Range in meters to search within
 * @returns {Promise<Array>} Array of nearby gyms within range
 */
const fetchNeabySubscribedGymsInRange = async (latitude, longitude, subscriptions, rangeMeters) => {
  const nearbyGyms = [];

  const userLatitude = parseFloat(latitude);
  const userLongitude = parseFloat(longitude);
  const searchRange = parseInt(rangeMeters) || 1000; // Default to 1000m if not provided

  // Validate coordinates
  if (!locationService.validateCoordinates(userLatitude, userLongitude)) {
    return nearbyGyms;
  }

  // Process subscriptions sequentially to avoid overwhelming the Google API
  for (const sub of subscriptions) {
    const gym = sub.subscription.gym;

    // Check if gym has valid coordinates
    if (gym.latitude && gym.longitude) {
      const gymLatitude = parseFloat(gym.latitude);
      const gymLongitude = parseFloat(gym.longitude);

      // Validate gym coordinates
      if (locationService.validateCoordinates(gymLatitude, gymLongitude)) {
        try {
          // Calculate distance using Google Distance Matrix API
          const distanceInfo = await locationService.getGoogleDistance(
            { latitude: userLatitude, longitude: userLongitude },
            { latitude: gymLatitude, longitude: gymLongitude },
            'walking'
          );

          const distance = distanceInfo.distance.value;

          // Check if gym is within the specified range
          if (distance <= searchRange) {
            nearbyGyms.push({
              gym: gym,
              subscription: sub.subscription,
              userSubscription: sub,
              distance: distance,
              distanceText: distanceInfo.distance.text,
              walkingDuration: distanceInfo.duration.text,
              distanceMethod: distanceInfo.method,
              isInRange: true
            });
          }
        } catch (error) {
          console.error(`fetchNeabySubscribedGymsInRange: Error calculating distance for gym ID ${gym.id}:`, error.message);

          // Fallback to Haversine calculation if Google API fails
          const fallbackDistance = locationService.calculateHaversineDistance(
            userLatitude,
            userLongitude,
            gymLatitude,
            gymLongitude
          );

          if (fallbackDistance <= searchRange) {
            nearbyGyms.push({
              gym: gym,
              subscription: sub.subscription,
              userSubscription: sub,
              distance: fallbackDistance,
              distanceText: `${fallbackDistance}m`,
              walkingDuration: `${Math.round(fallbackDistance / 84)} min`, // ~5 km/h walking speed
              distanceMethod: 'haversine_fallback',
              isInRange: true,
              fallbackUsed: true
            });
          }
        }
      } else {
        console.warn(`fetchNeabySubscribedGymsInRange: Invalid gym coordinates for gym ID ${gym.id}`);
      }
    } else {
      console.warn(`fetchNeabySubscribedGymsInRange: Missing coordinates for gym ID ${gym.id}`);
    }
  }

  // Sort by distance (closest first)
  nearbyGyms.sort((a, b) => a.distance - b.distance);

  return nearbyGyms;
};

/**
 * Handle owner scan check-in logic
 */
const handleOwnerScanCheckIn = async (userQRCode, gymId, ownerId, transaction) => {
  // Verify owner owns the gym
  const gym = await Gym.findOne({
    where: {
      id: gymId,
      owner_id: ownerId
    }
  });

  if (!gym) {
    return {
      success: false,
      response: ResponseUtil.forbiddenError(null, 'Not authorized to check in users to this gym')
    };
  }

  // Extract user from QR code (assuming QR code contains user email or ID)
  let targetUser;
  try {
    // If QR code is email format
    if (userQRCode.includes('@')) {
      targetUser = await User.findOne({ where: { email: userQRCode } });
    } else {
      // If QR code is user ID
      targetUser = await User.findByPk(userQRCode);
    }

    if (!targetUser) {
      return {
        success: false,
        response: ResponseUtil.notFoundError(null, 'User not found')
      };
    }
  } catch (error) {
    return {
      success: false,
      response: ResponseUtil.validationError(null, {
        userQRCode: 'Invalid user QR code format'
      })
    };
  }

  // Check if target user already has active check-in
  const userActiveCheckIn = await hasActiveCheckIn(targetUser.id);
  if (userActiveCheckIn) {
    return {
      success: false,
      response: ResponseUtil.conflictError(null, 'User is already checked in somewhere')
    };
  }

  return {
    success: true,
    gymId,
    targetUserId: targetUser.id
  };
};

/**
 * Legacy endpoint - redirects to new unified endpoint
 */
const quickCheckIn = async (req, res) => {
  req.body.method = 'quick_checkin';
  return checkIn(req, res);
};

/**
 * Legacy endpoint - redirects to new unified endpoint
 */
const qrCodeCheckIn = async (req, res) => {
  req.body.method = 'gym_qr_scan';
  return checkIn(req, res);
};

/**
 * Legacy endpoint - redirects to new unified endpoint
 */
const uniqueCodeCheckIn = async (req, res) => {
  req.body.method = 'gym_code';
  return checkIn(req, res);
};

/**
 * Legacy endpoint - redirects to new unified endpoint
 */
const ownerScanCheckIn = async (req, res) => {
  req.body.method = 'owner_scan_user';
  return checkIn(req, res);
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

    // Get attendance history
    const attendance = await Attendance.findAll({
      where: {
        userId: userId
      },
      include: [{
        model: Gym,
        as: 'gym'
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
  // New unified endpoints
  checkIn,
  checkOut,
  getCheckInStatus,
  validateLocation,
  getUserAttendance,
  getActiveSession,

  // Legacy endpoints for backward compatibility
  quickCheckIn,
  qrCodeCheckIn,
  uniqueCodeCheckIn,
  ownerScanCheckIn
};
