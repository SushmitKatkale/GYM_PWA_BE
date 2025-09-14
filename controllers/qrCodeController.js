const { 
  GymQRCodes, 
  Gym, 
  User,
  sequelize 
} = require('../models');
const ResponseUtil = require('../utils/response');
const { Op } = require('sequelize');
const crypto = require('crypto');

/**
 * Generate QR code for a gym
 * Only gym owners and admins can generate QR codes
 */
const generateQRCode = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { gymId, purpose, expiresInHours, maxUsage } = req.body;
    const userEmail = req.user.email;
    const userRole = req.user.role; // Updated to use role field
    const userId = req.user.id;

    // Validate required fields
    if (!gymId) {
      await transaction.rollback();
      return ResponseUtil.validationError(res, {
        gymId: 'Gym ID is required'
      });
    }

    // Verify gym exists and user has permission
    const gym = await Gym.findByPk(gymId);
    if (!gym) {
      await transaction.rollback();
      return ResponseUtil.notFoundError(res, 'Gym not found');
    }

    // Authorization check - only gym owner or admin can generate QR codes
    if (userRole !== 4 && gym.owner_id !== req.user.id) { // Updated role value and owner_id field
      await transaction.rollback();
      return ResponseUtil.forbiddenError(res, 'You are not authorized to generate QR codes for this gym');
    }

    // Generate unique QR code
    const qrCode = crypto.randomUUID();
    
    // Calculate expiry date if provided
    let expiresAt = null;
    if (expiresInHours && expiresInHours > 0) {
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);
    }

    // Create QR code record
    const gymQRCode = await GymQRCodes.create({
      gymId,
      qrCode,
      purpose: purpose || 'checkin',
      expiresAt,
      maxUsage: maxUsage || null,
      isActive: true,
      createdBy: userId
    }, { transaction });

    await transaction.commit();

    // Return QR code details
    return ResponseUtil.success(res, {
      qrCode: await gymQRCode.reload({
        include: [{
          model: Gym,
          as: 'gym',
                  }, {
          model: User,
          as: 'creator',
                  }]
      })
    }, 'QR code generated successfully', 201);

  } catch (error) {
    await transaction.rollback();
    console.error('Error generating QR code:', error);
    return ResponseUtil.error(res, 'Failed to generate QR code', 500);
  }
};

/**
 * Get all QR codes for a gym
 * Only gym owners and admins can view QR codes
 */
const getGymQRCodes = async (req, res) => {
  try {
    const { gymId } = req.params;
    const { page = 1, limit = 10, activeOnly = 'true' } = req.query;
    const userEmail = req.user.email;
    const userRole = req.user.role; // Updated to use role field

    // Verify gym exists and user has permission
    const gym = await Gym.findByPk(gymId);
    if (!gym) {
      return ResponseUtil.notFoundError(res, 'Gym not found');
    }

    // Authorization check
    if (userRole !== 4 && gym.owner_id !== req.user.id) { // Updated role value and owner_id field
      return ResponseUtil.forbiddenError(res, 'You are not authorized to view QR codes for this gym');
    }

    const offset = (page - 1) * limit;
    const whereClause = { gymId };

    if (activeOnly === 'true') {
      whereClause.isActive = true;
    }

    const { count, rows } = await GymQRCodes.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'creator',
              }, {
        model: User,
        as: 'updater',
        attributes: ['firstName', 'lastName', 'email'],
        required: false
      }],
      order: [['createdAt', 'DESC']],
      offset,
      limit: parseInt(limit)
    });

    return ResponseUtil.paginated(res, rows, count, parseInt(page), parseInt(limit), 'QR codes retrieved successfully');

  } catch (error) {
    console.error('Error getting gym QR codes:', error);
    return ResponseUtil.error(res, 'Failed to retrieve QR codes', 500);
  }
};

/**
 * Get QR code details by code
 * Used for validation and check-in process
 */
const getQRCodeDetails = async (req, res) => {
  try {
    const { qrCode } = req.params;

    const gymQRCode = await GymQRCodes.findOne({
      where: { qrCode },
      include: [{
        model: Gym,
        as: 'gym',
              }, {
        model: User,
        as: 'creator',
              }]
    });

    if (!gymQRCode) {
      return ResponseUtil.notFoundError(res, 'QR code not found');
    }

    // Check if QR code is expired
    const isExpired = gymQRCode.expiresAt && new Date() > gymQRCode.expiresAt;
    
    // Check if max usage reached
    const isMaxUsageReached = gymQRCode.maxUsage && gymQRCode.usageCount >= gymQRCode.maxUsage;

    return ResponseUtil.success(res, {
      qrCode: gymQRCode,
      isValid: gymQRCode.isActive && !isExpired && !isMaxUsageReached,
      isExpired,
      isMaxUsageReached,
      remainingUsage: gymQRCode.maxUsage ? Math.max(0, gymQRCode.maxUsage - gymQRCode.usageCount) : null
    }, 'QR code details retrieved successfully');

  } catch (error) {
    console.error('Error getting QR code details:', error);
    return ResponseUtil.error(res, 'Failed to retrieve QR code details', 500);
  }
};

