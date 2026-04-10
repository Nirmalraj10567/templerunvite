/**
 * Asset Management API Test Suite
 * Tests all endpoints for the asset management flowchart implementation
 * Run with: node test-assets-api.js
 */

const axios = require('axios');

// Configuration
const API_BASE = process.env.API_BASE || 'http://localhost:4000';
const TEST_USER = {
  username: 'test_admin',
  password: 'test123'
};

let authToken = null;
let createdAssetId = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function login() {
  try {
    log('\n=== TEST 1: Login ===', 'blue');
    const response = await axios.post(`${API_BASE}/api/login`, TEST_USER);
    authToken = response.data.token;
    log('✓ Login successful', 'green');
    log(`  Token received: ${authToken.substring(0, 30)}...`, 'reset');
    return true;
  } catch (error) {
    log('✗ Login failed', 'red');
    log(`  Error: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

async function testCreateAsset() {
  try {
    log('\n=== TEST 2: Create Asset ===', 'blue');
    const assetData = {
      name: 'Audio Set Test',
      details: 'Complete audio system with speakers and mixer',
      value: 15000.00,
      asset_source: 'donation',
      source_details: 'Audio Set Example: 10 comes from where',
      donor_name: 'Test Donor',
      donor_contact: '9876543210'
    };

    const response = await axios.post(
      `${API_BASE}/api/assets`,
      assetData,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    createdAssetId = response.data.assetId;
    log('✓ Asset created successfully', 'green');
    log(`  Asset ID: ${createdAssetId}`, 'reset');
    log(`  Response: ${JSON.stringify(response.data, null, 2)}`, 'reset');
    return true;
  } catch (error) {
    log('✗ Asset creation failed', 'red');
    log(`  Error: ${error.response?.data?.error || error.message}`, 'red');
    if (error.response?.data) {
      log(`  Details: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    }
    return false;
  }
}

