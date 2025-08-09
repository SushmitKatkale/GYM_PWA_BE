const { VendorPaymentConfig, Gym, User } = require('../models');
const razorpayVendorService = require('../services/razorpayVendorService');
const ResponseUtil = require('../utils/response');

/**
 * Create vendor payment configuration
 */
async function createVendorConfig(req, res) {
  try {
    const { ownerEmail, gymId, cutValue, cutType } = req.body;
    
    // Validate input
    if (!ownerEmail || !gymId || !cutValue || !cutType) {
      return ResponseUtil.error(res, 'All fields are required', 400);
    }

    // Validate owner and gym exist
    const owner = await User.findOne({ where: { email: ownerEmail, type: '2' } });
    if (!owner) {
      return ResponseUtil.notFoundError(res, 'Owner not found or invalid owner type');
    }

    const gym = await Gym.findByPk(gymId);
    if (!gym) {
      return ResponseUtil.notFoundError(res, 'Gym not found');
    }

    // Check if configuration already exists
    const existingConfig = await VendorPaymentConfig.findOne({
      where: { ownerEmail, gymId }
    });

    let vendorConfig;
    let isUpdate = false;

    if (existingConfig) {
      // Update existing configuration
      await existingConfig.update({
        cutValue,
        cutType,
        updatedBy: req.user.email
      });
      vendorConfig = existingConfig;
      isUpdate = true;
    } else {
      // Create new vendor configuration
      vendorConfig = await VendorPaymentConfig.create({
        ownerEmail,
        gymId,
        cutValue,
        cutType,
        createdBy: req.user.email
      });
    }

    const message = isUpdate 
      ? 'Vendor configuration updated successfully'
      : 'Vendor configuration created successfully';
    const statusCode = isUpdate ? 200 : 201;

    return ResponseUtil.success(res, vendorConfig, message, statusCode);
  } catch (error) {
    console.error('Error creating vendor config:', error);
    return ResponseUtil.error(res, 'Failed to create vendor configuration', 500);
  }
}

/**
 * Get all vendor configurations
 */
async function getAllVendorConfigs(req, res) {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      razorpayActive, 
      kycStatus, 
      razorpayVendorId, 
      ownerEmail, 
      gymName,
      activeStatus, // Filter by active status (optional)
      search // Combined search for gym name or owner email
    } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    const includeClause = [
      {
        model: Gym,
        as: 'gym',
        attributes: ['id', 'name', 'address', 'city'],
        where: {} // Will be populated if gymName filter is provided
      }
    ];

    // Apply filters
    if (status) {
      whereClause.onboardingStatus = status;
    }
    
    if (razorpayActive !== undefined) {
      whereClause.isRazorpayActive = razorpayActive === 'true';
    }
    
    if (kycStatus) {
      whereClause.kycStatus = kycStatus;
    }
    
    if (activeStatus !== undefined) {
      whereClause.activeStatus = activeStatus === 'true';
    }
    
    if (razorpayVendorId) {
      // Support partial matching for Razorpay Vendor ID
      const { Op } = require('sequelize');
      whereClause.razorpayVendorId = {
        [Op.like]: `%${razorpayVendorId}%`
      };
    }
    
    if (ownerEmail) {
      // Support partial matching for owner email
      const { Op } = require('sequelize');
      whereClause.ownerEmail = {
        [Op.like]: `%${ownerEmail}%`
      };
    }
    
    if (gymName) {
      // Apply gym name filter to the include
      const { Op } = require('sequelize');
      includeClause[0].where.name = {
        [Op.like]: `%${gymName}%`
      };
      // Make the include required when filtering by gym name
      includeClause[0].required = true;
    } else {
      // Remove empty where clause if no gym name filter
      delete includeClause[0].where;
    }

    console.log('🔍 Vendor config filters applied:', {
      whereClause,
      includeClause,
      queryParams: req.query
    });

    const vendorConfigs = await VendorPaymentConfig.findAndCountAll({
      where: whereClause,
      include: includeClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createTimestamp', 'DESC']],
      distinct: true // Important when using includes with potential duplicates
    });

    return ResponseUtil.success(res, {
      configs: vendorConfigs.rows,
      pagination: {
        total: vendorConfigs.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(vendorConfigs.count / limit)
      }
    }, 'Vendor configurations retrieved successfully');
  } catch (error) {
    console.error('Error getting vendor configs:', error);
    return ResponseUtil.error(res, 'Failed to retrieve vendor configurations', 500);
  }
}

