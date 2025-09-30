// Test script to check accounting integration
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:4000';

async function testAccountingIntegration() {
  try {
    console.log('Testing accounting integration...');
    
    // Test 1: Check if accounting accounts exist
    console.log('\n1. Checking accounting accounts...');
    const accountsResponse = await fetch(`${BASE_URL}/api/accounting/accounts`, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
      }
    });
    
    if (accountsResponse.ok) {
      const accountsData = await accountsResponse.json();
      console.log('✅ Accounts found:', accountsData.data?.length || 0);
      
      // Check for required accounts
      const accounts = accountsData.data || [];
      const cashAccount = accounts.find(acc => acc.code === 'CASH' || acc.name.toLowerCase().includes('cash'));
      const donationAccount = accounts.find(acc => acc.code === 'DONATION_INCOME' || acc.name.toLowerCase().includes('donation'));
      
      console.log('Cash account exists:', !!cashAccount);
      console.log('Donation income account exists:', !!donationAccount);
    } else {
      console.log('❌ Failed to fetch accounts:', accountsResponse.status);
    }
    
    // Test 2: Check money donations
    console.log('\n2. Checking money donations...');
    const donationsResponse = await fetch(`${BASE_URL}/api/money-donations`, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
      }
    });
    
    if (donationsResponse.ok) {
      const donationsData = await donationsResponse.json();
      console.log('✅ Money donations found:', donationsData.data?.length || 0);
    } else {
      console.log('❌ Failed to fetch money donations:', donationsResponse.status);
    }
    
    // Test 3: Check journal entries
    console.log('\n3. Checking journal entries...');
    const journalResponse = await fetch(`${BASE_URL}/api/accounting/journal-entries`, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
      }
    });
    
    if (journalResponse.ok) {
      const journalData = await journalResponse.json();
      console.log('✅ Journal entries found:', journalData.data?.length || 0);
    } else {
      console.log('❌ Failed to fetch journal entries:', journalResponse.status);
    }
    
    console.log('\nTest completed. Please replace YOUR_TOKEN_HERE with an actual JWT token to run this test.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAccountingIntegration();