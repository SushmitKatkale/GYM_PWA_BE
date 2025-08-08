const Razorpay = require('razorpay');
const { VendorPaymentConfig, Gym, User } = require('../models');

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Onboard vendor to Razorpay
 */
async function onboardVendor(vendorConfigId, bankDetails) {
  try {
    console.log('Starting vendor onboarding:', { vendorConfigId, bankDetails: { ...bankDetails, accountNumber: '***HIDDEN***' } });
    
    // Validate Razorpay configuration
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not configured');
    }
    
    // Validate input parameters
    if (!vendorConfigId) {
      throw new Error('Vendor config ID is required');
    }
    
    if (!bankDetails || typeof bankDetails !== 'object') {
      throw new Error('Bank details are required');
    }
    
    const requiredFields = ['accountNumber', 'ifsc', 'accountHolderName', 'pan'];
    for (const field of requiredFields) {
      if (!bankDetails[field]) {
        throw new Error(`${field} is required in bank details`);
      }
    }
    
    const vendorConfig = await VendorPaymentConfig.findByPk(vendorConfigId, {
      include: [
        {
          model: Gym,
          as: 'gym'
        }
      ]
    });

    if (!vendorConfig) {
      throw new Error('Vendor configuration not found');
    }

    // Get owner details
    const owner = await User.findOne({ where: { email: vendorConfig.ownerEmail } });
    if (!owner) {
      throw new Error('Owner not found');
    }
    
    console.log('Found vendor config and owner:', {
      vendorConfigId,
      ownerEmail: vendorConfig.ownerEmail,
      gymName: vendorConfig.gym?.name,
      ownerPhone: owner.phoneNumber
    });
    
    // Validate phone number
    if (!owner.phoneNumber) {
      throw new Error('Owner phone number is required for Razorpay onboarding');
    }

    // Create Razorpay linked account payload
    // Note: Based on API error, bank_account, contact_email, contact_mobile should not be sent
    const accountPayload = {
      email: vendorConfig.ownerEmail,
      phone: owner.phoneNumber,
      type: 'route',
      reference_id: `vendor_${vendorConfigId}`,
      legal_business_name: vendorConfig.gym?.name || 'Gym Business',
      business_type: 'proprietorship',
      customer_facing_business_name: vendorConfig.gym?.name || 'Gym',
      profile: {
        category: 'education',
        subcategory: 'schools',
        addresses: {
          registered: {
            street1: vendorConfig.gym?.address || 'Address Line 1',
            street2: vendorConfig.gym?.address2 || 'Address Line 2',
            city: vendorConfig.gym?.city || 'City',
            state: getFullStateName(vendorConfig.gym?.state) || 'Karnataka',
            postal_code: vendorConfig.gym?.zipCode || '560001',
            country: 'IN'
          }
        }
      },
      legal_info: {
        pan: bankDetails.pan,
        gst: bankDetails.gst || null
      },
      contact_name: `${owner.firstName} ${owner.lastName}`
    };
    
    console.log('Razorpay account payload:', accountPayload);
    
    // Create Razorpay linked account
    const account = await razorpayInstance.accounts.create(accountPayload);

    // Update vendor config with Razorpay account ID
    await vendorConfig.update({
      razorpayVendorId: account.id,
      onboardingStatus: 'completed',
      onboardingDate: new Date(),
      isRazorpayActive: true,
      bankAccountVerified: true
    });

    return {
      success: true,
      accountId: account.id,
      message: 'Vendor onboarded successfully'
    };

  } catch (error) {
    // Log detailed error information
    console.error('Detailed onboarding error:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers
    });

    // Update status to rejected if onboarding fails
    if (vendorConfigId) {
      try {
        await VendorPaymentConfig.update(
          { onboardingStatus: 'rejected' },
          { where: { id: vendorConfigId } }
        );
      } catch (updateError) {
        console.error('Error updating vendor config status:', updateError);
      }
    }

    // Provide more detailed error message
    let errorMessage = error.message || 'Unknown error occurred';
    if (error.response?.data) {
      errorMessage = JSON.stringify(error.response.data);
    }
    
    throw new Error(`Vendor onboarding failed: ${errorMessage}`);
  }
}

/**
 * Check vendor account status
 */
async function checkVendorAccountStatus(razorpayVendorId) {
  try {
    const account = await razorpayInstance.accounts.fetch(razorpayVendorId);
    return {
      status: account.status,
      kycStatus: account.kyc?.status || 'pending',
      bankAccountVerified: account.bank_account?.status === 'verified'
    };
  } catch (error) {
    throw new Error(`Failed to check account status: ${error.message}`);
  }
}

/**
 * Update vendor KYC status
 */
async function updateVendorKYCStatus(vendorConfigId, kycStatus) {
  await VendorPaymentConfig.update(
    { kycStatus },
    { where: { id: vendorConfigId } }
  );
}

function getFullStateName(abbreviation) {
  const states = {
    'KA': 'Karnataka',
    'TN': 'Tamil Nadu',
    // Add more states here
  };
  return states[abbreviation] || abbreviation;
}

module.exports = {
  onboardVendor,
  checkVendorAccountStatus,
  updateVendorKYCStatus,
  getFullStateName // export for testing
};