/**
 * Get vendor configuration by ID
 */
async function getVendorConfig(req, res) {
  try {
    const { id } = req.params;

    const vendorConfig = await VendorPaymentConfig.findByPk(id, {
      include: [
        {
          model: Gym,
          as: 'gym',
          attributes: ['id', 'name', 'address', 'city']
        }
      ]
    });

    if (!vendorConfig) {
      return ResponseUtil.notFoundError(res, 'Vendor configuration not found');
    }

    return ResponseUtil.success(res, vendorConfig, 'Vendor configuration retrieved successfully');
  } catch (error) {
    console.error('Error getting vendor config:', error);
    return ResponseUtil.error(res, 'Failed to retrieve vendor configuration', 500);
  }
}

/**
 * Update vendor configuration
 */
async function updateVendorConfig(req, res) {
  try {
    const { id } = req.params;
    const { cutValue, cutType } = req.body;

    const vendorConfig = await VendorPaymentConfig.findByPk(id);
    if (!vendorConfig) {
      return ResponseUtil.notFoundError(res, 'Vendor configuration not found');
    }

    await vendorConfig.update({
      cutValue: cutValue || vendorConfig.cutValue,
      cutType: cutType || vendorConfig.cutType,
      updatedBy: req.user.email
    });

    return ResponseUtil.success(res, vendorConfig, 'Vendor configuration updated successfully');
  } catch (error) {
    console.error('Error updating vendor config:', error);
    return ResponseUtil.error(res, 'Failed to update vendor configuration', 500);
  }
}

/**
 * Onboard vendor to Razorpay
 */
async function onboardVendor(req, res) {
  try {
    const { id } = req.params;
    const { bankDetails } = req.body;

    if (!bankDetails || !bankDetails.accountNumber || !bankDetails.ifsc || !bankDetails.accountHolderName || !bankDetails.pan) {
      return ResponseUtil.error(res, 'Complete bank details are required', 400);
    }

    const result = await razorpayVendorService.onboardVendor(id, bankDetails);
    return ResponseUtil.success(res, result, 'Vendor onboarded successfully');
  } catch (error) {
    console.error('Error onboarding vendor:', error);
    return ResponseUtil.error(res, error.message, 500);
  }
}

/**
 * Check vendor account status
 */
async function checkVendorStatus(req, res) {
  try {
    const { id } = req.params;
    
    const vendorConfig = await VendorPaymentConfig.findByPk(id);
    if (!vendorConfig || !vendorConfig.razorpayVendorId) {
      return ResponseUtil.notFoundError(res, 'Vendor not found or not onboarded');
    }

    const status = await razorpayVendorService.checkVendorAccountStatus(vendorConfig.razorpayVendorId);
    return ResponseUtil.success(res, status, 'Vendor status retrieved successfully');
  } catch (error) {
    console.error('Error checking vendor status:', error);
    return ResponseUtil.error(res, error.message, 500);
  }
}

/**
 * Update vendor configuration with all fields (comprehensive update)
 */
