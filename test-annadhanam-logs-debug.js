const fetch = require('node-fetch');

async function testAnnadhanamLogs() {
  console.log('🔍 Testing Annadhanam Logs API...\n');

  // Test 1: Check if annadhanam_logs table exists
  console.log('1. Testing table existence...');
  try {
    const response = await fetch('https://tmsapi.xesstechlink.com/api/annadhanam/logs', {
      headers: {
        'Authorization': 'Bearer your-test-token-here' // Replace with actual token
      }
    });
    
    console.log('Status:', response.status);
    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n2. Testing specific annadhanam logs...');
  try {
    const response = await fetch('https://tmsapi.xesstechlink.com/api/annadhanam/1/logs', {
      headers: {
        'Authorization': 'Bearer your-test-token-here' // Replace with actual token
      }
    });
    
    console.log('Status:', response.status);
    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n3. Testing annadhanam creation (to generate logs)...');
  try {
    const response = await fetch('https://tmsapi.xesstechlink.com/api/annadhanam', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your-test-token-here' // Replace with actual token
      },
      body: JSON.stringify({
        name: 'Test User',
        mobileNumber: '9876543210',
        food: 'Rice, Sambar',
        peoples: 5,
        time: '10:00',
        fromDate: '2025-09-28',
        toDate: '2025-09-28',
        remarks: 'Test entry for logs'
      })
    });
    
    console.log('Status:', response.status);
    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.success && result.data?.id) {
      console.log('\n4. Testing logs for newly created entry...');
      const logsResponse = await fetch(`https://tmsapi.xesstechlink.com/api/annadhanam/${result.data.id}/logs`, {
        headers: {
          'Authorization': 'Bearer your-test-token-here' // Replace with actual token
        }
      });
      
      console.log('Logs Status:', logsResponse.status);
      const logsResult = await logsResponse.json();
      console.log('Logs Response:', JSON.stringify(logsResult, null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the test
testAnnadhanamLogs().catch(console.error);
