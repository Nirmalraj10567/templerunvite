const fetch = require('node-fetch');

async function testDonationProductLogs() {
  console.log('🔍 Testing Donation Product Logs System...\n');

  // You'll need to replace this with a real token
  const token = 'your-test-token-here';
  
  const baseUrl = 'https://tmsapi.xesstechlink.com/api/donations';
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    // Step 1: Create a donation product entry
    console.log('1. Creating donation product entry...');
    const createPayload = {
      product: 'Test Product for Logs',
      description: 'Test product description',
      price: 100.50,
      quantity: 2,
      category: 'General',
      donorName: 'Test Donor',
      donorContact: '9876543210',
      donationDate: '2025-09-28',
      status: 'available',
      notes: 'Test entry for logs'
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
      product: 'Updated Test Product',
      description: 'Updated product description',
      price: 150.75,
      quantity: 3,
      category: 'Updated',
      donorName: 'Updated Donor',
      donorContact: '9876543210',
      donationDate: '2025-09-28',
      status: 'reserved',
      notes: 'Updated entry for logs'
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
          console.log(`  ${index + 1}. Action: ${log.action}, Product: ${log.donation_name}, Time: ${log.created_at}`);
        });
      } else {
        console.log('⚠️  No logs found in all logs');
      }
    } else {
      const errorText = await allLogsResponse.text();
      console.log('All logs error:', errorText);
    }

    // Step 8: Test deletion logging
    console.log('\n8. Testing deletion logging...');
    const deleteResponse = await fetch(`${baseUrl}/${entryId}`, {
      method: 'DELETE',
      headers
    });
    
    console.log('Delete status:', deleteResponse.status);
    if (deleteResponse.ok) {
      console.log('✅ Delete successful!');
      
      // Wait for deletion log to be created
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check all logs again to see deletion log
      const finalLogsResponse = await fetch(`${baseUrl}/logs`, { headers });
      if (finalLogsResponse.ok) {
        const finalLogsData = await finalLogsResponse.json();
        if (finalLogsData.success && finalLogsData.data && finalLogsData.data.length > 0) {
          console.log('✅ Found deletion logs!');
          const deletionLogs = finalLogsData.data.filter(log => log.action === 'delete');
          console.log(`Deletion logs found: ${deletionLogs.length}`);
        }
      }
    } else {
      const errorText = await deleteResponse.text();
      console.log('❌ Delete error:', errorText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

console.log('📋 Testing Donation Product Logs System');
console.log('This test will:');
console.log('1. Create a donation product entry');
console.log('2. Check for creation logs');
console.log('3. Update the entry');
console.log('4. Check for update logs');
console.log('5. Verify all logs endpoint');
console.log('6. Test deletion logging');
console.log('');

testDonationProductLogs();
