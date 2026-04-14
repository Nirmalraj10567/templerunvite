const axios = require('axios');

const BASE_URL = 'https://tmsapi.xesstechlink.com/api';

async function testMobileAuth() {
  console.log('--- Testing Mobile Auth API ---');
  try {
    // 1. Send OTP
    console.log('1. Calling /mobile-auth/send-otp...');
    const sendRes = await axios.post(`${BASE_URL}/mobile-auth/send-otp`, {
      mobileNumber: '8888888888'
    });
    console.log('Response:', JSON.stringify(sendRes.data, null, 2));

    if (sendRes.data.success) {
      const otp = sendRes.data.otp;
      const userId = sendRes.data.users[0].id;

      // 2. Verify OTP
      console.log('\n2. Calling /mobile-auth/verify-otp...');
      const verifyRes = await axios.post(`${BASE_URL}/mobile-auth/verify-otp`, {
        mobileNumber: '8888888888',
        otp: otp,
        userId: userId
      });
      console.log('Response:', JSON.stringify(verifyRes.data, null, 2));
      
      if (verifyRes.data.success) {
        console.log('\n✅ Mobile Auth Login Successful!');
        return verifyRes.data.token;
      }
    }
  } catch (error) {
    console.error('❌ Mobile Auth Error:', error.response ? error.response.data : error.message);
  }
  return null;
}

async function testSmartLogin() {
  console.log('\n--- Testing Smart Login API (/api/users/login/smart) ---');
  try {
    // This one triggers a real SMS if it fails finding a password user.
    // For mobile "8888888888", it should be a member, so it will try to send OTP.
    console.log('Calling /users/login/smart for member 8888888888...');
    const smartRes = await axios.post(`${BASE_URL}/users/login/smart`, {
      mobile: '8888888888'
    });
    console.log('Response:', JSON.stringify(smartRes.data, null, 2));
    
    // If it returns mode: 'password', we test password login.
    // If it returns mode: 'otp', it sent an SMS (we can't easily see it unless we check logs or DB if stored).
    // Actually OTP is in-memory in users.js.
  } catch (error) {
    console.error('❌ Smart Login Error:', error.response ? error.response.data : error.message);
  }
}

async function runTests() {
  await testMobileAuth();
  await testSmartLogin();
}

runTests();
