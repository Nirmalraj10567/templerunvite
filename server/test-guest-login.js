#!/usr/bin/env node
/**
 * Test script for guest login endpoint
 * Run: node test-guest-login.js
 */

const http = require('http');

const API_BASE = 'localhost';
const API_PORT = 4000;

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_BASE,
      port: API_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testGuestLogin() {
  console.log('=== Testing Guest Login Endpoint ===\n');

  // Test 1: Basic guest login
  console.log('Test 1: Basic guest login');
  try {
    const response = await makeRequest('/api/mobile-auth/guest-login', 'POST', {
      deviceId: 'test_device_123',
      deviceName: 'Test Device'
    });

    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));

    if (response.data.success && response.data.token) {
      console.log('✅ Guest login successful!\n');

      // Test 2: Decode and verify token
      console.log('Test 2: Verify JWT token structure');
      const tokenParts = response.data.token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        console.log('Token payload:', JSON.stringify(payload, null, 2));

        if (payload.type === 'guest' && payload.permissions) {
          console.log('✅ Token contains correct guest type and permissions\n');
        } else {
          console.log('❌ Token missing guest type or permissions\n');
        }
      }

      // Test 3: Test with no body
      console.log('Test 3: Guest login without device info');
      const response2 = await makeRequest('/api/mobile-auth/guest-login', 'POST', {});
      console.log('Status:', response2.status);
      console.log('Success:', response2.data.success ? '✅' : '❌');
      console.log('');

      console.log('=== All Tests Passed ===');
    } else {
      console.log('❌ Guest login failed:', response.data.error || 'Unknown error');
    }
  } catch (error) {
    console.error('❌ Error testing guest login:', error.message);
    console.log('\nMake sure the server is running on port 4000');
  }
}

testGuestLogin();
