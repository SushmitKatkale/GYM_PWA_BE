const { 
  GymUniqueCodes, 
  Gym, 
  User,
  sequelize 
} = require('../models');
const ResponseUtil = require('../utils/response');
const { Op } = require('sequelize');

/**
 * Generate unique code for a gym
 * Only gym owners and admins can generate unique codes
 */
const generateUniqueCode = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { gymId, codeLength = 6, expiresInHours, maxUsage, customCode } = req.body;
    const userEmail = req.user.email;
    const userType = req.user.type;
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

    // Authorization check - only gym owner or admin can generate unique codes
    if (userType !== '3' && gym.ownerId !== userEmail) {
      await transaction.rollback();
      return ResponseUtil.forbiddenError(res, 'You are not authorized to generate unique codes for this gym');
    }

    // Generate or use custom unique code
    let uniqueCode;
    if (customCode) {
      // Validate custom code format (alphanumeric, 4-10 characters)
      if (!/^[A-Z0-9]{4,10}$/.test(customCode.toUpperCase())) {
        await transaction.rollback();
        return ResponseUtil.validationError(res, {
          customCode: 'Custom code must be 4-10 alphanumeric characters'
        });
      }

      uniqueCode = customCode.toUpperCase();

      // Check if custom code already exists
      const existingCode = await GymUniqueCodes.findOne({
        where: {
          uniqueCode,
          isActive: true
        }
      });

      if (existingCode) {
        await transaction.rollback();
        return ResponseUtil.conflictError(res, 'This unique code already exists');
      }
    } else {
      // Generate random code
      const length = Math.max(4, Math.min(10, codeLength));
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      
      let attempts = 0;
      const maxAttempts = 10;
      
      do {
        uniqueCode = '';
        for (let i = 0; i < length; i++) {
          uniqueCode += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        
        const existingCode = await GymUniqueCodes.findOne({
          where: {
            uniqueCode,
            isActive: true
          }
        });
        
        if (!existingCode) break;
        
        attempts++;
      } while (attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        await transaction.rollback();
        return ResponseUtil.error(res, 'Unable to generate unique code. Please try again.', 500);
      }
    }
    
    // Calculate expiry date if provided
    let expiresAt = null;
    if (expiresInHours && expiresInHours > 0) {
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);
    }

    // Create unique code record
    const gymUniqueCode = await GymUniqueCodes.create({
      gymId,
      uniqueCode,
      expiresAt,
      maxUsage: maxUsage || null,
      isActive: true,
      createdBy: userId
    }, { transaction });

    await transaction.commit();

    // Return unique code details
    return ResponseUtil.success(res, {
      uniqueCode: await gymUniqueCode.reload({
        include: [{
          model: Gym,
          as: 'gym',
          attributes: ['id', 'name', 'address']
        }, {
          model: User,
          as: 'creator',
          attributes: ['firstName', 'lastName', 'email']
        }]
      })
    }, 'Unique code generated successfully', 201);

  } catch (error) {
    await transaction.rollback();
    console.error('Error generating unique code:', error);
    return ResponseUtil.error(res, 'Failed to generate unique code', 500);
  }
};

/**
 * Get all unique codes for a gym
 * Only gym owners and admins can view unique codes
 */
const getGymUniqueCodes = async (req, res) => {
  try {
    const { gymId } = req.params;
    const { page = 1, limit = 10, activeOnly = 'true' } = req.query;
    const userEmail = req.user.email;
    const userType = req.user.type;

    // Verify gym exists and user has permission
    const gym = await Gym.findByPk(gymId);
    if (!gym) {
      return ResponseUtil.notFoundError(res, 'Gym not found');
    }

    // Authorization check
    if (userType !== '3' && gym.ownerId !== userEmail) {
      return ResponseUtil.forbiddenError(res, 'You are not authorized to view unique codes for this gym');
    }

    const offset = (page - 1) * limit;
    const whereClause = { gymId };

    if (activeOnly === 'true') {
      whereClause.isActive = true;
    }

    const { count, rows } = await GymUniqueCodes.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['firstName', 'lastName', 'email']
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

    return ResponseUtil.paginated(res, rows, count, parseInt(page), parseInt(limit), 'Unique codes retrieved successfully');

  } catch (error) {
    console.error('Error getting gym unique codes:', error);
    return ResponseUtil.error(res, 'Failed to retrieve unique codes', 500);
  }
};

/**
 * Get unique code details by code
 * Used for validation and check-in process
 */
