// Script to create a test money donation and verify accounting integration
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:4000';

// Replace with a valid JWT token
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjAsInVzZXJuYW1lIjoibmlybWFsIiwidGVtcGxlSWQiOjEyLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3Mjc2MzY5NzIsImV4cCI6MTcyNzcyMzM3Mn0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

async function createTestDonation() {
  console.log('🧪 Creating test money donation...\n');

  try {
    // Create a test money donation
    const donationData = {
      registerNo: '2025-TEST',
      date: new Date().toISOString().slice(0, 10),
      name: 'Test Donor',
      fatherName: 'Test Father',
      address: 'Test Address',
      village: 'Test Village',
      phone: '1234567890',
      amount: '500',
      reason: 'Test donation for accounting integration',
      transferTo: 'INCOME A/C'
    };

    console.log('📝 Creating donation:', donationData);

    const createResponse = await fetch(`${BASE_URL}/api/money-donations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(donationData)
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Create donation failed: ${createResponse.status} - ${errorText}`);
    }

    const createResult = await createResponse.json();
    console.log('✅ Donation created:', createResult.data);

    const donationId = createResult.data.id;
    const registerNo = createResult.data.register_no;

    // Wait a moment for any async processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if journal entry was created
    console.log('\n🔍 Checking for journal entry...');
    const journalResponse = await fetch(`${BASE_URL}/api/accounting/journal-entries`, {
      headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
    });

    if (!journalResponse.ok) {
      throw new Error(`Journal entries API failed: ${journalResponse.status}`);
    }

    const journalData = await journalResponse.json();
    const journalEntries = journalData.data || [];

    const donationJournalEntry = journalEntries.find(entry => 
      entry.reference_number === `MD-${registerNo}`
    );

    if (donationJournalEntry) {
      console.log('✅ Journal entry found:', donationJournalEntry.reference_number);
      console.log('   Description:', donationJournalEntry.description);
      console.log('   Amount:', donationJournalEntry.total_amount);
      
      // Check journal entry lines
      if (donationJournalEntry.entries && donationJournalEntry.entries.length > 0) {
        console.log('   Journal lines:');
        donationJournalEntry.entries.forEach((line, index) => {
          console.log(`     ${index + 1}. ${line.account_name}: Debit ₹${line.debit_amount}, Credit ₹${line.credit_amount}`);
        });
      }
    } else {
      console.log('❌ No journal entry found for donation');
    }

    // Check income statement
    console.log('\n📊 Checking income statement...');
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
    
    const incomeResponse = await fetch(
      `${BASE_URL}/api/accounting/reports/income-statement?start_date=${startOfMonth}&end_date=${endOfMonth}`,
      { headers: { 'Authorization': `Bearer ${TEST_TOKEN}` } }
    );

    if (incomeResponse.ok) {
      const incomeData = await incomeResponse.json();
      const incomeStatement = incomeData.data;
      
      console.log('✅ Income Statement:');
      console.log(`   Total Income: ₹${incomeStatement.income.total_income}`);
      console.log(`   Total Expenses: ₹${incomeStatement.expenses.total_expenses}`);
      console.log(`   Net Income: ₹${incomeStatement.net_income}`);
      
      const donationIncome = incomeStatement.income.items.find(item => 
        item.name.toLowerCase().includes('donation')
      );
      
      if (donationIncome) {
        console.log(`   Donation Income: ₹${donationIncome.amount}`);
      }
    }

    console.log('\n🎉 Test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.message.includes('401') || error.message.includes('403')) {
      console.log('\n💡 Token may be invalid or expired');
      console.log('Please get a fresh token from your browser and update TEST_TOKEN');
    }
  }
}

createTestDonation();