// Quick test for Hall booking after router fix
const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwibW9iaWxlIjoiOTk5OTk5OTk4OSIsInVzZXJuYW1lIjoibXVydWdhbjkiLCJ0ZW1wbGVJZCI6Miwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU4NDM2MDQ3LCJleHAiOjE3ODk5NzIwNDd9.ZwTcS5KTF-w2E4oL0dpInnKE7kmy8AlgoTPClJQWGTA';

console.log('🧪 Testing Hall booking after router fix...\n');

// Test Hall booking creation
const testHallBooking = () => {
  const data = JSON.stringify({
    registerNo: '2025-TEST-' + Date.now(),
    date: '2025-09-21',
    time: '17:20',
    event: 'Test Event',
    name: 'Test User',
    mobile: '9999999999',
    advanceAmount: '150.00',
    totalAmount: '600.00',
    balanceAmount: '450.00',
    remarks: 'Test hall booking after router fix',
    transferTo: 'INCOME A/C',
    fromAccount: 'HALL ENTRY A/C',
    amount: '150.00'
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

  console.log('📤 Creating Hall booking...');
  
  const req = http.request(options, (res) => {
    let responseData = '';
    res.on('data', chunk => responseData += chunk);
    res.on('end', () => {
      console.log(`📥 Response (${res.statusCode}):`, responseData);
      
      if (res.statusCode === 200) {
        try {
          const parsed = JSON.parse(responseData);
          const bookingId = parsed.data?.id;
          console.log('✅ Hall booking created successfully! ID:', bookingId);
          
          // Wait and check journal
          setTimeout(() => {
            checkJournal(bookingId);
          }, 2000);
        } catch (e) {
          console.log('✅ Hall booking created but could not parse response');
          setTimeout(() => {
            checkJournal();
          }, 2000);
        }
      } else {
        console.log('❌ Hall booking failed');
      }
    });
  });

  req.on('error', (err) => {
    console.error('❌ Request failed:', err.message);
    console.log('💡 Make sure the backend is running: cd server && node backend.js');
  });

  req.write(data);
  req.end();
};

// Check journal entries
const checkJournal = (bookingId) => {
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
        console.log('📈 Total journal entries found:', parsed.data?.length || 0);
        
        if (parsed.data && parsed.data.length > 0) {
          // Look for HALL A/C entries
          const hallEntries = parsed.data.filter(entry => 
            entry.from_account === 'HALL A/C' || 
            entry.to_account === 'HALL A/C' ||
            entry.reference_type === 'hall_booking'
          );
          
          console.log('🏛️ Hall-related entries:', hallEntries.length);
          
          if (hallEntries.length > 0) {
            console.log('✅ SUCCESS! Hall journal mirroring is working!');
            hallEntries.forEach((entry, i) => {
              console.log(`  Entry ${i + 1}:`, {
                id: entry.id,
                from_account: entry.from_account,
                to_account: entry.to_account,
                amount: entry.amount,
                reference_type: entry.reference_type,
                reference_id: entry.reference_id
              });
            });
            
            // Verify normalization
            const normalized = hallEntries.filter(entry => 
              entry.from_account === 'HALL A/C' && entry.to_account === 'INCOME A/C'
            );
            
            if (normalized.length > 0) {
              console.log('✅ Journal normalization is working correctly!');
              console.log('✅ All tests passed!');
            } else {
              console.log('❌ Journal normalization failed');
              console.log('Expected: HALL A/C → INCOME A/C');
            }
          } else {
            console.log('❌ No hall entries found in journal');
            console.log('💡 Check backend console for debug messages');
            console.log('💡 Look for: "🔍 Hall booking journal mirror debug"');
          }
        } else {
          console.log('❌ No journal entries found');
        }
      } catch (e) {
        console.log('❌ Could not parse journal response:', data.substring(0, 200));
      }
    });
  });

  req.on('error', (err) => {
    console.error('❌ Journal check failed:', err.message);
  });

  req.end();
};

// Start the test
testHallBooking();
