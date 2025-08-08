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

    // Check if configuration already exists
    const existingConfig = await VendorPaymentConfig.findOne({
      where: { ownerEmail, gymId }
    });

    if (existingConfig) {
      return ResponseUtil.conflictError(res, 'Vendor configuration already exists for this gym and owner');
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

    // Create vendor configuration
    const vendorConfig = await VendorPaymentConfig.create({
      ownerEmail,
      gymId,
      cutValue,
      cutType,
      createdBy: req.user.email
    });

    return ResponseUtil.success(res, vendorConfig, 'Vendor configuration created successfully', 201);
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
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { activeStatus: true };
    if (status) {
      whereClause.onboardingStatus = status;
    }

    const vendorConfigs = await VendorPaymentConfig.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Gym,
          as: 'gym',
          attributes: ['id', 'name', 'address', 'city']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createTimestamp', 'DESC']]
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

module.exports = {
  createVendorConfig,
  getAllVendorConfigs,
  updateVendorConfig,
  onboardVendor,
  checkVendorStatus
};
