const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000/api';
const VENDOR_CONFIG_ID = 1; // Change this to an actual vendor config ID in your DB

// You'll need to get a valid JWT token by logging in as admin first
const ADMIN_JWT_TOKEN = 'YOUR_ADMIN_JWT_TOKEN_HERE';

async function testVendorConfigUpdate() {
  try {
    console.log('🧪 Starting vendor config update test...\n');

    // Test payload with all fields
    const testPayload = {
      razorpayVendorId: "acc_TestVendor123456",
      cutValue: 7.5,
      cutType: "percentage",
      isRazorpayActive: true,
      onboardingStatus: "completed",
      onboardingDate: "2024-01-15T10:30:00.000Z",
      bankAccountVerified: true,
      kycStatus: "verified",
      activeStatus: true,
      razorpayBankAccountId: "ba_TestBankAccount123",
      razorpayStakeholderId: "stakeholder_TestStake123",
      updatedBy: "test_admin@gym.com"
    };

    console.log('📤 Request payload:');
    console.log(JSON.stringify(testPayload, null, 2));
    console.log('\n');

    // Make the API call
    const response = await axios.put(
      `${BASE_URL}/admin/vendor-configs/${VENDOR_CONFIG_ID}/complete`,
      testPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_JWT_TOKEN}`
        }
      }
    );

    console.log('✅ API Response Status:', response.status);
    console.log('📥 Response data:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Error testing vendor config update:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error:', error.message);
    }
  }
}

async function testPartialUpdate() {
  try {
    console.log('\n🧪 Testing partial update (commission only)...\n');

    const partialPayload = {
      cutValue: 5.0,
      cutType: "percentage"
    };

    console.log('📤 Partial update payload:');
    console.log(JSON.stringify(partialPayload, null, 2));
    console.log('\n');

    const response = await axios.put(
      `${BASE_URL}/admin/vendor-configs/${VENDOR_CONFIG_ID}/complete`,
      partialPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_JWT_TOKEN}`
        }
      }
    );

    console.log('✅ Partial Update Response Status:', response.status);
    console.log('📥 Response data:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Error in partial update test:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

async function getVendorConfig() {
  try {
    console.log('\n🔍 Getting current vendor config...\n');

    const response = await axios.get(
      `${BASE_URL}/admin/vendor-configs?limit=5`,
      {
        headers: {
          'Authorization': `Bearer ${ADMIN_JWT_TOKEN}`
        }
      }
    );

    console.log('📋 Current vendor configs:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Error getting vendor configs:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Instructions for running the test
console.log(`
🚀 Vendor Config Update API Test Script
======================================

BEFORE RUNNING THIS SCRIPT:
1. Make sure your backend server is running (npm start)
2. Get a valid admin JWT token by logging in
3. Update the ADMIN_JWT_TOKEN variable above with your token
4. Update VENDOR_CONFIG_ID with a valid vendor config ID from your database

To get an admin JWT token:
1. POST to ${BASE_URL}/auth/login with admin credentials
2. Copy the token from the response

Then run: node test_vendor_update.js
`);

// Uncomment the lines below to run the tests
// (async () => {
//   await getVendorConfig();
//   await testPartialUpdate();
//   await testVendorConfigUpdate();
// })();
