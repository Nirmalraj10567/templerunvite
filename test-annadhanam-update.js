const fetch = require('node-fetch');

async function testAnnadhanamUpdate() {
  console.log('🔍 Testing Annadhanam Update Functionality...\n');

  // You'll need to replace this with a real token
  const token = 'your-test-token-here';
  
  const baseUrl = 'http://localhost:4000/api/annadhanam';
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    // Step 1: Create a test entry first
    console.log('1. Creating test annadhanam entry...');
    const createResponse = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Test User for Update',
        mobileNumber: '9876543210',
        food: 'Rice, Sambar',
        peoples: 3,
        time: '10:00',
        fromDate: '2025-09-28',
        toDate: '2025-09-28',
        remarks: 'Original test entry'
      })
    });
    
    console.log('Create status:', createResponse.status);
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.log('Create error:', errorText);
      return;
    }
    
    const createData = await createResponse.json();
    console.log('Created entry:', JSON.stringify(createData, null, 2));
    
    if (!createData.success || !createData.data?.id) {
      console.log('❌ Failed to create entry for testing');
      return;
    }
    
    const entryId = createData.data.id;
    console.log(`\n✅ Created entry with ID: ${entryId}`);

    // Step 2: Test the update
    console.log('\n2. Testing update operation...');
    const updateResponse = await fetch(`${baseUrl}/${entryId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        name: 'Updated Test User',
        mobileNumber: '9876543210',
        food: 'Rice, Sambar, Curry, Pickle',
        peoples: 5,
        time: '11:00',
        fromDate: '2025-09-28',
        toDate: '2025-09-28',
        remarks: 'Updated test entry with more details'
      })
    });
    
    console.log('Update status:', updateResponse.status);
    if (updateResponse.ok) {
      const updateData = await updateResponse.json();
      console.log('Update response:', JSON.stringify(updateData, null, 2));
      console.log('✅ Update successful!');
    } else {
      const errorText = await updateResponse.text();
      console.log('❌ Update error:', errorText);
    }

    // Step 3: Check logs for the update
    console.log('\n3. Checking logs for update...');
    const logsResponse = await fetch(`${baseUrl}/${entryId}/logs`, { headers });
    console.log('Logs status:', logsResponse.status);
    
    if (logsResponse.ok) {
      const logsData = await logsResponse.json();
      console.log('Logs response:', JSON.stringify(logsData, null, 2));
      
      if (logsData.success && logsData.data && logsData.data.length > 0) {
        console.log('✅ Found logs for the entry:');
        logsData.data.forEach((log, index) => {
          console.log(`  ${index + 1}. Action: ${log.action}, Time: ${log.created_at}`);
        });
      } else {
        console.log('⚠️  No logs found for the entry');
      }
    } else {
      const errorText = await logsResponse.text();
      console.log('Logs error:', errorText);
    }

    // Step 4: Test different donation types
    console.log('\n4. Testing product donation update...');
    const productUpdateResponse = await fetch(`${baseUrl}/${entryId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        name: 'Updated Test User',
        mobileNumber: '9876543210',
        donationType: 'product',
        productName: 'Coconut Oil',
        quantity: '2',
        time: '12:00',
        fromDate: '2025-09-28',
        toDate: '2025-09-28',
        remarks: 'Updated to product donation'
      })
    });
    
    console.log('Product update status:', productUpdateResponse.status);
    if (productUpdateResponse.ok) {
      const productUpdateData = await productUpdateResponse.json();
      console.log('Product update response:', JSON.stringify(productUpdateData, null, 2));
      console.log('✅ Product update successful!');
    } else {
      const errorText = await productUpdateResponse.text();
      console.log('❌ Product update error:', errorText);
    }

    // Step 5: Test money donation update
    console.log('\n5. Testing money donation update...');
    const moneyUpdateResponse = await fetch(`${baseUrl}/${entryId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        name: 'Updated Test User',
        mobileNumber: '9876543210',
        donationType: 'money',
        amount: '500',
        time: '13:00',
        fromDate: '2025-09-28',
        toDate: '2025-09-28',
        remarks: 'Updated to money donation'
      })
    });
    
    console.log('Money update status:', moneyUpdateResponse.status);
    if (moneyUpdateResponse.ok) {
      const moneyUpdateData = await moneyUpdateResponse.json();
      console.log('Money update response:', JSON.stringify(moneyUpdateData, null, 2));
      console.log('✅ Money update successful!');
    } else {
      const errorText = await moneyUpdateResponse.text();
      console.log('❌ Money update error:', errorText);
    }

    // Step 6: Final logs check
    console.log('\n6. Final logs check...');
    const finalLogsResponse = await fetch(`${baseUrl}/${entryId}/logs`, { headers });
    if (finalLogsResponse.ok) {
      const finalLogsData = await finalLogsResponse.json();
      console.log('Final logs count:', finalLogsData.data?.length || 0);
      if (finalLogsData.data && finalLogsData.data.length > 0) {
        console.log('All logs:');
        finalLogsData.data.forEach((log, index) => {
          console.log(`  ${index + 1}. ${log.action} at ${log.created_at}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Instructions
console.log('📋 Instructions:');
console.log('1. Make sure your server is running on localhost:4000');
console.log('2. Update the token variable with a real authentication token');
console.log('3. Run: node test-annadhanam-update.js');
console.log('');

testAnnadhanamUpdate();
