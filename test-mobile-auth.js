import fetch from 'node-fetch';

const BASE_URL = 'https://tmsapi.xesstechlink.com/api/mobile-auth';

async function testMobileAuth() {
  console.log('🧪 Testing Mobile Auth API Endpoints\n');

  try {
    // Test 1: Send OTP with just mobile number
    console.log('1️⃣ Testing Send OTP (Mobile Only)...');
    const sendOtpMobileResponse = await fetch(`${BASE_URL}/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mobileNumber: '9999999999'
      })
    });

    const sendOtpMobileData = await sendOtpMobileResponse.json();
    console.log('Send OTP (Mobile Only) Response:', JSON.stringify(sendOtpMobileData, null, 2));

    // Test 2: Send OTP with mobile and name
    console.log('\n2️⃣ Testing Send OTP (Mobile + Name)...');
    const sendOtpNameResponse = await fetch(`${BASE_URL}/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mobileNumber: '9999999999',
        name: 'Test'
      })
    });

    const sendOtpNameData = await sendOtpNameResponse.json();
    console.log('Send OTP (Mobile + Name) Response:', JSON.stringify(sendOtpNameData, null, 2));

    // Test 3: Send OTP with mobile, name, and receipt number
    console.log('\n3️⃣ Testing Send OTP (Mobile + Name + Receipt)...');
    const sendOtpFullResponse = await fetch(`${BASE_URL}/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mobileNumber: '9999999999',
        name: 'Test',
        receiptNumber: '6672'
      })
    });

    const sendOtpFullData = await sendOtpFullResponse.json();
    console.log('Send OTP (Mobile + Name + Receipt) Response:', JSON.stringify(sendOtpFullData, null, 2));

    // Select first user for verification
    const selectedUser = sendOtpFullData.users[0];

    // Test 4: Verify OTP
    console.log('\n4️⃣ Testing Verify OTP...');
    const verifyOtpResponse = await fetch(`${BASE_URL}/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mobileNumber: '9999999999',
        name: selectedUser.name,
        receiptNumber: selectedUser.referenceNumber,
        otp: '123456',
        userId: selectedUser.id
      })
    });

    const verifyOtpData = await verifyOtpResponse.json();
    console.log('Verify OTP Response:', JSON.stringify(verifyOtpData, null, 2));

    if (!verifyOtpData.success) {
      console.log('❌ Verify OTP failed, stopping tests');
      return;
    }

    const token = verifyOtpData.token;
    const userId = verifyOtpData.user.id;

    // Test 5: Get Payment Details
    console.log('\n5️⃣ Testing Get Payment Details...');
    const paymentResponse = await fetch(`${BASE_URL}/payment-details/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const paymentData = await paymentResponse.json();
    console.log('Payment Details Response:', JSON.stringify(paymentData, null, 2));

    if (!paymentData.success) {
      console.log('❌ Get Payment Details failed');
    }

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests
testMobileAuth();
