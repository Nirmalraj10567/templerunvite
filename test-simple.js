// Comprehensive test for Hall booking journal mirroring
const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwibW9iaWxlIjoiOTk5OTk5OTk4OSIsInVzZXJuYW1lIjoibXVydWdhbjkiLCJ0ZW1wbGVJZCI6Miwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU4NDM2MDQ3LCJleHAiOjE3ODk5NzIwNDd9.ZwTcS5KTF-w2E4oL0dpInnKE7kmy8AlgoTPClJQWGTA';

let createdBookingId = null;

console.log('Testing backend connection...');

// Test connection first
const testConnection = () => {
  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/journal/entries?page=1&limit=1',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  const req = http.request(options, (res) => {
    console.log(`✅ Backend is running! Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Response preview:', data.substring(0, 200));
      
      // If backend is running, test Hall booking
      testHallBooking();
    });
  });

  req.on('error', (err) => {
    console.error('❌ Backend not running:', err.message);
    console.log('Please start the backend server first:');
    console.log('cd server && node backend.js');
  });

  req.end();
};

// Test Hall booking creation
const testHallBooking = () => {
  console.log('\n🏛️ Testing Hall booking creation...');
  
  const data = JSON.stringify({
    registerNo: '2025-TEST-' + Date.now(),
    date: '2025-09-21',
    time: '12:30',
    event: 'Test Event',
    name: 'Test User',
    mobile: '9999999999',
    advanceAmount: '100.00',
    totalAmount: '500.00',
    balanceAmount: '400.00',
    remarks: 'Test hall booking for journal mirror',
    transferTo: 'INCOME A/C',
    fromAccount: 'HALL ENTRY A/C',
    amount: '100.00'
  });

  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/hall-bookings',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Content-Length': data.length
    }
  };

  const req = http.request(options, (res) => {
    let responseData = '';
    res.on('data', chunk => responseData += chunk);
    res.on('end', () => {
      console.log(`Hall booking response (${res.statusCode}):`, responseData);
      
      if (res.statusCode === 200) {
        try {
          const parsed = JSON.parse(responseData);
          createdBookingId = parsed.data?.id;
          console.log('✅ Hall booking created successfully! ID:', createdBookingId);
          
          // Wait and check journal
          setTimeout(() => {
            checkJournal();
          }, 1000);
        } catch (e) {
          console.log('✅ Hall booking created but could not parse response');
          setTimeout(() => {
            checkJournal();
          }, 1000);
        }
      } else {
        console.log('❌ Hall booking failed');
      }
    });
  });

  req.on('error', (err) => {
    console.error('❌ Hall booking request failed:', err.message);
  });

  req.write(data);
  req.end();
};

// Check journal entries
const checkJournal = () => {
  console.log('\n📊 Checking journal entries...');
  
  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/journal/entries?startDate=2025-09-21&endDate=2025-09-21&excludeZero=1',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        console.log('Journal entries found:', parsed.data?.length || 0);
        
        if (parsed.data && parsed.data.length > 0) {
          const hallEntries = parsed.data.filter(entry => 
            entry.from_account === 'HALL A/C' || 
            entry.to_account === 'HALL A/C' ||
            entry.reference_type === 'hall_booking'
          );
          
          console.log('Hall-related entries:', hallEntries.length);
          
          if (hallEntries.length > 0) {
            console.log('✅ Hall journal mirroring is working!');
            console.log('Latest hall entry:', JSON.stringify(hallEntries[0], null, 2));
            
            // Test update if we have a booking ID
            if (createdBookingId) {
              setTimeout(() => {
                testHallBookingUpdate();
              }, 1000);
            }
          } else {
            console.log('❌ No hall entries found in journal');
            console.log('Expected: from_account="HALL A/C", to_account="INCOME A/C"');
          }
        } else {
          console.log('❌ No journal entries found');
        }
      } catch (e) {
        console.log('Raw journal response:', data);
      }
    });
  });

  req.on('error', (err) => {
    console.error('❌ Journal check failed:', err.message);
  });

  req.end();
};

// Test Hall booking update
const testHallBookingUpdate = () => {
  if (!createdBookingId) {
    console.log('❌ No booking ID to update');
    return;
  }
  
  console.log('\n🔄 Testing Hall booking update...');
  
  const data = JSON.stringify({
    advanceAmount: '150.00',
    totalAmount: '500.00',
    balanceAmount: '350.00',
    remarks: 'Updated test hall booking for journal mirror'
  });

  const options = {
    hostname: 'localhost',
    port: 4000,
    path: `/api/hall-bookings/${createdBookingId}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Content-Length': data.length
    }
  };

  const req = http.request(options, (res) => {
    let responseData = '';
    res.on('data', chunk => responseData += chunk);
    res.on('end', () => {
      console.log(`Hall booking update response (${res.statusCode}):`, responseData);
      
      if (res.statusCode === 200) {
        console.log('✅ Hall booking updated successfully!');
        
        // Wait and check journal again
        setTimeout(() => {
          checkJournalAfterUpdate();
        }, 1000);
      } else {
        console.log('❌ Hall booking update failed');
      }
    });
  });

  req.on('error', (err) => {
    console.error('❌ Hall booking update request failed:', err.message);
  });

  req.write(data);
  req.end();
};

// Check journal after update
const checkJournalAfterUpdate = () => {
  console.log('\n📊 Checking journal entries after update...');
  
  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/journal/entries?startDate=2025-09-21&endDate=2025-09-21&excludeZero=1',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        console.log('Journal entries found after update:', parsed.data?.length || 0);
        
        if (parsed.data && parsed.data.length > 0) {
          const hallEntries = parsed.data.filter(entry => 
            entry.reference_type === 'hall_booking' && 
            entry.reference_id == createdBookingId
          );
          
          console.log('Hall entries for our booking:', hallEntries.length);
          
          if (hallEntries.length > 0) {
            const latestEntry = hallEntries[0];
            console.log('✅ Updated hall entry:', JSON.stringify(latestEntry, null, 2));
            
            // Verify normalization
            if (latestEntry.from_account === 'HALL A/C' && latestEntry.to_account === 'INCOME A/C') {
              console.log('✅ Journal normalization is working correctly!');
              console.log('✅ All tests passed!');
            } else {
              console.log('❌ Journal normalization failed');
              console.log(`Expected: HALL A/C → INCOME A/C`);
              console.log(`Got: ${latestEntry.from_account} → ${latestEntry.to_account}`);
            }
          } else {
            console.log('❌ No hall entries found for our booking after update');
          }
        } else {
          console.log('❌ No journal entries found after update');
        }
      } catch (e) {
        console.log('Raw journal response after update:', data);
      }
    });
  });

  req.on('error', (err) => {
    console.error('❌ Journal check after update failed:', err.message);
  });

  req.end();
};

// Start the test
testConnection();
