const { 
  GymCheckInMethods, 
  Gym, 
  User,
  sequelize 
} = require('../models');
const ResponseUtil = require('../utils/response');

/**
 * Get check-in methods configuration for a gym
 * Only gym owners and admins can view configuration
 */
const getGymCheckInMethods = async (req, res) => {
  try {
    const { gymId } = req.params;
    const userEmail = req.user.email;
    const userRole = req.user.role; // Updated to use role field

    // Verify gym exists and user has permission
    const gym = await Gym.findByPk(gymId);
    if (!gym) {
      return ResponseUtil.notFoundError(res, 'Gym not found');
    }

    // Authorization check - updated to use role and owner_id
    if (userRole !== 4 && gym.owner_id !== req.user.id) { // Updated role value and owner_id field
      return ResponseUtil.forbiddenError(res, 'You are not authorized to view check-in methods for this gym');
    }

    // Get check-in methods configuration
    let checkInMethods = await GymCheckInMethods.findOne({
      where: { gymId },
      include: [{
        model: Gym,
        as: 'gym',
              }]
    });

    // If no configuration exists, create default one
    if (!checkInMethods) {
      checkInMethods = await GymCheckInMethods.create({
        gymId,
        quickCheckInEnabled: true,
        qrCodeEnabled: true,
        uniqueCodeEnabled: true,
        ownerScanEnabled: true,
        biometricEnabled: false,
        checkInRadius: 100,
        qrCodeLocationRequired: true,
        uniqueCodeLocationRequired: true,
        allowSimultaneousCheckIns: false,
        maxCheckInDuration: 480, // 8 hours
        autoCheckOut: true,
        locationAccuracyRequired: 50,
        notifications: {
          checkInNotification: true,
          checkOutNotification: true,
          occupancyAlerts: true
        }
      });

      checkInMethods = await checkInMethods.reload({
        include: [{
          model: Gym,
          as: 'gym',
                  }]
      });
    }

    return ResponseUtil.success(res, checkInMethods, 'Check-in methods configuration retrieved successfully');

  } catch (error) {
    console.error('Error getting gym check-in methods:', error);
    return ResponseUtil.error(res, 'Failed to retrieve check-in methods configuration', 500);
  }
};

/**
 * Update check-in methods configuration for a gym
 * Only gym owners and admins can update configuration
 */
