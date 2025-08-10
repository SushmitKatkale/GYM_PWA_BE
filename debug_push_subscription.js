const axios = require('axios');

// Debug the exact error that's happening
async function debugPushSubscriptionError() {
  console.log('🔍 Debugging push subscription registration error...\n');

  // The exact payload from the failed request
  const payload = {
    subscription: {
      endpoint: "https://fcm.googleapis.com/fcm/send/fFGOtKk8YM4:APA91bGouWfoq6jPWpODABrr0ovUz8qMzXXRvnqTETlN8-Ps3voSOrhkcrYTSas8cBzCY3P6-VmxWuOwef_mRQgU5sMi4RcB10rqsg2YaZg4u_rb7BcsReWdUeuSDdAr5KbcyTyER58x",
      expirationTime: null,
      keys: {
        p256dh: "BPGeHKu_AO2AJ26PU_NbvmUKu3Eo9dw4HHiL_aoIAghqGrvXoXXo2VfSfImsaDlzrgLiZrP3V8e9w7qSbppO4fc",
        auth: "Q66OfUWrS9GAz-OjnwHf5w"
      }
    },
    deviceInfo: {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
    }
  };

  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyRW1haWwiOiJrYXRrYWxlc3VzaG1pdEBnbWFpbC5jb20iLCJpYXQiOjE3NTQ4MjgwMTgsImV4cCI6MTc1NTQzMjgxOH0.t1ctDhWX7_NRDG7zQAhSCG7bxWoA481svAOZrlxZcAc";

  try {
    console.log('📤 Sending request to:', 'http://localhost:8080/api/notifications/push/subscribe');
    console.log('📋 Payload keys:', Object.keys(payload));
    console.log('📋 Subscription keys:', Object.keys(payload.subscription));
    console.log('📋 Subscription.keys:', Object.keys(payload.subscription.keys));
    
    const response = await axios.post('http://localhost:8080/api/notifications/push/subscribe', payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log('✅ Success! Database entry created:', response.data);
    } else {
      console.log('❌ API returned success=false:', response.data);
    }

  } catch (error) {
    console.log('❌ Request failed:');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response data:', error.response.data);
      
      if (error.response.data) {
        console.log('\n🔍 Detailed error analysis:');
        console.log('- Success:', error.response.data.success);
        console.log('- Message:', error.response.data.message);
        console.log('- Errors:', error.response.data.errors);
      }
    } else {
      console.log('Network error:', error.message);
    }
  }

  // Let's also check if the server is running and accessible
  console.log('\n🔍 Checking server health...');
  try {
    const healthResponse = await axios.get('http://localhost:8080/health');
    console.log('✅ Server is running:', healthResponse.data);
  } catch (healthError) {
    console.log('❌ Server not accessible:', healthError.message);
  }
}

debugPushSubscriptionError();
