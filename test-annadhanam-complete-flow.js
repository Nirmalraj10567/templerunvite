const fetch = require('node-fetch');

async function testAnnadhanamCompleteFlow() {
  console.log('🔍 Testing Complete Annadhanam Flow with Logs...\n');

  // You'll need to replace this with a real token
  const token = 'your-test-token-here';
  
  const baseUrl = 'http://localhost:4000/api/annadhanam';
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    // Step 1: Create an annadhanam entry
    console.log('1. Creating annadhanam entry...');
    const createPayload = {
      name: 'Test User for Complete Flow',
      mobile_number: '9876543210',
      food: 'Rice, Sambar, Curry',
      peoples: 3,
      time: '10:00',
      from_date: '2025-09-28',
      to_date: '2025-09-28',
      remarks: 'Test entry for complete flow'
    };
    
    const createResponse = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(createPayload)
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
      console.log('❌ Failed to create entry');
      return;
    }
    
    const entryId = createData.data.id;
    console.log(`✅ Created entry with ID: ${entryId}`);

    // Step 2: Wait a moment for logs to be created
    console.log('\n2. Waiting for logs to be created...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Check logs for this specific entry
    console.log('\n3. Checking logs for specific entry...');
    const specificLogsResponse = await fetch(`${baseUrl}/${entryId}/logs`, { headers });
    console.log('Specific logs status:', specificLogsResponse.status);
    
    if (specificLogsResponse.ok) {
      const specificLogsData = await specificLogsResponse.json();
      console.log('Specific logs response:', JSON.stringify(specificLogsData, null, 2));
      
      if (specificLogsData.success && specificLogsData.data && specificLogsData.data.length > 0) {
        console.log('✅ Found logs for specific entry!');
        specificLogsData.data.forEach((log, index) => {
          console.log(`  ${index + 1}. Action: ${log.action}, Time: ${log.created_at}`);
        });
      } else {
        console.log('⚠️  No logs found for specific entry');
      }
    } else {
      const errorText = await specificLogsResponse.text();
      console.log('Specific logs error:', errorText);
    }

    // Step 4: Update the entry to generate update logs
    console.log('\n4. Updating entry to generate update logs...');
    const updatePayload = {
      name: 'Updated Test User',
      mobile_number: '9876543210',
      food: 'Rice, Sambar, Curry, Pickle',
      peoples: 5,
      time: '11:00',
      from_date: '2025-09-28',
      to_date: '2025-09-28',
      remarks: 'Updated entry for complete flow'
    };
    
    const updateResponse = await fetch(`${baseUrl}/${entryId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updatePayload)
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

    // Step 5: Wait for update logs to be created
    console.log('\n5. Waiting for update logs to be created...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 6: Check logs after update
    console.log('\n6. Checking logs after update...');
    const updateLogsResponse = await fetch(`${baseUrl}/${entryId}/logs`, { headers });
    if (updateLogsResponse.ok) {
      const updateLogsData = await updateLogsResponse.json();
      console.log('Update logs response:', JSON.stringify(updateLogsData, null, 2));
      
      if (updateLogsData.success && updateLogsData.data && updateLogsData.data.length > 0) {
        console.log('✅ Found logs after update!');
        updateLogsData.data.forEach((log, index) => {
          console.log(`  ${index + 1}. Action: ${log.action}, Time: ${log.created_at}`);
        });
      } else {
        console.log('⚠️  No logs found after update');
      }
    } else {
      const errorText = await updateLogsResponse.text();
      console.log('Update logs error:', errorText);
    }

    // Step 7: Check all logs
    console.log('\n7. Checking all logs...');
    const allLogsResponse = await fetch(`${baseUrl}/logs`, { headers });
    console.log('All logs status:', allLogsResponse.status);
    
    if (allLogsResponse.ok) {
      const allLogsData = await allLogsResponse.json();
      console.log('All logs response:', JSON.stringify(allLogsData, null, 2));
      
      if (allLogsData.success && allLogsData.data && allLogsData.data.length > 0) {
        console.log('✅ Found all logs!');
        console.log(`Total logs: ${allLogsData.total}`);
        allLogsData.data.forEach((log, index) => {
          console.log(`  ${index + 1}. Action: ${log.action}, Name: ${log.annadhanam_name}, Time: ${log.created_at}`);
        });
      } else {
        console.log('⚠️  No logs found in all logs');
      }
    } else {
      const errorText = await allLogsResponse.text();
      console.log('All logs error:', errorText);
    }

    // Step 8: Test frontend integration
    console.log('\n8. Frontend Integration Test:');
    console.log('✅ Frontend changes made:');
    console.log('  - Added automatic log fetching on component mount (edit mode)');
    console.log('  - Added log fetching after successful updates');
    console.log('  - Added debug logging to fetchLogs function');
    console.log('  - Set lastCreatedId for proper log tracking');
    console.log('  - Added comprehensive error handling');

    console.log('\n📋 Next Steps:');
    console.log('1. Update the token variable with a real authentication token');
    console.log('2. Run: node test-annadhanam-complete-flow.js');
    console.log('3. Check server console for debug messages');
    console.log('4. Test the frontend by:');
    console.log('   - Creating a new annadhanam entry');
    console.log('   - Editing an existing entry');
    console.log('   - Clicking "Show Logs" button');
    console.log('   - Checking browser console for debug messages');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

console.log('📋 Complete Annadhanam Flow Test');
console.log('This test will:');
console.log('1. Create an annadhanam entry');
console.log('2. Check for creation logs');
console.log('3. Update the entry');
console.log('4. Check for update logs');
console.log('5. Verify all logs endpoint');
console.log('6. Show frontend integration status');
console.log('');

testAnnadhanamCompleteFlow();