const updateGymCheckInMethods = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { gymId } = req.params;
    const {
      quickCheckInEnabled,
      qrCodeEnabled,
      uniqueCodeEnabled,
      ownerScanEnabled,
      biometricEnabled,
      checkInRadius,
      qrCodeLocationRequired,
      uniqueCodeLocationRequired,
      allowSimultaneousCheckIns,
      maxCheckInDuration,
      autoCheckOut,
      locationAccuracyRequired,
      notifications
    } = req.body;
    const userEmail = req.user.email;
    const userRole = req.user.role; // Updated to use role field
    const userId = req.user.id;

    // Verify gym exists and user has permission
    const gym = await Gym.findByPk(gymId);
    if (!gym) {
      await transaction.rollback();
      return ResponseUtil.notFoundError(res, 'Gym not found');
    }

    // Authorization check - updated to use role and owner_id
    if (userRole !== 4 && gym.owner_id !== req.user.id) { // Updated role value and owner_id field
      await transaction.rollback();
      return ResponseUtil.forbiddenError(res, 'You are not authorized to update check-in methods for this gym');
    }

    // Validate check-in radius
    if (checkInRadius !== undefined && (checkInRadius < 10 || checkInRadius > 1000)) {
      await transaction.rollback();
      return ResponseUtil.validationError(res, {
        checkInRadius: 'Check-in radius must be between 10 and 1000 meters'
      });
    }

    // Validate max check-in duration
    if (maxCheckInDuration !== undefined && (maxCheckInDuration < 60 || maxCheckInDuration > 1440)) {
      await transaction.rollback();
      return ResponseUtil.validationError(res, {
        maxCheckInDuration: 'Max check-in duration must be between 60 minutes (1 hour) and 1440 minutes (24 hours)'
      });
    }

    // Validate location accuracy
    if (locationAccuracyRequired !== undefined && (locationAccuracyRequired < 5 || locationAccuracyRequired > 500)) {
      await transaction.rollback();
      return ResponseUtil.validationError(res, {
        locationAccuracyRequired: 'Location accuracy must be between 5 and 500 meters'
      });
    }

    // Find or create check-in methods configuration
    let checkInMethods = await GymCheckInMethods.findOne({
      where: { gymId }
    });

    const updateData = {};

    // Only update provided fields
    if (quickCheckInEnabled !== undefined) updateData.quickCheckInEnabled = quickCheckInEnabled;
    if (qrCodeEnabled !== undefined) updateData.qrCodeEnabled = qrCodeEnabled;
    if (uniqueCodeEnabled !== undefined) updateData.uniqueCodeEnabled = uniqueCodeEnabled;
    if (ownerScanEnabled !== undefined) updateData.ownerScanEnabled = ownerScanEnabled;
    if (biometricEnabled !== undefined) updateData.biometricEnabled = biometricEnabled;
    if (checkInRadius !== undefined) updateData.checkInRadius = checkInRadius;
    if (qrCodeLocationRequired !== undefined) updateData.qrCodeLocationRequired = qrCodeLocationRequired;
    if (uniqueCodeLocationRequired !== undefined) updateData.uniqueCodeLocationRequired = uniqueCodeLocationRequired;
    if (allowSimultaneousCheckIns !== undefined) updateData.allowSimultaneousCheckIns = allowSimultaneousCheckIns;
    if (maxCheckInDuration !== undefined) updateData.maxCheckInDuration = maxCheckInDuration;
    if (autoCheckOut !== undefined) updateData.autoCheckOut = autoCheckOut;
    if (locationAccuracyRequired !== undefined) updateData.locationAccuracyRequired = locationAccuracyRequired;
    if (notifications !== undefined) updateData.notifications = notifications;

    if (checkInMethods) {
      // Update existing configuration
      updateData.updatedBy = userId;
      await checkInMethods.update(updateData, { transaction });
    } else {
      // Create new configuration with defaults
      checkInMethods = await GymCheckInMethods.create({
        gymId,
        quickCheckInEnabled: quickCheckInEnabled !== undefined ? quickCheckInEnabled : true,
        qrCodeEnabled: qrCodeEnabled !== undefined ? qrCodeEnabled : true,
        uniqueCodeEnabled: uniqueCodeEnabled !== undefined ? uniqueCodeEnabled : true,
        ownerScanEnabled: ownerScanEnabled !== undefined ? ownerScanEnabled : true,
        biometricEnabled: biometricEnabled !== undefined ? biometricEnabled : false,
        checkInRadius: checkInRadius !== undefined ? checkInRadius : 100,
        qrCodeLocationRequired: qrCodeLocationRequired !== undefined ? qrCodeLocationRequired : true,
        uniqueCodeLocationRequired: uniqueCodeLocationRequired !== undefined ? uniqueCodeLocationRequired : true,
        allowSimultaneousCheckIns: allowSimultaneousCheckIns !== undefined ? allowSimultaneousCheckIns : false,
        maxCheckInDuration: maxCheckInDuration !== undefined ? maxCheckInDuration : 480,
        autoCheckOut: autoCheckOut !== undefined ? autoCheckOut : true,
        locationAccuracyRequired: locationAccuracyRequired !== undefined ? locationAccuracyRequired : 50,
        notifications: notifications || {
          checkInNotification: true,
          checkOutNotification: true,
          occupancyAlerts: true
        },
        createdBy: userId
      }, { transaction });
    }

    await transaction.commit();

    // Return updated configuration
    const updatedCheckInMethods = await checkInMethods.reload({
      include: [{
        model: Gym,
        as: 'gym',
              }]
    });

    return ResponseUtil.success(res, updatedCheckInMethods, 'Check-in methods configuration updated successfully');

  } catch (error) {
    await transaction.rollback();
    console.error('Error updating gym check-in methods:', error);
    return ResponseUtil.error(res, 'Failed to update check-in methods configuration', 500);
  }
};

/**
 * Get available check-in methods for a gym (public endpoint for users)
 * This endpoint shows which methods are enabled without sensitive configuration details
 */
const getAvailableCheckInMethods = async (req, res) => {
  try {
    const { gymId } = req.params;

    // Verify gym exists
    const gym = await Gym.findByPk(gymId, {
          });

    if (!gym) {
      return ResponseUtil.notFoundError(res, 'Gym not found');
    }

    // Get check-in methods configuration
    const checkInMethods = await GymCheckInMethods.findOne({
      where: { gymId },
          });

    // Return default configuration if none exists
    const availableMethods = checkInMethods || {
      quickCheckInEnabled: true,
      qrCodeEnabled: true,
      uniqueCodeEnabled: true,
      ownerScanEnabled: true,
      biometricEnabled: false,
      checkInRadius: 100,
      qrCodeLocationRequired: true,
      uniqueCodeLocationRequired: true,
      allowSimultaneousCheckIns: false,
      locationAccuracyRequired: 50
    };

    return ResponseUtil.success(res, {
      gym,
      methods: availableMethods
    }, 'Available check-in methods retrieved successfully');

  } catch (error) {
    console.error('Error getting available check-in methods:', error);
    return ResponseUtil.error(res, 'Failed to retrieve available check-in methods', 500);
  }
};

/**
 * Reset check-in methods to defaults
 * Only gym owners and admins can reset configuration
 */