/**
 * Update QR code
 * Only gym owners and admins can update QR codes
 */
const updateQRCode = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { qrCodeId } = req.params;
    const { purpose, expiresInHours, maxUsage, isActive } = req.body;
    const userEmail = req.user.email;
    const userRole = req.user.role; // Updated to use role field
    const userId = req.user.id;

    // Find QR code
    const gymQRCode = await GymQRCodes.findByPk(qrCodeId, {
      include: [{
        model: Gym,
        as: 'gym'
      }]
    });

    if (!gymQRCode) {
      await transaction.rollback();
      return ResponseUtil.notFoundError(res, 'QR code not found');
    }

    // Authorization check
    if (userRole !== 4 && gymQRCode.gym.owner_id !== req.user.id) { // Updated role value and owner_id field
      await transaction.rollback();
      return ResponseUtil.forbiddenError(res, 'You are not authorized to update this QR code');
    }

    // Calculate new expiry date if provided
    let expiresAt = gymQRCode.expiresAt;
    if (expiresInHours !== undefined) {
      if (expiresInHours > 0) {
        expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + expiresInHours);
      } else {
        expiresAt = null; // Remove expiry
      }
    }

    // Update QR code
    await gymQRCode.update({
      purpose: purpose || gymQRCode.purpose,
      expiresAt,
      maxUsage: maxUsage !== undefined ? maxUsage : gymQRCode.maxUsage,
      isActive: isActive !== undefined ? isActive : gymQRCode.isActive,
      updatedBy: userId
    }, { transaction });

    await transaction.commit();

    return ResponseUtil.success(res, {
      qrCode: await gymQRCode.reload({
        include: [{
          model: Gym,
          as: 'gym',
                  }, {
          model: User,
          as: 'creator',
                  }, {
          model: User,
          as: 'updater',
                  }]
      })
    }, 'QR code updated successfully');

  } catch (error) {
    await transaction.rollback();
    console.error('Error updating QR code:', error);
    return ResponseUtil.error(res, 'Failed to update QR code', 500);
  }
};

/**
 * Delete (deactivate) QR code
 * Only gym owners and admins can delete QR codes
 */
const deleteQRCode = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { qrCodeId } = req.params;
    const userEmail = req.user.email;
    const userRole = req.user.role; // Updated to use role field

    // Find QR code
    const gymQRCode = await GymQRCodes.findByPk(qrCodeId, {
      include: [{
        model: Gym,
        as: 'gym'
      }]
    });

    if (!gymQRCode) {
      await transaction.rollback();
      return ResponseUtil.notFoundError(res, 'QR code not found');
    }

    // Authorization check
    if (userRole !== 4 && gymQRCode.gym.owner_id !== req.user.id) { // Updated role value and owner_id field
      await transaction.rollback();
      return ResponseUtil.forbiddenError(res, 'You are not authorized to delete this QR code');
    }

    // Deactivate instead of hard delete
    await gymQRCode.update({
      isActive: false,
      updatedBy: req.user.id
    }, { transaction });

    await transaction.commit();

    return ResponseUtil.success(res, {
      message: 'QR code deactivated successfully'
    }, 'QR code deleted successfully');

  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting QR code:', error);
    return ResponseUtil.error(res, 'Failed to delete QR code', 500);
  }
};

/**
 * Get QR code usage statistics
 * Only gym owners and admins can view statistics
 */
const getQRCodeStats = async (req, res) => {
  try {
    const { gymId } = req.params;
    const userEmail = req.user.email;
    const userRole = req.user.role; // Updated to use role field

    // Verify gym exists and user has permission
    const gym = await Gym.findByPk(gymId);
    if (!gym) {
      return ResponseUtil.notFoundError(res, 'Gym not found');
    }

    // Authorization check
    if (userRole !== 4 && gym.owner_id !== req.user.id) { // Updated role value and owner_id field
      return ResponseUtil.forbiddenError(res, 'You are not authorized to view QR code statistics for this gym');
    }

    // Get QR code statistics
    const stats = await GymQRCodes.findAll({
      where: { gymId },
      attributes: [
        'id',
        'qrCode',
        'purpose',
        'usageCount',
        'isActive',
        'createdAt',
        'expiresAt',
        'maxUsage'
      ],
      order: [['usageCount', 'DESC']]
    });

    const summary = {
      totalQRCodes: stats.length,
      activeQRCodes: stats.filter(qr => qr.isActive).length,
      totalUsage: stats.reduce((sum, qr) => sum + qr.usageCount, 0),
      expiredQRCodes: stats.filter(qr => qr.expiresAt && new Date() > qr.expiresAt).length,
      mostUsed: stats.length > 0 ? stats[0] : null
    };

    return ResponseUtil.success(res, {
      summary,
      qrCodes: stats
    }, 'QR code statistics retrieved successfully');

  } catch (error) {
    console.error('Error getting QR code statistics:', error);
    return ResponseUtil.error(res, 'Failed to retrieve QR code statistics', 500);
  }
};

module.exports = {
  generateQRCode,
  getGymQRCodes,
  getQRCodeDetails,
  updateQRCode,
  deleteQRCode,
  getQRCodeStats
};
