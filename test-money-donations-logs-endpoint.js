const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

// Test script to verify money donations logs endpoint works
async function testMoneyDonationsLogsEndpoint() {
  try {
    console.log('🧪 Testing Money Donations Logs Endpoint...\n');

    // You'll need to replace this with a valid token
    const token = 'your-test-token-here';
    
    if (token === 'your-test-token-here') {
      console.log('❌ Please replace the token with a valid authentication token');
      return;
    }

    // Test 1: Get all logs with pagination
    console.log('1. Testing GET /api/money-donations/logs...');
    try {
      const response = await axios.get(`${BASE_URL}/api/money-donations/logs?page=1&pageSize=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('✅ Success! Response status:', response.status);
      console.log('Response data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Error:', error.response?.status, error.response?.data || error.message);
    }

    // Test 2: Get logs with different page size
    console.log('\n2. Testing with different page size...');
    try {
      const response = await axios.get(`${BASE_URL}/api/money-donations/logs?page=1&pageSize=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('✅ Success! Response status:', response.status);
      console.log('Total logs:', response.data.total);
      console.log('Page:', response.data.page);
      console.log('Page size:', response.data.pageSize);
    } catch (error) {
      console.log('❌ Error:', error.response?.status, error.response?.data || error.message);
    }

    // Test 3: Test without pagination parameters
    console.log('\n3. Testing without pagination parameters...');
    try {
      const response = await axios.get(`${BASE_URL}/api/money-donations/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('✅ Success! Response status:', response.status);
      console.log('Default page size used:', response.data.pageSize);
    } catch (error) {
      console.log('❌ Error:', error.response?.status, error.response?.data || error.message);
    }

    console.log('\n🎉 Test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testMoneyDonationsLogsEndpoint();
