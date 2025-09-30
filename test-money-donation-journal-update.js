/**
 * Test script to verify that money donation updates also update journal entries
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:4000/api';

// You'll need to replace this with a valid token
const TEST_TOKEN = 'your-test-token-here';

async function testMoneyDonationJournalUpdate() {
  console.log('=== Testing Money Donation Journal Update ===\n');

  try {
    // 1. Create a test money donation
    console.log('1. Creating test money donation...');
    const createData = {
      registerNo: '2025-TEST-001',
      date: '2025-01-15',
      name: 'Test Donor',
      fatherName: 'Test Father',
      address: 'Test Address',
      village: 'Test Village',
      phone: '1234567890',
      amount: '1000',
      reason: 'Test donation for journal update',
      transferTo: 'INCOME A/C'
    };

    const createResponse = await fetch(`${API_BASE}/money-donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      body: JSON.stringify(createData)
    });

    if (!createResponse.ok) {
      throw new Error(`Create failed: ${createResponse.status} ${await createResponse.text()}`);
    }

    const createResult = await createResponse.json();
    const donationId = createResult.data.id;
    console.log(`✓ Created donation with ID: ${donationId}`);

    // 2. Check if journal entry was created
    console.log('\n2. Checking if journal entry was created...');
    const journalResponse = await fetch(`${API_BASE}/journal/entries`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });

    if (journalResponse.ok) {
      const journalResult = await journalResponse.json();
      const relatedEntry = journalResult.data?.find(entry => 
        entry.reference_type === 'money_donation' && 
        entry.reference_id === donationId
      );

      if (relatedEntry) {
        console.log(`✓ Journal entry found with ID: ${relatedEntry.id}`);
        console.log(`  - Amount: ${relatedEntry.amount}`);
        console.log(`  - From: ${relatedEntry.from_account}`);
        console.log(`  - To: ${relatedEntry.to_account}`);
        console.log(`  - Remarks: ${relatedEntry.remarks}`);
      } else {
        console.log('⚠ No journal entry found for the donation');
      }
    }

    // 3. Update the money donation
    console.log('\n3. Updating money donation...');
    const updateData = {
      registerNo: '2025-TEST-001',
      date: '2025-01-16', // Changed date
      name: 'Test Donor Updated',
      fatherName: 'Test Father',
      address: 'Test Address',
      village: 'Test Village',
      phone: '1234567890',
      amount: '1500', // Changed amount
      reason: 'Updated test donation for journal update', // Changed reason
      transferTo: 'TEMPLE FUND' // Changed transfer account
    };

    const updateResponse = await fetch(`${API_BASE}/money-donations/${donationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      throw new Error(`Update failed: ${updateResponse.status} ${await updateResponse.text()}`);
    }

    const updateResult = await updateResponse.json();
    console.log('✓ Updated donation successfully');

    // 4. Check if journal entry was updated
    console.log('\n4. Checking if journal entry was updated...');
    const updatedJournalResponse = await fetch(`${API_BASE}/journal/entries`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });

    if (updatedJournalResponse.ok) {
      const updatedJournalResult = await updatedJournalResponse.json();
      const updatedEntry = updatedJournalResult.data?.find(entry => 
        entry.reference_type === 'money_donation' && 
        entry.reference_id === donationId
      );

      if (updatedEntry) {
        console.log(`✓ Journal entry updated successfully`);
        console.log(`  - New Amount: ${updatedEntry.amount} (should be 1500)`);
        console.log(`  - New Date: ${updatedEntry.date} (should be 2025-01-16)`);
        console.log(`  - New To Account: ${updatedEntry.to_account} (should be TEMPLE FUND)`);
        console.log(`  - New Remarks: ${updatedEntry.remarks} (should be updated reason)`);
      } else {
        console.log('❌ Journal entry not found after update');
      }
    }

    // 5. Clean up - delete the test donation
    console.log('\n5. Cleaning up test data...');
    const deleteResponse = await fetch(`${API_BASE}/money-donations/${donationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });

    if (deleteResponse.ok) {
      console.log('✓ Test donation deleted successfully');
      
      // Check if journal entry was also deleted
      const finalJournalResponse = await fetch(`${API_BASE}/journal/entries`, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`
        }
      });

      if (finalJournalResponse.ok) {
        const finalJournalResult = await finalJournalResponse.json();
        const remainingEntry = finalJournalResult.data?.find(entry => 
          entry.reference_type === 'money_donation' && 
          entry.reference_id === donationId
        );

        if (!remainingEntry) {
          console.log('✓ Journal entry deleted successfully');
        } else {
          console.log('⚠ Journal entry still exists after donation deletion');
        }
      }
    } else {
      console.log('⚠ Failed to delete test donation - you may need to clean up manually');
    }

    console.log('\n=== Test completed successfully! ===');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  if (TEST_TOKEN === 'your-test-token-here') {
    console.log('❌ Please update TEST_TOKEN with a valid authentication token');
    process.exit(1);
  }
  
  testMoneyDonationJournalUpdate();
}

module.exports = { testMoneyDonationJournalUpdate };