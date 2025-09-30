const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

// Test script to verify money donation update works after fixes
async function testMoneyDonationUpdate() {
  try {
    console.log('🧪 Testing Money Donation Update Fix...\n');

    // You'll need to replace this with a valid token
    const token = 'your-test-token-here';
    
    if (token === 'your-test-token-here') {
      console.log('❌ Please replace the token with a valid authentication token');
      return;
    }

    // Step 1: Create a test money donation
    console.log('1. Creating test money donation...');
    const createResponse = await axios.post(`${BASE_URL}/api/money-donations`, {
      registerNo: 'TEST-UPDATE-001',
      date: new Date().toISOString().slice(0, 10),
      name: 'Test Donor Update',
      amount: 1000,
      reason: 'Test donation for update testing',
      transferTo: 'INCOME A/C'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const donationId = createResponse.data.data.id;
    console.log(`✅ Created donation with ID: ${donationId}`);

    // Step 2: Update the donation
    console.log('\n2. Updating donation...');
    const updateResponse = await axios.put(`${BASE_URL}/api/money-donations/${donationId}`, {
      name: 'Updated Test Donor',
      amount: 1500, // Changed amount
      reason: 'Updated test donation - should work now!'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Updated donation successfully');

    // Step 3: Check journal entries
    console.log('\n3. Checking journal entries...');
    const journalResponse = await axios.get(`${BASE_URL}/api/journal/entries`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const journalEntries = journalResponse.data.data || [];
    const donationJournalEntries = journalEntries.filter(entry => 
      entry.reference_type === 'money_donation' && entry.reference_id === donationId
    );
    
    console.log(`Found ${donationJournalEntries.length} journal entries for donation ${donationId}`);
    
    if (donationJournalEntries.length > 0) {
      const journalEntry = donationJournalEntries[0];
      console.log('Journal entry details:');
      console.log(`   Amount: ${journalEntry.amount}`);
      console.log(`   Remarks: ${journalEntry.remarks}`);
      console.log(`   From Account: ${journalEntry.from_account}`);
      console.log(`   To Account: ${journalEntry.to_account}`);
      
      if (journalEntry.amount === 1500) {
        console.log('✅ Journal entry correctly reflects the updated amount!');
      } else {
        console.log('❌ Journal entry amount does not match update');
      }
    } else {
      console.log('❌ No journal entries found for the donation');
    }

    // Step 4: Check money donation logs
    console.log('\n4. Checking money donation logs...');
    try {
      const logsResponse = await axios.get(`${BASE_URL}/api/money-donations/${donationId}/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const logs = logsResponse.data.data || [];
      console.log(`Found ${logs.length} logs for donation ${donationId}`);
      
      if (logs.length > 0) {
        const updateLog = logs.find(log => log.action === 'update');
        if (updateLog) {
          console.log('✅ Found update log entry');
          console.log(`   Action: ${updateLog.action}`);
          console.log(`   Created: ${updateLog.created_at}`);
        } else {
          console.log('❌ No update log found');
        }
      }
    } catch (logError) {
      console.log('⚠️ Could not fetch logs:', logError.message);
    }

    // Step 5: Clean up - delete the test donation
    console.log('\n5. Cleaning up test donation...');
    try {
      await axios.delete(`${BASE_URL}/api/money-donations/${donationId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Test donation deleted');
    } catch (cleanupError) {
      console.log('⚠️ Failed to delete test donation:', cleanupError.message);
    }

    console.log('\n🎉 Test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testMoneyDonationUpdate();