async function updateVendorConfigComplete(req, res) {
  try {
    const { id } = req.params;
    const {
      razorpayVendorId,
      cutValue,
      cutType,
      isRazorpayActive,
      onboardingStatus,
      onboardingDate,
      bankAccountVerified,
      kycStatus,
      activeStatus,
      razorpayBankAccountId,
      razorpayStakeholderId,
      updatedBy
    } = req.body;

    console.log('📝 Update request received for vendor config ID:', id);
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));

    const vendorConfig = await VendorPaymentConfig.findByPk(id);
    if (!vendorConfig) {
      return ResponseUtil.notFoundError(res, 'Vendor configuration not found');
    }

    console.log('📝 Current vendor config:', JSON.stringify(vendorConfig.toJSON(), null, 2));

    // Prepare update data - only include fields that are provided
    const updateData = {
      updatedBy: updatedBy || req.user.email
    };

    // Commission fields
    if (cutValue !== undefined) {
      updateData.cutValue = parseFloat(cutValue);
      console.log('📝 Setting cutValue:', updateData.cutValue);
    }
    if (cutType !== undefined) {
      updateData.cutType = cutType;
      console.log('📝 Setting cutType:', updateData.cutType);
    }

    // Razorpay integration fields
    if (razorpayVendorId !== undefined) {
      updateData.razorpayVendorId = razorpayVendorId || null;
      console.log('📝 Setting razorpayVendorId:', updateData.razorpayVendorId);
    }
    if (razorpayBankAccountId !== undefined) {
      updateData.razorpayBankAccountId = razorpayBankAccountId || null;
      console.log('📝 Setting razorpayBankAccountId:', updateData.razorpayBankAccountId);
    }
    if (razorpayStakeholderId !== undefined) {
      updateData.razorpayStakeholderId = razorpayStakeholderId || null;
      console.log('📝 Setting razorpayStakeholderId:', updateData.razorpayStakeholderId);
    }
    if (isRazorpayActive !== undefined) {
      updateData.isRazorpayActive = Boolean(isRazorpayActive);
      console.log('📝 Setting isRazorpayActive:', updateData.isRazorpayActive);
    }

    // Status and verification fields
    if (onboardingStatus !== undefined) {
      updateData.onboardingStatus = onboardingStatus;
      console.log('📝 Setting onboardingStatus:', updateData.onboardingStatus);
    }
    if (onboardingDate !== undefined) {
      updateData.onboardingDate = onboardingDate ? new Date(onboardingDate) : null;
      console.log('📝 Setting onboardingDate:', updateData.onboardingDate);
    }
    if (bankAccountVerified !== undefined) {
      updateData.bankAccountVerified = Boolean(bankAccountVerified);
      console.log('📝 Setting bankAccountVerified:', updateData.bankAccountVerified);
    }
    if (kycStatus !== undefined) {
      updateData.kycStatus = kycStatus;
      console.log('📝 Setting kycStatus:', updateData.kycStatus);
    }
    if (activeStatus !== undefined) {
      updateData.activeStatus = Boolean(activeStatus);
      console.log('📝 Setting activeStatus:', updateData.activeStatus);
    }

    // Validate enum values
    const validOnboardingStatuses = ['pending', 'in_progress', 'pending_verification', 'completed', 'rejected'];
    const validKycStatuses = ['pending', 'submitted', 'verified', 'rejected'];
    const validCutTypes = ['percentage', 'flat'];

    if (onboardingStatus && !validOnboardingStatuses.includes(onboardingStatus)) {
      return ResponseUtil.error(res, 'Invalid onboarding status', 400);
    }

    if (kycStatus && !validKycStatuses.includes(kycStatus)) {
      return ResponseUtil.error(res, 'Invalid KYC status', 400);
    }

    if (cutType && !validCutTypes.includes(cutType)) {
      return ResponseUtil.error(res, 'Invalid cut type', 400);
    }

    // Validate cut value
    if (cutValue !== undefined) {
      if (cutValue <= 0) {
        return ResponseUtil.error(res, 'Cut value must be greater than 0', 400);
      }
      if ((cutType === 'percentage' || (cutType === undefined && vendorConfig.cutType === 'percentage')) && cutValue > 100) {
        return ResponseUtil.error(res, 'Percentage cannot exceed 100%', 400);
      }
    }

    // Validate onboarding date format if provided
    if (onboardingDate) {
      const date = new Date(onboardingDate);
      if (isNaN(date.getTime())) {
        return ResponseUtil.error(res, 'Invalid onboarding date format', 400);
      }
    }

    console.log('📝 Final updateData object:', JSON.stringify(updateData, null, 2));

    // Update the record
    await vendorConfig.update(updateData);
    console.log('✅ Database update completed');

    // Fetch updated record with associations
    const updatedConfig = await VendorPaymentConfig.findByPk(id, {
      include: [
        {
          model: Gym,
          as: 'gym',
          attributes: ['id', 'name', 'address', 'city']
        }
      ]
    });

    console.log('📝 Updated vendor config from DB:', JSON.stringify(updatedConfig.toJSON(), null, 2));

    return ResponseUtil.success(res, updatedConfig, 'Vendor configuration updated successfully');
  } catch (error) {
    console.error('Error updating vendor config (complete):', error);
    
    // Handle Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => err.message);
      return ResponseUtil.error(res, `Validation error: ${validationErrors.join(', ')}`, 400);
    }

    // Handle unique constraint errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      return ResponseUtil.error(res, 'Duplicate entry: Owner-Gym combination already exists', 400);
    }

    return ResponseUtil.error(res, 'Failed to update vendor configuration', 500);
  }
}

module.exports = {
  createVendorConfig,
  getAllVendorConfigs,
  getVendorConfig,
  updateVendorConfig,
  updateVendorConfigComplete,
  onboardVendor,
  checkVendorStatus
};
