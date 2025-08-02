const axios = require('axios');

const API_BASE_URL = 'http://localhost:8081/api';

async function testRegistrationFlow() {
  try {
    console.log('🚀 Starting Registration Flow Test...\n');

    // Step 1: Register a new user
    console.log('📝 Step 1: Registering new user...');
    const registerData = {
      email: 'testuser@example.com',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser123',
      password: 'Password123!'
    };

    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, registerData);
    console.log('✅ Register Response:', registerResponse.data);
    console.log('');

    // Simulate getting OTP from console logs (in real scenario, user gets it via email)
    console.log('📧 Step 2: Check backend console for OTP...');
    console.log('💡 In real scenario, user would receive OTP via email');
    console.log('🔍 Look at the backend console for OTP generation logs');
    console.log('');

    // Simulate waiting for user input
    console.log('⏳ Waiting 3 seconds to simulate user receiving OTP...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // For testing, let's try to get the OTP from the service directly
    // This is just for testing - in production, OTP would come via email
    console.log('🔧 Step 3: Attempting to retrieve OTP for testing...');
    
    // Note: We can't directly access the OTP from here, so we'll simulate
    // In a real test, you would need to either:
    // 1. Check email for OTP
    // 2. Use a test OTP service
    // 3. Mock the email service to return OTP
    
    console.log('❌ Cannot retrieve OTP directly for security reasons');
    console.log('✨ To complete the test:');
    console.log('   1. Check the backend console for the generated OTP');
    console.log('   2. Use that OTP to verify registration manually');
    console.log('');

    // Let's test with a dummy OTP to show the verification flow
    console.log('🧪 Step 4: Testing OTP verification with dummy OTP (will fail)...');
    const verifyData = {
      email: 'testuser@example.com',
      otp: '123456' // This will fail, but will show the verification logs
    };

    try {
      const verifyResponse = await axios.post(`${API_BASE_URL}/auth/verify-otp`, verifyData);
      console.log('✅ Verify Response:', verifyResponse.data);
    } catch (error) {
      console.log('❌ Verify Response (Expected failure):', error.response?.data);
    }

    console.log('');
    console.log('🎯 Test completed! Check backend console for detailed logs.');

  } catch (error) {
    console.error('❌ Error during registration flow test:', error.response?.data || error.message);
  }
}

// Run the test
testRegistrationFlow();
