import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4000/api/pooja-mobile';

async function testMobileAPI() {
  console.log('🧪 Testing Pooja Mobile API Endpoints\n');

  try {
    // Test 1: Submit a new request
    console.log('1️⃣ Testing request submission...');
    const submitData = {
      receipt_number: 'TEST' + Date.now(),
      name: 'Test User',
      mobile_number: '9999999999',
      time: '18:00',
      from_date: '2024-12-15',
      to_date: '2024-12-15',
      remarks: 'Test request from API',
      submitted_by_mobile: '9999999999'
    };

    const submitResponse = await fetch(`${BASE_URL}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submitData),
    });

    const submitResult = await submitResponse.json();
    console.log('✅ Submit Response:', submitResult);

    if (submitResult.success) {
      const requestId = submitResult.data.id;
      console.log(`📝 Request ID: ${requestId}\n`);

      // Test 2: Get user's requests
      console.log('2️⃣ Testing get user requests...');
      const requestsResponse = await fetch(`${BASE_URL}/my-requests?mobile_number=9999999999`);
      const requestsResult = await requestsResponse.json();
      console.log('✅ Requests Response:', requestsResult);
      console.log(`📊 Found ${requestsResult.data?.length || 0} requests\n`);

      // Test 3: Get request details
      console.log('3️⃣ Testing get request details...');
      const detailsResponse = await fetch(`${BASE_URL}/request/${requestId}?mobile_number=9999999999`);
      const detailsResult = await detailsResponse.json();
      console.log('✅ Details Response:', detailsResult);
      console.log(`📋 Request Status: ${detailsResult.data?.status}\n`);

      // Test 4: Get available slots
      console.log('4️⃣ Testing get available slots...');
      const slotsResponse = await fetch(`${BASE_URL}/available-slots?from_date=2024-12-15&to_date=2024-12-15`);
      const slotsResult = await slotsResponse.json();
      console.log('✅ Slots Response:', slotsResult);
      console.log(`⏰ Available slots: ${slotsResult.data?.total_available || 0}`);
      console.log(`🚫 Booked slots: ${slotsResult.data?.total_booked || 0}\n`);

      // Test 5: Cancel request (optional)
      console.log('5️⃣ Testing request cancellation...');
      const cancelResponse = await fetch(`${BASE_URL}/cancel/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobile_number: '9999999999',
          reason: 'Test cancellation'
        }),
      });

      const cancelResult = await cancelResponse.json();
      console.log('✅ Cancel Response:', cancelResult);
    }

  } catch (error) {
    console.error('❌ Error testing mobile API:', error.message);
  }
}

// Test admin approval API (requires authentication)
async function testAdminAPI() {
  console.log('\n🔐 Testing Admin Approval API (requires authentication)\n');
  
  try {
    // Note: This would require a valid JWT token
    console.log('⚠️  Admin API testing requires authentication token');
    console.log('📝 To test admin endpoints, you need to:');
    console.log('   1. Login to get a JWT token');
    console.log('   2. Use the token in Authorization header');
    console.log('   3. Ensure you have pooja_approval permission');
    
    // Example of how to test with token:
    /*
    const token = 'YOUR_JWT_TOKEN_HERE';
    const adminResponse = await fetch('http://localhost:4000/api/pooja-approval/pending', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    */
    
  } catch (error) {
    console.error('❌ Error testing admin API:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Pooja Approval System API Tests\n');
  console.log('=' .repeat(50));
  
  await testMobileAPI();
  await testAdminAPI();
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ API Testing Complete!');
  console.log('\n📚 For complete API documentation, see: POOJA_APPROVAL_API_DOCUMENTATION.md');
}

runTests().catch(console.error);
