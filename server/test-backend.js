const https = require('https');
const http = require('http');

// Simple fetch implementation for Node.js
function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          text: () => Promise.resolve(data),
          json: () => Promise.resolve(JSON.parse(data))
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

const BASE_URL = 'http://localhost:4000';

async function testBackend() {
  console.log('🧪 Testing Backend API...\n');

  try {
    // Test 1: Check if server is running
    console.log('1️⃣ Testing server connection...');
    const response = await fetch(`${BASE_URL}/`);
    console.log('✅ Server is running');
    console.log('Response:', await response.text());
    console.log('');

    // Test 2: Check debug tables endpoint
    console.log('2️⃣ Testing debug tables endpoint...');
    const tablesResponse = await fetch(`${BASE_URL}/api/debug/tables`);
    if (tablesResponse.ok) {
      const tables = await tablesResponse.json();
      console.log('✅ Tables endpoint working');
      console.log('Tables:', tables);
    } else {
      console.log('❌ Tables endpoint failed:', tablesResponse.status);
    }
    console.log('');

    // Test 3: Check master_people table specifically
    console.log('3️⃣ Testing master_people table check...');
    const checkResponse = await fetch(`${BASE_URL}/api/debug/check-master-people`);
    if (checkResponse.ok) {
      const check = await checkResponse.json();
      console.log('✅ Master people check working');
      console.log('Table exists:', check.exists);
      if (check.exists) {
        console.log('Columns:', check.columns);
      }
    } else {
      console.log('❌ Master people check failed:', checkResponse.status);
    }
    console.log('');

    // Test 4: Test master_people POST endpoint
    console.log('4️⃣ Testing master_people POST endpoint...');
    const testData = {
      templeId: 1,
      name: 'Test Person',
      address: ['Test Address 1', 'Test Address 2'],
      village: 'Test Village',
      mobile: '1234567890',
      mobileNumber: '9087863189'
    };

    const postResponse = await fetch(`${BASE_URL}/api/master-people`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    if (postResponse.ok) {
      const result = await postResponse.json();
      console.log('✅ Master people POST working');
      console.log('Response:', result);
    } else {
      const errorData = await postResponse.json();
      console.log('❌ Master people POST failed:', postResponse.status);
      console.log('Error:', errorData);
    }
    console.log('');

    // Test 5: Test master_people GET endpoint
    console.log('5️⃣ Testing master_people GET endpoint...');
    const getResponse = await fetch(`${BASE_URL}/api/master-people/1`);
    if (getResponse.ok) {
      const people = await getResponse.json();
      console.log('✅ Master people GET working');
      console.log('People count:', people.length);
      if (people.length > 0) {
        console.log('First person:', people[0]);
      }
    } else {
      const errorData = await getResponse.json();
      console.log('❌ Master people GET failed:', getResponse.status);
      console.log('Error:', errorData);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testBackend();