const resetGymCheckInMethods = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { gymId } = req.params;
    const userEmail = req.user.email;
    const userRole = req.user.role; // Updated to use role field
    const userId = req.user.id;

    // Verify gym exists and user has permission
    const gym = await Gym.findByPk(gymId);
    if (!gym) {
      await transaction.rollback();
      return ResponseUtil.notFoundError(res, 'Gym not found');
    }

    // Authorization check - updated to use role and owner_id
    if (userRole !== 4 && gym.owner_id !== req.user.id) { // Updated role value and owner_id field
      await transaction.rollback();
      return ResponseUtil.forbiddenError(res, 'You are not authorized to reset check-in methods for this gym');
    }

    // Find existing configuration
    let checkInMethods = await GymCheckInMethods.findOne({
      where: { gymId }
    });

    const defaultConfig = {
      quickCheckInEnabled: true,
      qrCodeEnabled: true,
      uniqueCodeEnabled: true,
      ownerScanEnabled: true,
      biometricEnabled: false,
      checkInRadius: 100,
      qrCodeLocationRequired: true,
      uniqueCodeLocationRequired: true,
      allowSimultaneousCheckIns: false,
      maxCheckInDuration: 480,
      autoCheckOut: true,
      locationAccuracyRequired: 50,
      notifications: {
        checkInNotification: true,
        checkOutNotification: true,
        occupancyAlerts: true
      },
      updatedBy: userId
    };

    if (checkInMethods) {
      // Update existing with defaults
      await checkInMethods.update(defaultConfig, { transaction });
    } else {
      // Create new with defaults
      checkInMethods = await GymCheckInMethods.create({
        gymId,
        ...defaultConfig,
        createdBy: userId
      }, { transaction });
    }

    await transaction.commit();

    // Return reset configuration
    const resetCheckInMethods = await checkInMethods.reload({
      include: [{
        model: Gym,
        as: 'gym',
              }]
    });

    return ResponseUtil.success(res, resetCheckInMethods, 'Check-in methods configuration reset to defaults successfully');

  } catch (error) {
    await transaction.rollback();
    console.error('Error resetting gym check-in methods:', error);
    return ResponseUtil.error(res, 'Failed to reset check-in methods configuration', 500);
  }
};

/**
 * Validate check-in method configuration
 * Checks if configuration is valid and provides recommendations
 */
const validateCheckInConfiguration = async (req, res) => {
  try {
    const { gymId } = req.params;
    const userEmail = req.user.email;
    const userRole = req.user.role; // Updated to use role field

    // Verify gym exists and user has permission
    const gym = await Gym.findByPk(gymId);
    if (!gym) {
      return ResponseUtil.notFoundError(res, 'Gym not found');
    }

    // Authorization check - updated to use role and owner_id
    if (userRole !== 4 && gym.owner_id !== req.user.id) { // Updated role value and owner_id field
      return ResponseUtil.forbiddenError(res, 'You are not authorized to validate check-in configuration for this gym');
    }

    // Get check-in methods configuration
    const checkInMethods = await GymCheckInMethods.findOne({
      where: { gymId }
    });

    if (!checkInMethods) {
      return ResponseUtil.success(res, {
        isValid: false,
        warnings: ['No check-in methods configuration found'],
        recommendations: ['Create check-in methods configuration with default settings']
      }, 'Configuration validation completed');
    }

    const warnings = [];
    const recommendations = [];

    // Validate if at least one method is enabled
    const enabledMethods = [
      checkInMethods.quickCheckInEnabled,
      checkInMethods.qrCodeEnabled,
      checkInMethods.uniqueCodeEnabled,
      checkInMethods.ownerScanEnabled,
      checkInMethods.biometricEnabled
    ];

    if (!enabledMethods.some(method => method)) {
      warnings.push('No check-in methods are enabled');
      recommendations.push('Enable at least one check-in method');
    }

    // Check radius settings
    if (checkInMethods.checkInRadius < 50) {
      warnings.push('Check-in radius is very small - may cause location issues');
      recommendations.push('Consider increasing check-in radius to at least 50 meters');
    }

    if (checkInMethods.checkInRadius > 500) {
      warnings.push('Check-in radius is very large - may allow check-ins from far distances');
      recommendations.push('Consider reducing check-in radius to under 500 meters');
    }

    // Check location accuracy
    if (checkInMethods.locationAccuracyRequired > 100) {
      warnings.push('Location accuracy requirement is high - may exclude users with less accurate GPS');
      recommendations.push('Consider reducing location accuracy requirement to 100 meters or less');
    }

    // Check max duration
    if (checkInMethods.maxCheckInDuration > 720) { // 12 hours
      warnings.push('Maximum check-in duration is very long');
      recommendations.push('Consider setting max check-in duration to 12 hours or less');
    }

    // Check location requirements
    if (checkInMethods.qrCodeEnabled && !checkInMethods.qrCodeLocationRequired) {
      recommendations.push('Consider enabling location validation for QR code check-ins for better security');
    }

    if (checkInMethods.uniqueCodeEnabled && !checkInMethods.uniqueCodeLocationRequired) {
      recommendations.push('Consider enabling location validation for unique code check-ins for better security');
    }

    const isValid = warnings.length === 0;

    return ResponseUtil.success(res, {
      isValid,
      warnings,
      recommendations,
      configuration: checkInMethods
    }, 'Configuration validation completed');

  } catch (error) {
    console.error('Error validating check-in configuration:', error);
    return ResponseUtil.error(res, 'Failed to validate check-in configuration', 500);
  }
};

module.exports = {
  getGymCheckInMethods,
  updateGymCheckInMethods,
  getAvailableCheckInMethods,
  resetGymCheckInMethods,
  validateCheckInConfiguration
};
