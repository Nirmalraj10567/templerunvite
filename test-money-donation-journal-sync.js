const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

// Test script to verify money donation journal sync works after updates
async function testMoneyDonationJournalSync() {
  try {
    console.log('🧪 Testing Money Donation Journal Sync...\n');

    // Step 1: Create a test money donation
    console.log('1. Creating test money donation...');
    const createResponse = await axios.post(`${BASE_URL}/api/money-donations`, {
      registerNo: 'TEST-001',
      date: new Date().toISOString().slice(0, 10),
      name: 'Test Donor',
      amount: 1000,
      reason: 'Test donation for journal sync',
      transferTo: 'INCOME A/C'
    }, {
      headers: {
        'Authorization': 'Bearer test-token', // You'll need to replace with actual token
        'Content-Type': 'application/json'
      }
    });

    const donationId = createResponse.data.data.id;
    console.log(`✅ Created donation with ID: ${donationId}`);

    // Step 2: Check initial journal entry
    console.log('\n2. Checking initial journal entry...');
    const initialJournalResponse = await axios.get(`${BASE_URL}/api/journal/entries`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    const initialEntries = initialJournalResponse.data.data || [];
    const initialDonationEntries = initialEntries.filter(entry => 
      entry.reference_type === 'money_donation' && entry.reference_id === donationId
    );
    console.log(`Found ${initialDonationEntries.length} initial journal entries for donation ${donationId}`);

    // Step 3: Update the donation
    console.log('\n3. Updating donation...');
    const updateResponse = await axios.put(`${BASE_URL}/api/money-donations/${donationId}`, {
      name: 'Updated Test Donor',
      amount: 1500, // Changed amount
      reason: 'Updated test donation for journal sync'
    }, {
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Updated donation');

    // Step 4: Check journal entries after update
    console.log('\n4. Checking journal entries after update...');
    const updatedJournalResponse = await axios.get(`${BASE_URL}/api/journal/entries`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    const updatedEntries = updatedJournalResponse.data.data || [];
    const updatedDonationEntries = updatedEntries.filter(entry => 
      entry.reference_type === 'money_donation' && entry.reference_id === donationId
    );
    console.log(`Found ${updatedDonationEntries.length} journal entries for donation ${donationId} after update`);

    // Step 5: Verify the journal entry reflects the update
    if (updatedDonationEntries.length > 0) {
      const journalEntry = updatedDonationEntries[0];
      console.log('\n5. Journal entry details:');
      console.log(`   Amount: ${journalEntry.amount}`);
      console.log(`   Remarks: ${journalEntry.remarks}`);
      console.log(`   From Account: ${journalEntry.from_account}`);
      console.log(`   To Account: ${journalEntry.to_account}`);
      
      if (journalEntry.amount === 1500 && journalEntry.remarks.includes('Updated test donation')) {
        console.log('✅ Journal entry correctly reflects the update!');
      } else {
        console.log('❌ Journal entry does not reflect the update');
      }
    } else {
      console.log('❌ No journal entries found after update');
    }

    // Step 6: Clean up - delete the test donation
    console.log('\n6. Cleaning up test donation...');
    try {
      await axios.delete(`${BASE_URL}/api/money-donations/${donationId}`, {
        headers: { 'Authorization': 'Bearer test-token' }
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
testMoneyDonationJournalSync();
