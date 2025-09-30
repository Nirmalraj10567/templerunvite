// Test script to verify money donation to accounting integration
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:4000';

// You need to replace this with a valid JWT token from your browser
const TEST_TOKEN = 'YOUR_JWT_TOKEN_HERE';

async function testIntegration() {
  console.log('🧪 Testing Money Donation to Accounting Integration\n');

  try {
    // Test 1: Check if accounting accounts exist
    console.log('1️⃣ Checking accounting accounts...');
    const accountsResponse = await fetch(`${BASE_URL}/api/accounting/accounts`, {
      headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
    });

    if (!accountsResponse.ok) {
      throw new Error(`Accounts API failed: ${accountsResponse.status}`);
    }

    const accountsData = await accountsResponse.json();
    const accounts = accountsData.data || [];
    
    const cashAccount = accounts.find(acc => acc.code === 'CASH');
    const donationAccount = accounts.find(acc => acc.code === 'DONATION_INCOME');
    
    console.log(`   ✅ Total accounts: ${accounts.length}`);
    console.log(`   ✅ Cash account: ${cashAccount ? 'Found' : 'Missing'}`);
    console.log(`   ✅ Donation income account: ${donationAccount ? 'Found' : 'Missing'}`);

    // Test 2: Check money donations
    console.log('\n2️⃣ Checking money donations...');
    const donationsResponse = await fetch(`${BASE_URL}/api/money-donations`, {
      headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
    });

    if (!donationsResponse.ok) {
      throw new Error(`Money donations API failed: ${donationsResponse.status}`);
    }

    const donationsData = await donationsResponse.json();
    const donations = donationsData.data || [];
    
    console.log(`   ✅ Total money donations: ${donations.length}`);
    if (donations.length > 0) {
      const latest = donations[0];
      console.log(`   📋 Latest donation: ${latest.name} - ₹${latest.amount} (${latest.register_no})`);
    }

    // Test 3: Check journal entries
    console.log('\n3️⃣ Checking journal entries...');
    const journalResponse = await fetch(`${BASE_URL}/api/accounting/journal-entries`, {
      headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
    });

    if (!journalResponse.ok) {
      throw new Error(`Journal entries API failed: ${journalResponse.status}`);
    }

    const journalData = await journalResponse.json();
    const journalEntries = journalData.data || [];
    
    console.log(`   ✅ Total journal entries: ${journalEntries.length}`);
    
    // Check for money donation journal entries
    const donationJournalEntries = journalEntries.filter(entry => 
      entry.reference_number && entry.reference_number.startsWith('MD-')
    );
    
    console.log(`   ✅ Money donation journal entries: ${donationJournalEntries.length}`);

    // Test 4: Check income statement
    console.log('\n4️⃣ Checking income statement...');
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
    
    const incomeResponse = await fetch(
      `${BASE_URL}/api/accounting/reports/income-statement?start_date=${startOfMonth}&end_date=${endOfMonth}`,
      { headers: { 'Authorization': `Bearer ${TEST_TOKEN}` } }
    );

    if (!incomeResponse.ok) {
      throw new Error(`Income statement API failed: ${incomeResponse.status}`);
    }

    const incomeData = await incomeResponse.json();
    const incomeStatement = incomeData.data;
    
    console.log(`   ✅ Total income: ₹${incomeStatement.income.total_income}`);
    console.log(`   ✅ Total expenses: ₹${incomeStatement.expenses.total_expenses}`);
    console.log(`   ✅ Net income: ₹${incomeStatement.net_income}`);
    
    // Check for donation income
    const donationIncome = incomeStatement.income.items.find(item => 
      item.name.toLowerCase().includes('donation')
    );
    
    if (donationIncome) {
      console.log(`   ✅ Donation income found: ₹${donationIncome.amount}`);
    } else {
      console.log(`   ⚠️  No donation income found in income statement`);
    }

    console.log('\n🎉 Integration test completed successfully!');
    
    if (donationJournalEntries.length === 0 && donations.length > 0) {
      console.log('\n💡 Suggestion: Run the sync function to create journal entries for existing donations');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.message.includes('401') || error.message.includes('403')) {
      console.log('\n💡 Please update TEST_TOKEN with a valid JWT token from your browser');
      console.log('   1. Open browser dev tools');
      console.log('   2. Go to Application/Storage > Local Storage');
      console.log('   3. Copy the token value');
      console.log('   4. Replace TEST_TOKEN in this script');
    }
  }
}

if (TEST_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
  console.log('❌ Please update TEST_TOKEN with a valid JWT token');
  console.log('Instructions:');
  console.log('1. Login to your temple management system');
  console.log('2. Open browser dev tools (F12)');
  console.log('3. Go to Application/Storage > Local Storage');
  console.log('4. Find and copy the auth token');
  console.log('5. Replace TEST_TOKEN in this script');
  process.exit(1);
}

testIntegration();