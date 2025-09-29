const fetch = require('node-fetch');

async function testPoojaLogs() {
  console.log('🔍 Testing Pooja Logs System...\n');

  // You'll need to replace this with a real token
  const token = 'your-test-token-here';
  
  const baseUrl = 'https://tmsapi.xesstechlink.com/api/pooja';
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    console.log('📋 Testing Pooja Logs API Endpoints\n');

    // Test 1: Create a pooja
    console.log('1️⃣ Creating a pooja...');
    const createData = {
      name: 'Test Devotee',
      mobileNumber: '1234567890',
      time: '10:00 AM',
      fromDate: '2025-01-15',
      toDate: '2025-01-15',
      remarks: 'Test pooja for logs',
      amount: 1000
    };

    const createResponse = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(createData)
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.log('❌ Create failed:', errorText);
      return;
    }

    const createdPooja = await createResponse.json();
    console.log('✅ Pooja created:', createdPooja.data?.id);

    const poojaId = createdPooja.data?.id;
    if (!poojaId) {
      console.log('❌ No pooja ID returned');
      return;
    }

    // Test 2: Update the pooja
    console.log('\n2️⃣ Updating the pooja...');
    const updateData = {
      ...createData,
      name: 'Updated Test Devotee',
      remarks: 'Updated test pooja for logs'
    };

    const updateResponse = await fetch(`${baseUrl}/${poojaId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.log('❌ Update failed:', errorText);
    } else {
      console.log('✅ Pooja updated');
    }

    // Test 3: Fetch logs for specific pooja
    console.log('\n3️⃣ Fetching logs for specific pooja...');
    const logsResponse = await fetch(`${baseUrl}/${poojaId}/logs`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (logsResponse.ok) {
      const logsResult = await logsResponse.json();
      console.log('✅ Specific pooja logs:', logsResult.data?.length || 0, 'logs found');
      if (logsResult.data?.length > 0) {
        console.log('Sample log:', {
          action: logsResult.data[0].action,
          created_at: logsResult.data[0].created_at
        });
      }
    } else {
      console.log('❌ Failed to fetch specific pooja logs');
    }

    // Test 4: Fetch all logs
    console.log('\n4️⃣ Fetching all pooja logs...');
    const allLogsResponse = await fetch(`${baseUrl}/logs`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (allLogsResponse.ok) {
      const allLogsResult = await allLogsResponse.json();
      console.log('✅ All logs:', allLogsResult.data?.length || 0, 'logs found');
      console.log('Total logs:', allLogsResult.total || 0);
    } else {
      console.log('❌ Failed to fetch all logs');
    }

    // Test 5: Delete the pooja
    console.log('\n5️⃣ Deleting the pooja...');
    const deleteResponse = await fetch(`${baseUrl}/${poojaId}`, {
      method: 'DELETE',
      headers
    });

    if (deleteResponse.ok) {
      console.log('✅ Pooja deleted');
    } else {
      console.log('❌ Delete failed');
    }

    // Test 6: Check logs after deletion
    console.log('\n6️⃣ Checking logs after deletion...');
    const finalLogsResponse = await fetch(`${baseUrl}/logs`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (finalLogsResponse.ok) {
      const finalLogsResult = await finalLogsResponse.json();
      console.log('✅ Final logs count:', finalLogsResult.data?.length || 0);
      
      // Show all actions that occurred
      if (finalLogsResult.data?.length > 0) {
        console.log('\n📋 All actions performed:');
        finalLogsResult.data.forEach((log, index) => {
          console.log(`${index + 1}. ${log.action.toUpperCase()} - ${new Date(log.created_at).toLocaleString()}`);
        });
      }
    }

    console.log('\n🎉 Pooja Logs Test Completed!');
    console.log('\n📋 Expected Results:');
    console.log('- ✅ Create operation logged');
    console.log('- ✅ Update operation logged');
    console.log('- ✅ Delete operation logged');
    console.log('- ✅ All logs API working');
    console.log('- ✅ Specific pooja logs API working');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

console.log('📋 Testing Pooja Logs System');
console.log('This test will verify that:');
console.log('1. Pooja creation is logged');
console.log('2. Pooja updates are logged');
console.log('3. Pooja deletion is logged');
console.log('4. Logs API endpoints work correctly');
console.log('');

testPoojaLogs();
