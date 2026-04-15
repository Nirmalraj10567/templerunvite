/**
 * Daybook Test Suite
 * 
 * This file contains comprehensive tests for the daybook API endpoints.
 * Run with: node daybook.test.js
 * 
 * Prerequisites:
 * - Server must be running on port 4000
 * - Database must be set up with daybook tables
 * - Valid user credentials with daybook permission
 */

// Load env to get the correct JWT_SECRET
require('dotenv').config({ path: require('path').join(__dirname, 'env') });

const axios = require('axios');
const jwt = require('jsonwebtoken');
const BASE_URL = 'http://127.0.0.1:4000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';

// Test credentials - Created via create-test-user-mysql.js
const TEST_USER = {
  mobile: '9999999999',     // Test user mobile (superadmin user)
  password: 'test123',      // Test user password
  username: 'test_admin',   // Test user username
  templeId: 1,              // Test user temple ID
  role: 'superadmin'        // Test user role (superadmin bypasses permission check)
};

// Test data
let authToken = '';
let createdEntryId = null;
const testEntryData = {
  entry_date: '2026-04-14',
  entry_type: 'income',
  description: 'Test donation received',
  amount: 5000.00,
  payment_mode: 'cash',
  party_name: 'Test Donor',
  party_mobile: '9876543210',
  notes: 'Test entry for unit testing'
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Utility functions
function logTest(testName, status, details = '') {
  const statusSymbol = status === 'PASS' ? '✅' : '❌';
  console.log(`${statusSymbol} ${testName}`);
  if (details) console.log(`   ${details}`);
  
  testResults.tests.push({
    name: testName,
    status,
    details,
    timestamp: new Date().toISOString()
  });
  
  if (status === 'PASS') {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

async function runTest(testName, testFn) {
  try {
    await testFn();
  } catch (error) {
    logTest(testName, 'FAIL', error.message);
  }
}

// Authentication helper
async function authenticateUser() {
  try {
    // Option 1: Login through API (if auth endpoint exists)
    try {
      const response = await axios.post(`${BASE_URL.replace('/api', '')}/api/mobile-auth/login`, {
        mobile: TEST_USER.mobile,
        password: TEST_USER.password
      });
      
      if (response.data && response.data.token) {
        authToken = response.data.token;
        logTest('Authentication via API', 'PASS');
        return;
      }
    } catch (authError) {
      // Option 2: Generate JWT token directly
      console.log('API login failed, generating JWT directly...');
      authToken = jwt.sign(
        {
          id: 1,
          mobile: TEST_USER.mobile,
          templeId: TEST_USER.templeId,
          role: TEST_USER.role
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      logTest('Authentication via direct JWT', 'PASS');
    }
  } catch (error) {
    logTest('Authentication', 'FAIL', error.message);
    throw error;
  }
}

// Test functions
async function testGetDaybook() {
  const response = await axios.get(`${BASE_URL}/daybook`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (response.status === 200 && response.data.success) {
    logTest('GET /api/daybook - List entries', 'PASS');
  } else {
    logTest('GET /api/daybook - List entries', 'FAIL', `Unexpected response: ${JSON.stringify(response.data)}`);
  }
}

async function testGetDaybookWithPagination() {
  const response = await axios.get(`${BASE_URL}/daybook?page=1&pageSize=10`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (response.status === 200 && response.data.success && response.data.data) {
    logTest('GET /api/daybook - Pagination', 'PASS', `Returned ${response.data.data.length} entries`);
  } else {
    logTest('GET /api/daybook - Pagination', 'FAIL');
  }
}

async function testGetDaybookWithSearch() {
  const response = await axios.get(`${BASE_URL}/daybook?q=test`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (response.status === 200 && response.data.success) {
    logTest('GET /api/daybook - Search', 'PASS');
  } else {
    logTest('GET /api/daybook - Search', 'FAIL');
  }
}

async function testGetDaybookWithDateFilter() {
  const response = await axios.get(`${BASE_URL}/daybook?from=2026-04-01&to=2026-04-30`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (response.status === 200 && response.data.success) {
    logTest('GET /api/daybook - Date filter', 'PASS');
  } else {
    logTest('GET /api/daybook - Date filter', 'FAIL');
  }
}

async function testGetNextReceiptNumber() {
  const response = await axios.get(`${BASE_URL}/daybook/next-receipt`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (response.status === 200 && response.data.success && response.data.receipt_number) {
    logTest('GET /api/daybook/next-receipt', 'PASS', `Next receipt: ${response.data.receipt_number}`);
  } else {
    logTest('GET /api/daybook/next-receipt', 'FAIL');
  }
}

async function testCreateDaybookEntry() {
  const response = await axios.post(`${BASE_URL}/daybook`, testEntryData, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (response.status === 201 && response.data.success && response.data.data) {
    createdEntryId = response.data.data.id;
    logTest('POST /api/daybook - Create entry', 'PASS', `Created entry ID: ${createdEntryId}`);
  } else {
    logTest('POST /api/daybook - Create entry', 'FAIL', JSON.stringify(response.data));
  }
}

async function testCreateDaybookEntryWithValidation() {
  // Test missing required fields
  try {
    await axios.post(`${BASE_URL}/daybook`, { description: 'Test' }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    logTest('POST /api/daybook - Validation (missing fields)', 'FAIL', 'Should have returned 400');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      logTest('POST /api/daybook - Validation (missing fields)', 'PASS');
    } else {
      logTest('POST /api/daybook - Validation (missing fields)', 'FAIL', error.message);
    }
  }
}

async function testCreateDaybookEntryInvalidType() {
  // Test invalid entry type
  try {
    await axios.post(`${BASE_URL}/daybook`, {
      entry_date: '2026-04-14',
      entry_type: 'invalid',
      description: 'Test',
      amount: 100
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    logTest('POST /api/daybook - Validation (invalid type)', 'FAIL', 'Should have returned 400');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      logTest('POST /api/daybook - Validation (invalid type)', 'PASS');
    } else {
      logTest('POST /api/daybook - Validation (invalid type)', 'FAIL', error.message);
    }
  }
}

async function testCreateDaybookEntryInvalidAmount() {
  // Test invalid amount
  try {
    await axios.post(`${BASE_URL}/daybook`, {
      entry_date: '2026-04-14',
      entry_type: 'income',
      description: 'Test',
      amount: -100
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    logTest('POST /api/daybook - Validation (negative amount)', 'FAIL', 'Should have returned 400');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      logTest('POST /api/daybook - Validation (negative amount)', 'PASS');
    } else {
      logTest('POST /api/daybook - Validation (negative amount)', 'FAIL', error.message);
    }
  }
}

async function testCreateDaybookEntryInvalidDate() {
  // Test invalid date format
  try {
    await axios.post(`${BASE_URL}/daybook`, {
      entry_date: '14-04-2026',
      entry_type: 'income',
      description: 'Test',
      amount: 100
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    logTest('POST /api/daybook - Validation (invalid date format)', 'FAIL', 'Should have returned 400');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      logTest('POST /api/daybook - Validation (invalid date format)', 'PASS');
    } else {
      logTest('POST /api/daybook - Validation (invalid date format)', 'FAIL', error.message);
    }
  }
}

async function testGetSingleEntry() {
  if (!createdEntryId) {
    logTest('GET /api/daybook/:id - Get single entry', 'FAIL', 'No entry ID available');
    return;
  }
  
  const response = await axios.get(`${BASE_URL}/daybook/${createdEntryId}`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (response.status === 200 && response.data.success && response.data.data) {
    logTest('GET /api/daybook/:id - Get single entry', 'PASS');
  } else {
    logTest('GET /api/daybook/:id - Get single entry', 'FAIL');
  }
}

async function testGetNonExistentEntry() {
  try {
    await axios.get(`${BASE_URL}/daybook/999999`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    logTest('GET /api/daybook/:id - Non-existent entry', 'FAIL', 'Should have returned 404');
  } catch (error) {
    if (error.response && error.response.status === 404) {
      logTest('GET /api/daybook/:id - Non-existent entry', 'PASS');
    } else {
      logTest('GET /api/daybook/:id - Non-existent entry', 'FAIL', error.message);
    }
  }
}

async function testUpdateDaybookEntry() {
  if (!createdEntryId) {
    logTest('PUT /api/daybook/:id - Update entry', 'FAIL', 'No entry ID available');
    return;
  }
  
  const updateData = {
    description: 'Updated test description',
    amount: 7500.00,
    notes: 'Updated notes'
  };
  
  const response = await axios.put(`${BASE_URL}/daybook/${createdEntryId}`, updateData, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (response.status === 200 && response.data.success && response.data.data) {
    if (response.data.data.description === updateData.description) {
      logTest('PUT /api/daybook/:id - Update entry', 'PASS');
    } else {
      logTest('PUT /api/daybook/:id - Update entry', 'FAIL', 'Data not updated correctly');
    }
  } else {
    logTest('PUT /api/daybook/:id - Update entry', 'FAIL', JSON.stringify(response.data));
  }
}

async function testUpdateNonExistentEntry() {
  try {
    await axios.put(`${BASE_URL}/daybook/999999`, { description: 'Test' }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    logTest('PUT /api/daybook/:id - Non-existent entry', 'FAIL', 'Should have returned 404');
  } catch (error) {
    if (error.response && error.response.status === 404) {
      logTest('PUT /api/daybook/:id - Non-existent entry', 'PASS');
    } else {
      logTest('PUT /api/daybook/:id - Non-existent entry', 'FAIL', error.message);
    }
  }
}

async function testGetLogs() {
  const response = await axios.get(`${BASE_URL}/daybook/logs`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (response.status === 200 && response.data.success) {
    logTest('GET /api/daybook/logs - Get all logs', 'PASS', `Found ${response.data.total} logs`);
  } else {
    logTest('GET /api/daybook/logs - Get all logs', 'FAIL');
  }
}

async function testGetEntryLogs() {
  if (!createdEntryId) {
    logTest('GET /api/daybook/:id/logs - Get entry logs', 'FAIL', 'No entry ID available');
    return;
  }
  
  const response = await axios.get(`${BASE_URL}/daybook/${createdEntryId}/logs`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (response.status === 200 && response.data.success) {
    logTest('GET /api/daybook/:id/logs - Get entry logs', 'PASS', `Found ${response.data.total} logs`);
  } else {
    logTest('GET /api/daybook/:id/logs - Get entry logs', 'FAIL');
  }
}

async function testGetStatsSummary() {
  const response = await axios.get(`${BASE_URL}/daybook/stats/summary`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (response.status === 200 && response.data.success && response.data.data) {
    const stats = response.data.data;
    logTest('GET /api/daybook/stats/summary', 'PASS', 
      `Income: ${stats.total_income || 0}, Expense: ${stats.total_expense || 0}, Balance: ${stats.current_balance || 0}`);
  } else {
    logTest('GET /api/daybook/stats/summary', 'FAIL');
  }
}

async function testGetStatsWithDateRange() {
  const response = await axios.get(`${BASE_URL}/daybook/stats/summary?from=2026-04-01&to=2026-04-30`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (response.status === 200 && response.data.success) {
    logTest('GET /api/daybook/stats/summary - Date range', 'PASS');
  } else {
    logTest('GET /api/daybook/stats/summary - Date range', 'FAIL');
  }
}

async function testExportCSV() {
  const response = await axios.get(`${BASE_URL}/daybook/export`, {
    headers: { Authorization: `Bearer ${authToken}` },
    responseType: 'text'
  });
  
  if (response.status === 200 && response.data.includes('Date,Receipt No,Type,Description')) {
    logTest('GET /api/daybook/export - CSV export', 'PASS');
  } else {
    logTest('GET /api/daybook/export - CSV export', 'FAIL', 'Invalid CSV format');
  }
}

async function testDeleteDaybookEntry() {
  if (!createdEntryId) {
    logTest('DELETE /api/daybook/:id - Delete entry', 'FAIL', 'No entry ID available');
    return;
  }
  
  const response = await axios.delete(`${BASE_URL}/daybook/${createdEntryId}`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (response.status === 200 && response.data.success) {
    logTest('DELETE /api/daybook/:id - Delete entry', 'PASS');
    createdEntryId = null; // Reset after deletion
  } else {
    logTest('DELETE /api/daybook/:id - Delete entry', 'FAIL', JSON.stringify(response.data));
  }
}

async function testDeleteNonExistentEntry() {
  try {
    await axios.delete(`${BASE_URL}/daybook/999999`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    logTest('DELETE /api/daybook/:id - Non-existent entry', 'FAIL', 'Should have returned 404');
  } catch (error) {
    if (error.response && error.response.status === 404) {
      logTest('DELETE /api/daybook/:id - Non-existent entry', 'PASS');
    } else {
      logTest('DELETE /api/daybook/:id - Non-existent entry', 'FAIL', error.message);
    }
  }
}

async function testUnauthorizedAccess() {
  try {
    await axios.get(`${BASE_URL}/daybook`);
    logTest('Authentication - Unauthorized access', 'FAIL', 'Should have returned 401');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      logTest('Authentication - Unauthorized access', 'PASS');
    } else {
      logTest('Authentication - Unauthorized access', 'FAIL', error.message);
    }
  }
}

async function testInvalidToken() {
  try {
    await axios.get(`${BASE_URL}/daybook`, {
      headers: { Authorization: 'Bearer invalid-token-here' }
    });
    logTest('Authentication - Invalid token', 'FAIL', 'Should have returned 403');
  } catch (error) {
    if (error.response && error.response.status === 403) {
      logTest('Authentication - Invalid token', 'PASS');
    } else {
      logTest('Authentication - Invalid token', 'FAIL', error.message);
    }
  }
}

async function testCreateExpenseEntry() {
  const expenseData = {
    entry_date: '2026-04-14',
    entry_type: 'expense',
    description: 'Test expense',
    amount: 2000.00,
    payment_mode: 'upi',
    party_name: 'Test Vendor',
    party_mobile: '9876543211',
    notes: 'Test expense entry'
  };
  
  const response = await axios.post(`${BASE_URL}/daybook`, expenseData, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (response.status === 201 && response.data.success) {
    // Clean up - delete the created entry
    await axios.delete(`${BASE_URL}/daybook/${response.data.data.id}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    logTest('POST /api/daybook - Create expense entry', 'PASS');
  } else {
    logTest('POST /api/daybook - Create expense entry', 'FAIL');
  }
}

async function testCreateJournalEntry() {
  const journalData = {
    entry_date: '2026-04-14',
    entry_type: 'journal',
    description: 'Test journal entry',
    amount: 1000.00,
    notes: 'Test journal entry (no balance impact)'
  };
  
  const response = await axios.post(`${BASE_URL}/daybook`, journalData, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (response.status === 201 && response.data.success) {
    // Clean up - delete the created entry
    await axios.delete(`${BASE_URL}/daybook/${response.data.data.id}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    logTest('POST /api/daybook - Create journal entry', 'PASS');
  } else {
    logTest('POST /api/daybook - Create journal entry', 'FAIL');
  }
}

async function testCreateMultipleEntriesForBalance() {
  // Create income entry
  await axios.post(`${BASE_URL}/daybook`, {
    entry_date: '2026-04-10',
    entry_type: 'income',
    description: 'Income for balance test',
    amount: 10000.00,
    payment_mode: 'cash'
  }, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  // Create expense entry
  const expenseResponse = await axios.post(`${BASE_URL}/daybook`, {
    entry_date: '2026-04-12',
    entry_type: 'expense',
    description: 'Expense for balance test',
    amount: 3000.00,
    payment_mode: 'cash'
  }, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (expenseResponse.status === 201 && expenseResponse.data.success) {
    // Verify running balance
    const statsResponse = await axios.get(`${BASE_URL}/daybook/stats/summary`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (statsResponse.data.data.current_balance >= 7000) {
      logTest('POST /api/daybook - Running balance calculation', 'PASS', 
        `Current balance: ${statsResponse.data.data.current_balance}`);
    } else {
      logTest('POST /api/daybook - Running balance calculation', 'FAIL', 
        `Expected balance >= 7000, got ${statsResponse.data.data.current_balance}`);
    }
  } else {
    logTest('POST /api/daybook - Running balance calculation', 'FAIL', 'Failed to create entries');
  }
}

// Print test summary
function printTestSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log('='.repeat(60));
  
  if (testResults.failed > 0) {
    console.log('\nFailed Tests:');
    testResults.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => {
        console.log(`  ❌ ${t.name}: ${t.details}`);
      });
    console.log('\n' + '='.repeat(60));
  }
  
  console.log('');
}

// Main test runner
async function runAllTests() {
  console.log('='.repeat(60));
  console.log('DAYBOOK API TEST SUITE');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  console.log('');
  
  try {
    // Step 1: Authenticate
    console.log('🔐 Step 1: Authentication');
    await authenticateUser();
    console.log('');
    
    // Step 2: Test unauthorized access
    console.log('🔒 Step 2: Authentication Tests');
    await runTest('Unauthorized access test', testUnauthorizedAccess);
    await runTest('Invalid token test', testInvalidToken);
    console.log('');
    
    // Step 3: Test GET endpoints
    console.log('📖 Step 3: GET Endpoint Tests');
    await runTest('Get daybook entries', testGetDaybook);
    await runTest('Get with pagination', testGetDaybookWithPagination);
    await runTest('Get with search', testGetDaybookWithSearch);
    await runTest('Get with date filter', testGetDaybookWithDateFilter);
    await runTest('Get next receipt number', testGetNextReceiptNumber);
    await runTest('Get stats summary', testGetStatsSummary);
    await runTest('Get stats with date range', testGetStatsWithDateRange);
    console.log('');
    
    // Step 4: Test POST endpoints (Create)
    console.log('➕ Step 4: POST Endpoint Tests (Create)');
    await runTest('Create entry validation', testCreateDaybookEntryWithValidation);
    await runTest('Create entry invalid type', testCreateDaybookEntryInvalidType);
    await runTest('Create entry invalid amount', testCreateDaybookEntryInvalidAmount);
    await runTest('Create entry invalid date', testCreateDaybookEntryInvalidDate);
    await runTest('Create income entry', testCreateDaybookEntry);
    await runTest('Create expense entry', testCreateExpenseEntry);
    await runTest('Create journal entry', testCreateJournalEntry);
    console.log('');
    
    // Step 5: Test GET single entry
    console.log('📄 Step 5: Single Entry Tests');
    await runTest('Get single entry', testGetSingleEntry);
    await runTest('Get non-existent entry', testGetNonExistentEntry);
    console.log('');
    
    // Step 6: Test UPDATE endpoints
    console.log('✏️ Step 6: PUT Endpoint Tests (Update)');
    await runTest('Update entry', testUpdateDaybookEntry);
    await runTest('Update non-existent entry', testUpdateNonExistentEntry);
    console.log('');
    
    // Step 7: Test logs
    console.log('📝 Step 7: Audit Log Tests');
    await runTest('Get all logs', testGetLogs);
    await runTest('Get entry logs', testGetEntryLogs);
    console.log('');
    
    // Step 8: Test export
    console.log('📤 Step 8: Export Tests');
    await runTest('Export CSV', testExportCSV);
    console.log('');
    
    // Step 9: Test DELETE endpoints
    console.log('🗑️ Step 9: DELETE Endpoint Tests');
    await runTest('Delete entry', testDeleteDaybookEntry);
    await runTest('Delete non-existent entry', testDeleteNonExistentEntry);
    console.log('');
    
    // Step 10: Test balance calculation
    console.log('💰 Step 10: Balance Calculation Tests');
    await runTest('Running balance', testCreateMultipleEntriesForBalance);
    console.log('');
    
    // Print summary
    printTestSummary();
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error.message);
    console.error(error.stack);
    printTestSummary();
    process.exit(1);
  }
}

// Run tests
runAllTests();
