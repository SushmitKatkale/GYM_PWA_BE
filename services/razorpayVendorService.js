const Razorpay = require('razorpay');
const axios = require('axios');
const { VendorPaymentConfig, Gym, User } = require('../models');

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Extend the Razorpay SDK to add missing methods
if (!razorpayInstance.accounts.addBankAccount) {
  razorpayInstance.accounts.addBankAccount = async function(accountId, bankAccountData) {
    const authHeader = Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString('base64');
    
    const response = await axios.post(
      `https://api.razorpay.com/v2/accounts/${accountId}/bank_account`,
      bankAccountData,
      {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  };
}

if (!razorpayInstance.accounts.addStakeholder) {
  razorpayInstance.accounts.addStakeholder = async function(accountId, stakeholderData) {
    const authHeader = Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString('base64');
    
    const response = await axios.post(
      `https://api.razorpay.com/v2/accounts/${accountId}/stakeholders`,
      stakeholderData,
      {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  };
}

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
      reference_id: `VEN${vendorConfigId}`,
      legal_business_name: vendorConfig.gym?.name || 'Gym Business',
      business_type: bankDetails?.gst?.length == 0 ? 'individual' : 'proprietorship',
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
    
    // Check if Razorpay account already exists in our database
    let account;
    if (vendorConfig.razorpayVendorId) {
      // Account ID exists in DB, fetch from Razorpay to verify
      account = await razorpayInstance.accounts.fetch(vendorConfig.razorpayVendorId);
      console.log('Using existing Razorpay account from database:', account.id);
    } else {
      // No account ID in database, create new account
      account = await razorpayInstance.accounts.create(accountPayload);
      console.log('New account created:', account.id);
      
      // IMMEDIATELY save the account ID to database
      await vendorConfig.update({
        razorpayVendorId: account.id,
        onboardingStatus: 'in_progress',
        onboardingDate: new Date()
      });
      console.log('Razorpay account ID saved to database:', account.id);
    }

    // Add bank account to the created account
    const bankAccountPayload = {
      ifsc_code: bankDetails.ifsc,
      account_number: bankDetails.accountNumber,
      beneficiary_name: bankDetails.accountHolderName
    };
    
    console.log('Adding bank account for account:', account.id);
    console.log('Bank account payload:', { ...bankAccountPayload, account_number: '***HIDDEN***' });
    
    let bankAccount;
    try {
      bankAccount = await razorpayInstance.accounts.addBankAccount(account.id, bankAccountPayload);
      console.log('Bank account added successfully:', bankAccount.id);
    } catch (bankError) {
      console.error('Bank account API error details:', {
        message: bankError.message,
        status: bankError.response?.status,
        statusText: bankError.response?.statusText,
        data: bankError.response?.data,
        accountId: account.id,
        payload: { ...bankAccountPayload, account_number: '***HIDDEN***' }
      });
      throw new Error(`Failed to add bank account: ${bankError.message}. Details: ${JSON.stringify(bankError.response?.data)}`);
    }

    // Add stakeholder (account holder) details
    const stakeholderPayload = {
      name: `${owner.firstName} ${owner.lastName}`,
      email: vendorConfig.ownerEmail,
      phone: {
        primary: owner.phoneNumber
      },
      addresses: {
        residential: {
          street: vendorConfig.gym?.address || 'Address Line 1',
          city: vendorConfig.gym?.city || 'City',
          state: getFullStateName(vendorConfig.gym?.state) || 'Karnataka',
          postal_code: vendorConfig.gym?.zipCode || '560001',
          country: 'IN'
        }
      },
      kyc: {
        pan: bankDetails.pan
      },
      percentage_ownership: 100
    };
    
    console.log('Adding stakeholder for account:', account.id);
    const stakeholder = await razorpayInstance.accounts.addStakeholder(account.id, stakeholderPayload);
    console.log('Stakeholder added:', stakeholder.id);

    // Update vendor config with Razorpay account ID and other details
    await vendorConfig.update({
      razorpayVendorId: account.id,
      razorpayBankAccountId: bankAccount.id,
      razorpayStakeholderId: stakeholder.id,
      onboardingStatus: 'pending_verification',
      onboardingDate: new Date(),
      isRazorpayActive: false, // Will be activated after verification
      bankAccountVerified: false // Will be verified by Razorpay
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
 * Helper function to make Razorpay API calls
 */
async function makeRazorpayApiCall(url, method = 'GET', data = null) {
  const authHeader = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString('base64');

  const config = {
    method,
    url,
    headers: {
      'Authorization': `Basic ${authHeader}`,
      'Content-Type': 'application/json'
    }
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error('Razorpay API call failed:', {
      url,
      method,
      status: error.response?.status,
      data: error.response?.data
    });
    throw error;
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
