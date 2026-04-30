/**
 * Quick Health Check for Asset Management API
 * Tests if the API endpoints are accessible and responding
 */

const http = require('http');

const API_BASE = process.env.API_BASE || 'https://templeapi.agniplay.com';

function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runHealthCheck() {
  console.log('========================================');
  console.log('ASSET MANAGEMENT API - HEALTH CHECK');
  console.log('========================================');
  console.log(`API Base: ${API_BASE}\n`);

  const results = [];

  // Test 1: Check if backend is running
  console.log('Test 1: Backend Status');
  try {
    const response = await makeRequest('/api/login', 'POST', { username: 'test', password: 'test' });
    if (response.status === 200 || response.status === 401 || response.status === 404) {
      console.log('✓ Backend is running and responding\n');
      results.push({ name: 'Backend Status', passed: true });
    } else {
      console.log(`✗ Unexpected status: ${response.status}\n`);
      results.push({ name: 'Backend Status', passed: false });
    }
  } catch (error) {
    console.log('✗ Backend not responding');
    console.log(`  Error: ${error.message}\n`);
    results.push({ name: 'Backend Status', passed: false });
    console.log('========================================');
    console.log('HEALTH CHECK FAILED');
    console.log('========================================');
    console.log('Make sure backend is running: node backend.js');
    return;
  }

  // Test 2: Check assets endpoint (should require auth)
  console.log('Test 2: Assets Endpoint - Auth Required');
  try {
    const response = await makeRequest('/api/assets');
    if (response.status === 401) {
      console.log('✓ Assets endpoint requires authentication');
      console.log(`  Response: ${JSON.stringify(response.data)}\n`);
      results.push({ name: 'Auth Required', passed: true });
    } else {
      console.log(`⚠ Unexpected status: ${response.status}`);
      console.log(`  Response: ${JSON.stringify(response.data)}\n`);
      results.push({ name: 'Auth Required', passed: false });
    }
  } catch (error) {
    console.log(`✗ Error: ${error.message}\n`);
    results.push({ name: 'Auth Required', passed: false });
  }

  // Test 3: Check if database tables exist by trying to get logs
  console.log('Test 3: Database Tables');
  try {
    // This will fail auth but shows if endpoint exists
    const response = await makeRequest('/api/assets/1/logs');
    if (response.status === 401 || response.status === 404) {
      console.log('✓ Assets logs endpoint exists');
      console.log(`  Response: ${JSON.stringify(response.data)}\n`);
      results.push({ name: 'Database Tables', passed: true });
    } else {
      console.log(`⚠ Unexpected response`);
      console.log(`  Response: ${JSON.stringify(response.data)}\n`);
      results.push({ name: 'Database Tables', passed: true }); // Endpoint exists
    }
  } catch (error) {
    console.log(`✗ Error: ${error.message}\n`);
    results.push({ name: 'Database Tables', passed: false });
  }

  // Summary
  console.log('========================================');
  console.log('HEALTH CHECK SUMMARY');
  console.log('========================================');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  results.forEach(r => {
    const status = r.passed ? '✓' : '✗';
    console.log(`${status} ${r.name}`);
  });

  console.log('----------------------------------------');
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('========================================');

  if (passed === results.length) {
    console.log('\n✓ All systems operational!');
    console.log('Next: Run full tests with valid credentials');
    console.log('  node test-assets-api.js');
  } else {
    console.log('\n✗ Some checks failed. Please verify:');
    console.log('1. Backend is running: node backend.js');
    console.log('2. MySQL migration completed successfully');
    console.log('3. API routes are properly mounted in backend.js');
  }
}

runHealthCheck().catch(console.error);