async function testListAssets() {
  try {
    log('\n=== TEST 3: List Assets ===', 'blue');
    const response = await axios.get(
      `${API_BASE}/api/assets`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    log('✓ Assets listed successfully', 'green');
    log(`  Count: ${response.data.count}`, 'reset');
    log(`  Response: ${JSON.stringify(response.data, null, 2).substring(0, 500)}...`, 'reset');
    return true;
  } catch (error) {
    log('✗ Asset listing failed', 'red');
    log(`  Error: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

async function testGetAsset() {
  try {
    log('\n=== TEST 4: Get Single Asset ===', 'blue');
    if (!createdAssetId) {
      log('✗ No asset ID available', 'red');
      return false;
    }

    const response = await axios.get(
      `${API_BASE}/api/assets/${createdAssetId}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    log('✓ Asset retrieved successfully', 'green');
    log(`  Response: ${JSON.stringify(response.data, null, 2)}`, 'reset');
    return true;
  } catch (error) {
    log('✗ Asset retrieval failed', 'red');
    log(`  Error: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

async function testUpdateAsset() {
  try {
    log('\n=== TEST 5: Update Asset ===', 'blue');
    if (!createdAssetId) {
      log('✗ No asset ID available', 'red');
      return false;
    }

    const updateData = {
      name: 'Audio Set Test Updated',
      details: 'Updated details - Complete audio system',
      value: 18000.00,
      asset_source: 'donation',
      source_details: 'Updated source details',
      donor_name: 'Updated Donor Name',
      donor_contact: '9876543210'
    };

    const response = await axios.put(
      `${API_BASE}/api/assets/${createdAssetId}`,
      updateData,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    log('✓ Asset updated successfully', 'green');
    log(`  Response: ${JSON.stringify(response.data, null, 2)}`, 'reset');
    return true;
  } catch (error) {
    log('✗ Asset update failed', 'red');
    log(`  Error: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

async function testGetAssetLogs() {
  try {
    log('\n=== TEST 6: Get Asset Logs ===', 'blue');
    if (!createdAssetId) {
      log('✗ No asset ID available', 'red');
      return false;
    }

    const response = await axios.get(
      `${API_BASE}/api/assets/${createdAssetId}/logs`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    log('✓ Asset logs retrieved successfully', 'green');
    log(`  Log count: ${response.data.data?.length || 0}`, 'reset');
    log(`  Response: ${JSON.stringify(response.data, null, 2)}`, 'reset');
    return true;
  } catch (error) {
    log('✗ Asset logs retrieval failed', 'red');
    log(`  Error: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

async function testConvertToCash() {
  try {
    log('\n=== TEST 7: Convert Asset to Cash ===', 'blue');
    if (!createdAssetId) {
      log('✗ No asset ID available', 'red');
      return false;
    }

    const response = await axios.post(
      `${API_BASE}/api/assets/${createdAssetId}/convert-to-cash`,
      {},
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    log('✓ Asset converted to cash successfully', 'green');
    log(`  Income Entry ID: ${response.data.incomeEntryId}`, 'reset');
    log(`  Converted Value: ${response.data.convertedValue}`, 'reset');
    log(`  Response: ${JSON.stringify(response.data, null, 2)}`, 'reset');
    return true;
  } catch (error) {
    log('✗ Asset conversion failed', 'red');
    log(`  Error: ${error.response?.data?.error || error.message}`, 'red');
    if (error.response?.data) {
      log(`  Details: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    }
    return false;
  }
}

async function testUpdateConvertedAsset() {
  try {
    log('\n=== TEST 8: Try Update Converted Asset (Should Fail) ===', 'blue');
    if (!createdAssetId) {
      log('✗ No asset ID available', 'red');
      return false;
    }

    const updateData = {
      name: 'Should Not Update',
      details: 'This should fail',
      value: 100.00
    };

    const response = await axios.put(
      `${API_BASE}/api/assets/${createdAssetId}`,
      updateData,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    log('✗ Update should have failed but succeeded', 'red');
    return false;
  } catch (error) {
    if (error.response?.status === 400) {
      log('✓ Update correctly rejected for converted asset', 'green');
      log(`  Error: ${error.response?.data?.error || error.message}`, 'reset');
      return true;
    }
    log('✗ Unexpected error', 'red');
    log(`  Error: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

async function testDeleteConvertedAsset() {
  try {
    log('\n=== TEST 9: Try Delete Converted Asset (Should Fail) ===', 'blue');
    if (!createdAssetId) {
      log('✗ No asset ID available', 'red');
      return false;
    }

    const response = await axios.delete(
      `${API_BASE}/api/assets/${createdAssetId}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    log('✗ Delete should have failed but succeeded', 'red');
    return false;
  } catch (error) {
    if (error.response?.status === 400) {
      log('✓ Delete correctly rejected for converted asset', 'green');
      log(`  Error: ${error.response?.data?.error || error.message}`, 'reset');
      return true;
    }
    log('✗ Unexpected error', 'red');
    log(`  Error: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

async function testValidationErrors() {
  try {
    log('\n=== TEST 10: Validation Errors ===', 'blue');
    
    // Test missing name
    try {
      await axios.post(
        `${API_BASE}/api/assets`,
        { value: 100 },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      log('✗ Missing name should have failed', 'red');
      return false;
    } catch (error) {
      if (error.response?.status === 400) {
        log('✓ Missing name correctly rejected', 'green');
      }
    }

    // Test negative value
    try {
      await axios.post(
        `${API_BASE}/api/assets`,
        { name: 'Test', value: -100 },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      log('✗ Negative value should have failed', 'red');
      return false;
    } catch (error) {
      if (error.response?.status === 400) {
        log('✓ Negative value correctly rejected', 'green');
      }
    }

    return true;
  } catch (error) {
    log('✗ Validation test failed', 'red');
    return false;
  }
}

async function testUnauthorizedAccess() {
  try {
    log('\n=== TEST 11: Unauthorized Access ===', 'blue');
    
    // Test without token
    try {
      await axios.get(`${API_BASE}/api/assets`);
      log('✗ Request without token should have failed', 'red');
      return false;
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        log('✓ Unauthorized request correctly rejected', 'green');
      }
    }

    return true;
  } catch (error) {
    log('✗ Unauthorized access test failed', 'red');
    return false;
  }
}

async function runAllTests() {
  log('========================================', 'blue');
  log('ASSET MANAGEMENT API TEST SUITE', 'blue');
  log('========================================', 'blue');
  log(`API Base: ${API_BASE}`, 'yellow');

  const results = [];

  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    log('\n========================================', 'red');
    log('TESTS ABORTED - Login Failed', 'red');
    log('========================================', 'red');
    return;
  }

  // Run all tests
  results.push({ name: 'Create Asset', passed: await testCreateAsset() });
  results.push({ name: 'List Assets', passed: await testListAssets() });
  results.push({ name: 'Get Asset', passed: await testGetAsset() });
  results.push({ name: 'Update Asset', passed: await testUpdateAsset() });
  results.push({ name: 'Get Asset Logs', passed: await testGetAssetLogs() });
  results.push({ name: 'Convert to Cash', passed: await testConvertToCash() });
  results.push({ name: 'Update Converted (Should Fail)', passed: await testUpdateConvertedAsset() });
  results.push({ name: 'Delete Converted (Should Fail)', passed: await testDeleteConvertedAsset() });
  results.push({ name: 'Validation Errors', passed: await testValidationErrors() });
  results.push({ name: 'Unauthorized Access', passed: await testUnauthorizedAccess() });

  // Summary
  log('\n========================================', 'blue');
  log('TEST SUMMARY', 'blue');
  log('========================================', 'blue');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  results.forEach(r => {
    const color = r.passed ? 'green' : 'red';
    log(`${r.passed ? '✓' : '✗'} ${r.name}`, color);
  });

  log('\n----------------------------------------', 'blue');
  log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`, passed === results.length ? 'green' : 'yellow');
  log('========================================', 'blue');
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(`
Usage: node test-assets-api.js [options]

Options:
  --help          Show this help message
  --base=<url>    Set API base URL (default: http://localhost:4000)

Environment Variables:
  API_BASE        API base URL

Example:
  node test-assets-api.js --base=http://localhost:4000
  API_BASE=http://localhost:4000 node test-assets-api.js
`);
  process.exit(0);
}

// Parse --base argument
const baseArg = args.find(arg => arg.startsWith('--base='));
if (baseArg) {
  process.env.API_BASE = baseArg.split('=')[1];
}

// Run tests
runAllTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
