const https = require('https');
const http = require('http');

async function testHallReceiptAPI() {
  console.log('🧪 Testing Hall Bookings Receipt Number API...\n');

  // Test 1: Check if backend is running
  console.log('1. Testing backend connection...');
  try {
    const response = await makeRequest('http://localhost:4000/api/health');
    console.log('✅ Backend is running');
  } catch (error) {
    console.log('❌ Backend not running on port 4000');
    console.log('   Error:', error.message);
    return;
  }

  // Test 2: Test receipt number generation without auth
  console.log('\n2. Testing receipt number generation (no auth)...');
  try {
    const response = await makeRequest('http://localhost:4000/api/hall-bookings/generate-receipt-number');
    console.log('❌ Should have failed without auth, but got:', response);
  } catch (error) {
    console.log('✅ Correctly rejected without auth');
  }

  // Test 3: Test with dummy auth token
  console.log('\n3. Testing receipt number generation (with dummy token)...');
  try {
    const response = await makeRequest('http://localhost:4000/api/hall-bookings/generate-receipt-number', {
      'Authorization': 'Bearer dummy-token'
    });
    console.log('✅ Receipt number generated:', response);
  } catch (error) {
    console.log('❌ Failed with dummy token:', error.message);
  }

  // Test 4: Test via frontend proxy
  console.log('\n4. Testing via frontend proxy (port 8080)...');
  try {
    const response = await makeRequest('http://localhost:8080/api/hall-bookings/generate-receipt-number', {
      'Authorization': 'Bearer dummy-token'
    });
    console.log('✅ Frontend proxy working:', response);
  } catch (error) {
    console.log('❌ Frontend proxy failed:', error.message);
  }
}

function makeRequest(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'GET',
      headers: headers
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
        } catch (e) {
          reject(new Error(`Invalid JSON: ${data}`));
        }
      });
    });

    req.on('error', (error) => reject(error));
    req.setTimeout(5000, () => reject(new Error('Request timeout')));
    req.end();
  });
}

// Run the test
testHallReceiptAPI().then(() => {
  console.log('\n🏁 Test completed');
}).catch((error) => {
  console.error('\n💥 Test suite failed:', error);
});
