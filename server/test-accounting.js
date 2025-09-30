const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3001'; // Adjust port as needed
const TEST_TOKEN = 'your-jwt-token-here'; // Replace with actual token

// Test data
const testAccount = {
  code: 'TEST_CASH',
  name: 'Test Cash Account',
  type: 'ASSET',
  category: 'Current Assets',
  initial_balance: 1000.00
};

const testJournalEntry = {
  date: '2024-01-15',
  reference_number: 'TEST-001',
  description: 'Test journal entry',
  entries: [
    {
      account_code: 'TEST_CASH',
      debit_amount: 500.00,
      credit_amount: 0.00,
      description: 'Test debit entry'
    },
    {
      account_code: 'DONATION_INCOME',
      debit_amount: 0.00,
      credit_amount: 500.00,
      description: 'Test credit entry'
    }
  ]
};

// Helper function to make API calls
async function apiCall(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error in ${method} ${endpoint}:`, error.response?.data || error.message);
    return null;
  }
}

// Test functions
async function testAccountCreation() {
  console.log('🧪 Testing account creation...');
  const result = await apiCall('POST', '/api/accounting/accounts', testAccount);
  if (result && result.success) {
    console.log('✅ Account created successfully:', result.data.name);
    return result.data.id;
  } else {
    console.log('❌ Failed to create account');
    return null;
  }
}

async function testAccountsList() {
  console.log('🧪 Testing accounts list...');
  const result = await apiCall('GET', '/api/accounting/accounts');
  if (result && result.success) {
    console.log(`✅ Retrieved ${result.data.length} accounts`);
    return true;
  } else {
    console.log('❌ Failed to retrieve accounts');
    return false;
  }
}

async function testJournalEntryCreation() {
  console.log('🧪 Testing journal entry creation...');
  const result = await apiCall('POST', '/api/accounting/journal-entries', testJournalEntry);
  if (result && result.success) {
    console.log('✅ Journal entry created successfully:', result.data.reference_number);
    return result.data.id;
  } else {
    console.log('❌ Failed to create journal entry');
    return null;
  }
}

async function testTrialBalance() {
  console.log('🧪 Testing trial balance report...');
  const result = await apiCall('GET', '/api/accounting/reports/trial-balance');
  if (result && result.success) {
    console.log(`✅ Trial balance generated with ${result.data.length} accounts`);
    return true;
  } else {
    console.log('❌ Failed to generate trial balance');
    return false;
  }
}

async function testBalanceSheet() {
  console.log('🧪 Testing balance sheet report...');
  const result = await apiCall('GET', '/api/accounting/reports/balance-sheet');
  if (result && result.success) {
    console.log('✅ Balance sheet generated successfully');
    console.log(`   - Total Assets: ${result.data.assets.total_assets}`);
    console.log(`   - Total Liabilities: ${result.data.liabilities.total_liabilities}`);
    console.log(`   - Total Equity: ${result.data.equity.total_equity}`);
    return true;
  } else {
    console.log('❌ Failed to generate balance sheet');
    return false;
  }
}

async function testIncomeStatement() {
  console.log('🧪 Testing income statement report...');
  const result = await apiCall('GET', '/api/accounting/reports/income-statement?start_date=2024-01-01&end_date=2024-12-31');
  if (result && result.success) {
    console.log('✅ Income statement generated successfully');
    console.log(`   - Total Income: ${result.data.income.total_income}`);
    console.log(`   - Total Expenses: ${result.data.expenses.total_expenses}`);
    console.log(`   - Net Income: ${result.data.net_income}`);
    return true;
  } else {
    console.log('❌ Failed to generate income statement');
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Accounting System Tests...\n');
  
  if (!TEST_TOKEN || TEST_TOKEN === 'your-jwt-token-here') {
    console.log('❌ Please set a valid JWT token in TEST_TOKEN variable');
    console.log('💡 You can get a token by logging into the system and checking the browser\'s localStorage');
    return;
  }
  
  let passed = 0;
  let total = 0;
  
  // Test 1: Create account
  total++;
  const accountId = await testAccountCreation();
  if (accountId) passed++;
  
  // Test 2: List accounts
  total++;
  if (await testAccountsList()) passed++;
  
  // Test 3: Create journal entry
  total++;
  const journalId = await testJournalEntryCreation();
  if (journalId) passed++;
  
  // Test 4: Trial balance
  total++;
  if (await testTrialBalance()) passed++;
  
  // Test 5: Balance sheet
  total++;
  if (await testBalanceSheet()) passed++;
  
  // Test 6: Income statement
  total++;
  if (await testIncomeStatement()) passed++;
  
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Accounting system is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the error messages above.');
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
📖 Accounting System Test Suite

Usage: node test-accounting.js [options]

Options:
  --help, -h     Show this help message

Before running:
1. Make sure your server is running on ${BASE_URL}
2. Update the TEST_TOKEN variable with a valid JWT token
3. Ensure you have admin/superadmin permissions

The test will:
- Create a test account
- List all accounts
- Create a test journal entry
- Generate trial balance report
- Generate balance sheet report
- Generate income statement report
`);
  process.exit(0);
}

// Run tests
runTests().catch(console.error);