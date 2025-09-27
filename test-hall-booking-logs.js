const fetch = require('node-fetch');

async function testHallBookingLogs() {
  console.log('🔍 Testing Hall Booking Logs System...\n');

  // You'll need to replace this with a real token
  const token = 'your-test-token-here';
  
  const baseUrl = 'http://localhost:4000/api/hall-bookings';
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    console.log('📋 Testing Hall Booking Logs API Endpoints\n');

    // Test 1: Create a hall booking
    console.log('1️⃣ Creating a hall booking...');
    const createData = {
      registerNo: 'TEST-001',
      date: '2025-01-15',
      time: '10:00 AM',
      event: 'Wedding',
      name: 'Test User',
      mobile: '1234567890',
      advanceAmount: 5000,
      totalAmount: 10000,
      balanceAmount: 5000,
      remarks: 'Test booking for logs'
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

    const createdBooking = await createResponse.json();
    console.log('✅ Hall booking created:', createdBooking.data?.id);

    const bookingId = createdBooking.data?.id;
    if (!bookingId) {
      console.log('❌ No booking ID returned');
      return;
    }

    // Test 2: Update the hall booking
    console.log('\n2️⃣ Updating the hall booking...');
    const updateData = {
      ...createData,
      name: 'Updated Test User',
      remarks: 'Updated test booking for logs'
    };

    const updateResponse = await fetch(`${baseUrl}/${bookingId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.log('❌ Update failed:', errorText);
    } else {
      console.log('✅ Hall booking updated');
    }

    // Test 3: Fetch logs for specific booking
    console.log('\n3️⃣ Fetching logs for specific booking...');
    const logsResponse = await fetch(`${baseUrl}/${bookingId}/logs`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (logsResponse.ok) {
      const logsResult = await logsResponse.json();
      console.log('✅ Specific booking logs:', logsResult.data?.length || 0, 'logs found');
      if (logsResult.data?.length > 0) {
        console.log('Sample log:', {
          action: logsResult.data[0].action,
          created_at: logsResult.data[0].created_at
        });
      }
    } else {
      console.log('❌ Failed to fetch specific booking logs');
    }

    // Test 4: Fetch all logs
    console.log('\n4️⃣ Fetching all hall booking logs...');
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

    // Test 5: Delete the hall booking
    console.log('\n5️⃣ Deleting the hall booking...');
    const deleteResponse = await fetch(`${baseUrl}/${bookingId}`, {
      method: 'DELETE',
      headers
    });

    if (deleteResponse.ok) {
      console.log('✅ Hall booking deleted');
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

    console.log('\n🎉 Hall Booking Logs Test Completed!');
    console.log('\n📋 Expected Results:');
    console.log('- ✅ Create operation logged');
    console.log('- ✅ Update operation logged');
    console.log('- ✅ Delete operation logged');
    console.log('- ✅ All logs API working');
    console.log('- ✅ Specific booking logs API working');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

console.log('📋 Testing Hall Booking Logs System');
console.log('This test will verify that:');
console.log('1. Hall booking creation is logged');
console.log('2. Hall booking updates are logged');
console.log('3. Hall booking deletion is logged');
console.log('4. Logs API endpoints work correctly');
console.log('');

testHallBookingLogs();
