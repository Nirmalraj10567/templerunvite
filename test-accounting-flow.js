// Test script to verify accounting flow for all donation types
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:4000';

// Replace with a valid JWT token from your browser
const TEST_TOKEN = 'YOUR_JWT_TOKEN_HERE';

async function testAccountingFlow() {
  console.log('🧪 Testing Universal Accounting Flow\n');

  try {
    // Test 1: Check current account balances
    console.log('1️⃣ Checking current account balances...');
    const accountsResponse = await fetch(`${BASE_URL}/api/accounting/accounts`, {
      headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
    });

    if (accountsResponse.ok) {
      const accountsData = await accountsResponse.json();
      const accounts = accountsData.data || [];
      
      console.log('📊 Current Account Balances:');
      accounts.forEach(account => {
        if (account.current_balance > 0) {
          console.log(`   ${account.name} (${account.code}): ₹${account.current_balance}`);
        }
      });
      
      const cashAccount = accounts.find(acc => acc.code === 'CASH');
      const donationAccount = accounts.find(acc => acc.code === 'DONATION_INCOME');
      
      console.log('\n💰 Key Accounts:');
      console.log(`   Cash Account: ${cashAccount ? `₹${cashAccount.current_balance}` : 'Not found'}`);
      console.log(`   Donation Income: ${donationAccount ? `₹${donationAccount.current_balance}` : 'Not found'}`);
    }

    // Test 2: Check recent journal entries
    console.log('\n2️⃣ Checking recent journal entries...');
    const journalResponse = await fetch(`${BASE_URL}/api/accounting/journal-entries?limit=10`, {
      headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
    });

    if (journalResponse.ok) {
      const journalData = await journalResponse.json();
      const entries = journalData.data || [];
      
      console.log(`📋 Found ${entries.length} recent journal entries:`);
      entries.forEach(entry => {
        console.log(`   ${entry.reference_number}: ₹${entry.total_amount} - ${entry.description}`);
        if (entry.entries && entry.entries.length > 0) {
          entry.entries.forEach(line => {
            const type = line.debit_amount > 0 ? 'DEBIT' : 'CREDIT';
            const amount = line.debit_amount > 0 ? line.debit_amount : line.credit_amount;
            console.log(`     ${type}: ${line.account_name} ₹${amount}`);
          });
        }
      });
    }

    // Test 3: Check income statement
    console.log('\n3️⃣ Checking income statement...');
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
    
    const incomeResponse = await fetch(
      `${BASE_URL}/api/accounting/reports/income-statement?start_date=${startOfMonth}&end_date=${endOfMonth}`,
      { headers: { 'Authorization': `Bearer ${TEST_TOKEN}` } }
    );

    if (incomeResponse.ok) {
      const incomeData = await incomeResponse.json();
      const statement = incomeData.data;
      
      console.log('📈 Income Statement (Current Month):');
      console.log(`   Total Income: ₹${statement.income.total_income}`);
      console.log(`   Total Expenses: ₹${statement.expenses.total_expenses}`);
      console.log(`   Net Income: ₹${statement.net_income}`);
      
      console.log('\n   Income Breakdown:');
      statement.income.items.forEach(item => {
        console.log(`     ${item.name}: ₹${item.amount}`);
      });
    }

    // Test 4: Verify double-entry balance
    console.log('\n4️⃣ Verifying double-entry balance...');
    const trialBalanceResponse = await fetch(`${BASE_URL}/api/accounting/reports/trial-balance`, {
      headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
    });

    if (trialBalanceResponse.ok) {
      const trialData = await trialBalanceResponse.json();
      const balances = trialData.data || [];
      
      let totalDebits = 0;
      let totalCredits = 0;
      
      balances.forEach(balance => {
        totalDebits += balance.debit_balance || 0;
        totalCredits += balance.credit_balance || 0;
      });
      
      console.log('⚖️ Trial Balance Check:');
      console.log(`   Total Debits: ₹${totalDebits.toFixed(2)}`);
      console.log(`   Total Credits: ₹${totalCredits.toFixed(2)}`);
      console.log(`   Difference: ₹${Math.abs(totalDebits - totalCredits).toFixed(2)}`);
      
      if (Math.abs(totalDebits - totalCredits) < 0.01) {
        console.log('   ✅ Books are balanced!');
      } else {
        console.log('   ❌ Books are NOT balanced!');
      }
    }

    console.log('\n🎉 Accounting flow test completed!');
    console.log('\n💡 To test the flow:');
    console.log('   1. Create a new money donation');
    console.log('   2. Check that Cash Account increases (Debit)');
    console.log('   3. Check that Donation Income increases (Credit)');
    console.log('   4. Verify the amounts match in reports');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.message.includes('401') || error.message.includes('403')) {
      console.log('\n💡 Please update TEST_TOKEN with a valid JWT token');
      console.log('   1. Login to your temple management system');
      console.log('   2. Open browser dev tools (F12)');
      console.log('   3. Go to Application/Storage > Local Storage');
      console.log('   4. Copy the auth token');
      console.log('   5. Replace TEST_TOKEN in this script');
    }
  }
}

if (TEST_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
  console.log('❌ Please update TEST_TOKEN with a valid JWT token');
  console.log('Instructions in the script comments above.');
  process.exit(1);
}

testAccountingFlow();