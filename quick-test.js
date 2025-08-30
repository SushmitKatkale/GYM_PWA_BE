const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Helper function to make API calls
const testAPI = async (method, endpoint, description) => {
  try {
    const response = await axios({
      method,
      url: `${BASE_URL}${endpoint}`,
      timeout: 5000
    });
    console.log(`✅ ${description}: ${response.status} - ${response.data.message || 'OK'}`);
    return true;
  } catch (error) {
    const status = error.response?.status || 'ERR';
    const message = error.response?.data?.message || error.message;
    console.log(`❌ ${description}: ${status} - ${message}`);
    return false;
  }
};

const runQuickTests = async () => {
  console.log('🚀 Running Quick API Tests...\n');

  let passCount = 0;
  let totalCount = 0;

  // Basic endpoints
  const tests = [
    ['GET', '/health', 'Health Check'],
    ['GET', '/', 'Welcome Page'],
    ['GET', '/api/amenities', 'Get All Amenities'],
    ['GET', '/api/gyms', 'Get All Gyms'],
    ['GET', '/api/subscriptions', 'Get All Subscriptions'],
    ['GET', '/api/advertisements', 'Get All Advertisements'],
    ['GET', '/api/checkin-methods', 'Get Check-in Methods']
  ];

  for (const [method, endpoint, description] of tests) {
    totalCount++;
    if (await testAPI(method, endpoint, description)) {
      passCount++;
    }
  }

  console.log(`\n📊 Results: ${passCount}/${totalCount} APIs working (${((passCount/totalCount)*100).toFixed(1)}%)`);
  
  if (passCount > 2) {
    console.log('🎉 Major improvement! Core APIs are working.');
  } else {
    console.log('⚠️  Still issues remaining. Check server logs.');
  }
};

runQuickTests().catch(console.error);
