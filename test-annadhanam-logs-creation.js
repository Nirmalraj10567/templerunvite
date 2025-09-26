const fetch = require('node-fetch');

async function testAnnadhanamLogsCreation() {
  console.log('🔍 Testing Annadhanam Logs Creation...\n');

  // You'll need to replace this with a real token
  const token = 'your-test-token-here';
  
  const baseUrl = 'http://localhost:4000/api/annadhanam';
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    // Step 1: Create a test entry to trigger log creation
    console.log('1. Creating test annadhanam entry to generate logs...');
    const createResponse = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Test User for Logs Creation',
        mobileNumber: '9876543210',
        food: 'Rice, Sambar, Curry',
        peoples: 4,
        time: '10:00',
        fromDate: '2025-09-28',
        toDate: '2025-09-28',
        remarks: 'Test entry to check log creation'
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
      console.log('❌ Failed to create entry');
      return;
    }
    
    const entryId = createData.data.id;
    console.log(`\n✅ Created entry with ID: ${entryId}`);

    // Step 2: Check logs immediately after creation
    console.log('\n2. Checking logs after creation...');
    const createLogsResponse = await fetch(`${baseUrl}/${entryId}/logs`, { headers });
    console.log('Create logs status:', createLogsResponse.status);
    
    if (createLogsResponse.ok) {
      const createLogsData = await createLogsResponse.json();
      console.log('Create logs response:', JSON.stringify(createLogsData, null, 2));
      
      if (createLogsData.success && createLogsData.data && createLogsData.data.length > 0) {
        console.log('✅ Found logs after creation!');
        createLogsData.data.forEach((log, index) => {
          console.log(`  ${index + 1}. Action: ${log.action}, Time: ${log.created_at}`);
        });
      } else {
        console.log('⚠️  No logs found after creation');
      }
    } else {
      const errorText = await createLogsResponse.text();
      console.log('Create logs error:', errorText);
    }

    // Step 3: Update the entry to trigger update log
    console.log('\n3. Updating entry to generate update log...');
    const updateResponse = await fetch(`${baseUrl}/${entryId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        name: 'Updated Test User for Logs',
        mobileNumber: '9876543210',
        food: 'Rice, Sambar, Curry, Pickle, Sweet',
        peoples: 6,
        time: '11:00',
        fromDate: '2025-09-28',
        toDate: '2025-09-28',
        remarks: 'Updated entry to check update log creation'
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

    // Step 4: Check logs after update
    console.log('\n4. Checking logs after update...');
    const updateLogsResponse = await fetch(`${baseUrl}/${entryId}/logs`, { headers });
    console.log('Update logs status:', updateLogsResponse.status);
    
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

    // Step 5: Check all logs for the temple
    console.log('\n5. Checking all temple logs...');
    const allLogsResponse = await fetch(`${baseUrl}/logs`, { headers });
    console.log('All logs status:', allLogsResponse.status);
    
    if (allLogsResponse.ok) {
      const allLogsData = await allLogsResponse.json();
      console.log('All logs response:', JSON.stringify(allLogsData, null, 2));
      
      if (allLogsData.success && allLogsData.data && allLogsData.data.length > 0) {
        console.log('✅ Found temple logs!');
        console.log(`Total logs: ${allLogsData.total}`);
        allLogsData.data.forEach((log, index) => {
          console.log(`  ${index + 1}. ${log.action} - ${log.annadhanam_name} (ID: ${log.annadhanam_id}) at ${log.created_at}`);
        });
      } else {
        console.log('⚠️  No temple logs found');
      }
    } else {
      const errorText = await allLogsResponse.text();
      console.log('All logs error:', errorText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Instructions
console.log('📋 Instructions:');
console.log('1. Make sure your server is running on localhost:4000');
console.log('2. Update the token variable with a real authentication token');
console.log('3. Run: node test-annadhanam-logs-creation.js');
console.log('4. Check server console for any error messages');
console.log('');

testAnnadhanamLogsCreation();
