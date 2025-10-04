const fetch = require('node-fetch');

async function testEndpoints() {
  console.log('🔍 Testing Annadhanam API Endpoints...\n');

  // You'll need to replace this with a real token
  const token = 'your-test-token-here';
  
  const baseUrl = 'http://localhost:4000hanam';
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    // Test 1: Check if server is running
    console.log('1. Testing server connection...');
    const healthCheck = await fetch('http://localhost:4000hanam', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Server status:', healthCheck.status);
    
    if (healthCheck.status === 401) {
      console.log('⚠️  Authentication required. Please update the token in this script.');
      return;
    }

    // Test 2: Test /logs endpoint
    console.log('\n2. Testing /logs endpoint...');
    const logsResponse = await fetch(`${baseUrl}/logs`, { headers });
    console.log('Logs endpoint status:', logsResponse.status);
    
    if (logsResponse.ok) {
      const logsData = await logsResponse.json();
      console.log('Logs response:', JSON.stringify(logsData, null, 2));
    } else {
      const errorText = await logsResponse.text();
      console.log('Error response:', errorText);
    }

    // Test 3: Test /:id/logs endpoint
    console.log('\n3. Testing /:id/logs endpoint...');
    const specificLogsResponse = await fetch(`${baseUrl}/1/logs`, { headers });
    console.log('Specific logs endpoint status:', specificLogsResponse.status);
    
    if (specificLogsResponse.ok) {
      const specificLogsData = await specificLogsResponse.json();
      console.log('Specific logs response:', JSON.stringify(specificLogsData, null, 2));
    } else {
      const errorText = await specificLogsResponse.text();
      console.log('Error response:', errorText);
    }

    // Test 4: Create a test entry to generate logs
    console.log('\n4. Creating test entry to generate logs...');
    const createResponse = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Test User for Logs',
        mobileNumber: '9876543210',
        food: 'Rice, Sambar, Curry',
        peoples: 3,
        time: '10:00',
        fromDate: '2025-09-28',
        toDate: '2025-09-28',
        remarks: 'Test entry to generate logs'
      })
    });
    
    console.log('Create response status:', createResponse.status);
    if (createResponse.ok) {
      const createData = await createResponse.json();
      console.log('Created entry:', JSON.stringify(createData, null, 2));
      
      if (createData.success && createData.data?.id) {
        const entryId = createData.data.id;
        console.log(`\n5. Testing logs for created entry (ID: ${entryId})...`);
        
        const entryLogsResponse = await fetch(`${baseUrl}/${entryId}/logs`, { headers });
        console.log('Entry logs status:', entryLogsResponse.status);
        
        if (entryLogsResponse.ok) {
          const entryLogsData = await entryLogsResponse.json();
          console.log('Entry logs:', JSON.stringify(entryLogsData, null, 2));
        } else {
          const errorText = await entryLogsResponse.text();
          console.log('Error response:', errorText);
        }
      }
    } else {
      const errorText = await createResponse.text();
      console.log('Create error:', errorText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Instructions
console.log('📋 Instructions:');
console.log('1. Make sure your server is running on localhost:4000');
console.log('2. Update the token variable with a real authentication token');
console.log('3. Run: node test-annadhanam-endpoints.js');
console.log('');

testEndpoints();