const getUniqueCodeDetails = async (req, res) => {
  try {
    const { uniqueCode } = req.params;

    const gymUniqueCode = await GymUniqueCodes.findOne({
      where: { uniqueCode: uniqueCode.toUpperCase() },
      include: [{
        model: Gym,
        as: 'gym',
        attributes: ['id', 'name', 'address', 'latitude', 'longitude']
      }, {
        model: User,
        as: 'creator',
        attributes: ['firstName', 'lastName', 'email']
      }]
    });

    if (!gymUniqueCode) {
      return ResponseUtil.notFoundError(res, 'Unique code not found');
    }

    // Check if unique code is expired
    const isExpired = gymUniqueCode.expiresAt && new Date() > gymUniqueCode.expiresAt;
    
    // Check if max usage reached
    const isMaxUsageReached = gymUniqueCode.maxUsage && gymUniqueCode.usageCount >= gymUniqueCode.maxUsage;

    return ResponseUtil.success(res, {
      uniqueCode: gymUniqueCode,
      isValid: gymUniqueCode.isActive && !isExpired && !isMaxUsageReached,
      isExpired,
      isMaxUsageReached,
      remainingUsage: gymUniqueCode.maxUsage ? Math.max(0, gymUniqueCode.maxUsage - gymUniqueCode.usageCount) : null
    }, 'Unique code details retrieved successfully');

  } catch (error) {
    console.error('Error getting unique code details:', error);
    return ResponseUtil.error(res, 'Failed to retrieve unique code details', 500);
  }
};

/**
 * Update unique code
 * Only gym owners and admins can update unique codes
 */
const updateUniqueCode = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { uniqueCodeId } = req.params;
    const { expiresInHours, maxUsage, isActive } = req.body;
    const userEmail = req.user.email;
    const userType = req.user.type;
    const userId = req.user.id;

    // Find unique code
    const gymUniqueCode = await GymUniqueCodes.findByPk(uniqueCodeId, {
      include: [{
        model: Gym,
        as: 'gym'
      }]
    });

    if (!gymUniqueCode) {
      await transaction.rollback();
      return ResponseUtil.notFoundError(res, 'Unique code not found');
    }

    // Authorization check
    if (userType !== '3' && gymUniqueCode.gym.ownerId !== userEmail) {
      await transaction.rollback();
      return ResponseUtil.forbiddenError(res, 'You are not authorized to update this unique code');
    }

    // Calculate new expiry date if provided
    let expiresAt = gymUniqueCode.expiresAt;
    if (expiresInHours !== undefined) {
      if (expiresInHours > 0) {
        expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + expiresInHours);
      } else {
        expiresAt = null; // Remove expiry
      }
    }

    // Update unique code
    await gymUniqueCode.update({
      expiresAt,
      maxUsage: maxUsage !== undefined ? maxUsage : gymUniqueCode.maxUsage,
      isActive: isActive !== undefined ? isActive : gymUniqueCode.isActive,
      updatedBy: userId
    }, { transaction });

    await transaction.commit();

    return ResponseUtil.success(res, {
      uniqueCode: await gymUniqueCode.reload({
        include: [{
          model: Gym,
          as: 'gym',
          attributes: ['id', 'name', 'address']
        }, {
          model: User,
          as: 'creator',
          attributes: ['firstName', 'lastName', 'email']
        }, {
          model: User,
          as: 'updater',
          attributes: ['firstName', 'lastName', 'email']
        }]
      })
    }, 'Unique code updated successfully');

  } catch (error) {
    await transaction.rollback();
    console.error('Error updating unique code:', error);
    return ResponseUtil.error(res, 'Failed to update unique code', 500);
  }
};

/**
 * Delete (deactivate) unique code
 * Only gym owners and admins can delete unique codes
 */
const deleteUniqueCode = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { uniqueCodeId } = req.params;
    const userEmail = req.user.email;
    const userType = req.user.type;

    // Find unique code
    const gymUniqueCode = await GymUniqueCodes.findByPk(uniqueCodeId, {
      include: [{
        model: Gym,
        as: 'gym'
      }]
    });

    if (!gymUniqueCode) {
      await transaction.rollback();
      return ResponseUtil.notFoundError(res, 'Unique code not found');
    }

    // Authorization check
    if (userType !== '3' && gymUniqueCode.gym.ownerId !== userEmail) {
      await transaction.rollback();
      return ResponseUtil.forbiddenError(res, 'You are not authorized to delete this unique code');
    }

    // Deactivate instead of hard delete
    await gymUniqueCode.update({
      isActive: false,
      updatedBy: req.user.id
    }, { transaction });

    await transaction.commit();

    return ResponseUtil.success(res, {
      message: 'Unique code deactivated successfully'
    }, 'Unique code deleted successfully');

  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting unique code:', error);
    return ResponseUtil.error(res, 'Failed to delete unique code', 500);
  }
};

/**
 * Get unique code usage statistics
 * Only gym owners and admins can view statistics
 */
const getUniqueCodeStats = async (req, res) => {
  try {
    const { gymId } = req.params;
    const userEmail = req.user.email;
    const userType = req.user.type;

    // Verify gym exists and user has permission
    const gym = await Gym.findByPk(gymId);
    if (!gym) {
      return ResponseUtil.notFoundError(res, 'Gym not found');
    }

    // Authorization check
    if (userType !== '3' && gym.ownerId !== userEmail) {
      return ResponseUtil.forbiddenError(res, 'You are not authorized to view unique code statistics for this gym');
    }

    // Get unique code statistics
    const stats = await GymUniqueCodes.findAll({
      where: { gymId },
      attributes: [
        'id',
        'uniqueCode',
        'usageCount',
        'isActive',
        'createdAt',
        'expiresAt',
        'maxUsage'
      ],
      order: [['usageCount', 'DESC']]
    });

    const summary = {
      totalUniqueCodes: stats.length,
      activeUniqueCodes: stats.filter(code => code.isActive).length,
      totalUsage: stats.reduce((sum, code) => sum + code.usageCount, 0),
      expiredUniqueCodes: stats.filter(code => code.expiresAt && new Date() > code.expiresAt).length,
      mostUsed: stats.length > 0 ? stats[0] : null
    };

    return ResponseUtil.success(res, {
      summary,
      uniqueCodes: stats
    }, 'Unique code statistics retrieved successfully');

  } catch (error) {
    console.error('Error getting unique code statistics:', error);
    return ResponseUtil.error(res, 'Failed to retrieve unique code statistics', 500);
  }
};

/**
 * Bulk generate unique codes for a gym
 * Only gym owners and admins can bulk generate unique codes
 */
const bulkGenerateUniqueCodes = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { gymId, count = 10, codeLength = 6, expiresInHours, maxUsage } = req.body;
    const userEmail = req.user.email;
    const userType = req.user.type;
    const userId = req.user.id;

    // Validate required fields
    if (!gymId) {
      await transaction.rollback();
      return ResponseUtil.validationError(res, {
        gymId: 'Gym ID is required'
      });
    }

    if (count > 100) {
      await transaction.rollback();
      return ResponseUtil.validationError(res, {
        count: 'Cannot generate more than 100 codes at once'
      });
    }

    // Verify gym exists and user has permission
    const gym = await Gym.findByPk(gymId);
    if (!gym) {
      await transaction.rollback();
      return ResponseUtil.notFoundError(res, 'Gym not found');
    }

    // Authorization check
    if (userType !== '3' && gym.ownerId !== userEmail) {
      await transaction.rollback();
      return ResponseUtil.forbiddenError(res, 'You are not authorized to generate unique codes for this gym');
    }

    // Calculate expiry date if provided
    let expiresAt = null;
    if (expiresInHours && expiresInHours > 0) {
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);
    }

    const codes = [];
    const length = Math.max(4, Math.min(10, codeLength));
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    // Generate unique codes
    const generatedCodes = new Set();
    for (let i = 0; i < count; i++) {
      let uniqueCode;
      let attempts = 0;
      const maxAttempts = 20;

      do {
        uniqueCode = '';
        for (let j = 0; j < length; j++) {
          uniqueCode += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        attempts++;
      } while ((generatedCodes.has(uniqueCode) || await GymUniqueCodes.findOne({
        where: { uniqueCode, isActive: true }
      })) && attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        await transaction.rollback();
        return ResponseUtil.error(res, `Unable to generate unique code ${i + 1}. Please try again with shorter batch.`, 500);
      }

      generatedCodes.add(uniqueCode);
      codes.push({
        gymId,
        uniqueCode,
        expiresAt,
        maxUsage: maxUsage || null,
        isActive: true,
        createdBy: userId
      });
    }

    // Bulk create codes
    const createdCodes = await GymUniqueCodes.bulkCreate(codes, { transaction });

    await transaction.commit();

    return ResponseUtil.success(res, {
      count: createdCodes.length,
      codes: createdCodes.map(code => ({
        id: code.id,
        uniqueCode: code.uniqueCode,
        expiresAt: code.expiresAt,
        maxUsage: code.maxUsage
      }))
    }, `${createdCodes.length} unique codes generated successfully`, 201);

  } catch (error) {
    await transaction.rollback();
    console.error('Error bulk generating unique codes:', error);
    return ResponseUtil.error(res, 'Failed to bulk generate unique codes', 500);
  }
};

module.exports = {
  generateUniqueCode,
  getGymUniqueCodes,
  getUniqueCodeDetails,
  updateUniqueCode,
  deleteUniqueCode,
  getUniqueCodeStats,
  bulkGenerateUniqueCodes
};
