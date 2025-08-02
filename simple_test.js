const axios = require('axios');

async function testHealthCheck() {
  try {
    console.log('🔍 Checking if server is running...');
    const response = await axios.get('http://localhost:8081/health', { timeout: 5000 });
    console.log('✅ Server is running:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Server is not responding:', error.message);
    return false;
  }
}

async function testRegister() {
  try {
    console.log('📝 Testing registration endpoint...');
    
    const response = await axios.post('http://localhost:8081/api/auth/register', {
      email: 'newuser@example.com',
      firstName: 'New',
      lastName: 'User',
      username: 'newuser123',
      password: 'Password123!'
    }, { timeout: 10000 });
    
    console.log('✅ Registration Success:', response.data);
    return response.data;
  } catch (error) {
    console.log('❌ Registration Error:', error.response?.data || error.message);
    return null;
  }
}

async function testVerifyOTP(email, otp) {
  try {
    console.log('🔐 Testing OTP verification...');
    
    const response = await axios.post('http://localhost:8081/api/auth/verify-otp', {
      email: email,
      otp: otp
    }, { timeout: 10000 });
    
    console.log('✅ OTP Verification Success:', response.data);
    return response.data;
  } catch (error) {
    console.log('❌ OTP Verification Error:', error.response?.data || error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting comprehensive registration flow test...\n');
  
  // Step 1: Check server health
  const serverRunning = await testHealthCheck();
  if (!serverRunning) {
    console.log('\n❌ Cannot proceed - server is not running!');
    console.log('💡 Start the server first with: npm start');
    return;
  }
  
  console.log('');
  
  // Step 2: Test registration
  const registerResult = await testRegister();
  if (!registerResult) {
    console.log('\n❌ Registration failed - cannot continue with OTP test');
    return;
  }
  
  console.log('');
  console.log('📧 OTP should have been generated and logged in the server console.');
  console.log('💡 Check the server terminal for the OTP and then test verification manually:');
  console.log('   node -e "require(\'axios\').post(\'http://localhost:8081/api/auth/verify-otp\', {email: \'newuser@example.com\', otp: \'YOUR_OTP_HERE\'}).then(r => console.log(r.data)).catch(e => console.log(e.response?.data))"');
  
  console.log('');
  console.log('🧪 Testing with dummy OTP (will fail but show logs)...');
  await testVerifyOTP('newuser@example.com', '123456');
  
  console.log('\n🎯 Test completed! Check server logs for detailed debugging information.');
}

runTests();
