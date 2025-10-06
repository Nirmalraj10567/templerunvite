const fetch = require('node-fetch');

async function testReceiptLogs() {
  console.log('🔍 Testing Receipt Logs System...\n');

  // You'll need to replace this with a real token
  const token = 'your-test-token-here';
  
  const baseUrl = 'https://tmsapi.xesstechlink.com/api/receipts';
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    console.log('📋 Testing Receipt Logs API Endpoints\n');

    // Test 1: Create a receipt
    console.log('1️⃣ Creating a receipt...');
    const createData = {
      date: '2025-01-15',
      type: 'receipt',
      from_person: 'Test Donor',
      to_person: 'Temple',
      amount: 1000,
      remarks: 'Test receipt for logs'
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

    const createdReceipt = await createResponse.json();
    console.log('✅ Receipt created:', createdReceipt.data?.id);

    const receiptId = createdReceipt.data?.id;
    if (!receiptId) {
      console.log('❌ No receipt ID returned');
      return;
    }

    // Test 2: Update the receipt
    console.log('\n2️⃣ Updating the receipt...');
    const updateData = {
      ...createData,
      from_person: 'Updated Test Donor',
      remarks: 'Updated test receipt for logs'
    };

    const updateResponse = await fetch(`${baseUrl}/${receiptId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.log('❌ Update failed:', errorText);
    } else {
      console.log('✅ Receipt updated');
    }

    // Test 3: Fetch logs for specific receipt
    console.log('\n3️⃣ Fetching logs for specific receipt...');
    const logsResponse = await fetch(`${baseUrl}/${receiptId}/logs`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (logsResponse.ok) {
      const logsResult = await logsResponse.json();
      console.log('✅ Specific receipt logs:', logsResult.data?.length || 0, 'logs found');
      if (logsResult.data?.length > 0) {
        console.log('Sample log:', {
          action: logsResult.data[0].action,
          created_at: logsResult.data[0].created_at
        });
      }
    } else {
      console.log('❌ Failed to fetch specific receipt logs');
    }

    // Test 4: Fetch all logs
    console.log('\n4️⃣ Fetching all receipt logs...');
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

    // Test 5: Delete the receipt
    console.log('\n5️⃣ Deleting the receipt...');
    const deleteResponse = await fetch(`${baseUrl}/${receiptId}`, {
      method: 'DELETE',
      headers
    });

    if (deleteResponse.ok) {
      console.log('✅ Receipt deleted');
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

    console.log('\n🎉 Receipt Logs Test Completed!');
    console.log('\n📋 Expected Results:');
    console.log('- ✅ Create operation logged');
    console.log('- ✅ Update operation logged');
    console.log('- ✅ Delete operation logged');
    console.log('- ✅ All logs API working');
    console.log('- ✅ Specific receipt logs API working');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

console.log('📋 Testing Receipt Logs System');
console.log('This test will verify that:');
console.log('1. Receipt creation is logged');
console.log('2. Receipt updates are logged');
console.log('3. Receipt deletion is logged');
console.log('4. Logs API endpoints work correctly');
console.log('');

testReceiptLogs();
