const https = require('https');
const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwibW9iaWxlIjoiOTk5OTk5OTk4OSIsInVzZXJuYW1lIjoibXVydWdhbjkiLCJ0ZW1wbGVJZCI6Miwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU4NDM2MDQ3LCJleHAiOjE3ODk5NzIwNDd9.ZwTcS5KTF-w2E4oL0dpInnKE7kmy8AlgoTPClJQWGTA';

// Test 1: Create Hall Booking
const createHallBooking = () => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      registerNo: '2025-HALL-TEST',
      date: '2025-09-21',
      time: '12:25',
      event: 'Test',
      name: 'Tester',
      mobile: '9999999999',
      advanceAmount: '250.00',
      totalAmount: '700.00',
      balanceAmount: '450.00',
      remarks: 'Journal normalize test',
      transferTo: 'INCOME A/C',
      fromAccount: 'HALL ENTRY A/C',
      amount: '250.00'
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
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          console.log('✅ Hall booking created:', parsed);
          resolve(parsed);
        } catch (e) {
          console.log('Raw response:', responseData);
          resolve({ error: 'Invalid JSON response' });
        }
      });
    });

    req.on('error', (err) => {
      console.error('❌ Hall booking creation failed:', err.message);
      reject(err);
    });

    req.write(data);
    req.end();
  });
};

// Test 2: Check Journal Entries
const checkJournalEntries = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/journal/entries?startDate=2025-08-22&endDate=2025-09-21&page=1&limit=20&excludeZero=1&account=HALL%20A%2FC',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          console.log('📊 Journal entries (HALL A/C filter):', JSON.stringify(parsed, null, 2));
          resolve(parsed);
        } catch (e) {
          console.log('Raw response:', responseData);
          resolve({ error: 'Invalid JSON response' });
        }
      });
    });

    req.on('error', (err) => {
      console.error('❌ Journal entries check failed:', err.message);
      reject(err);
    });

    req.end();
  });
};

// Test 3: Check All Journal Entries (no filter)
const checkAllJournalEntries = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/journal/entries?startDate=2025-08-22&endDate=2025-09-21&page=1&limit=20&excludeZero=1',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          console.log('📊 All journal entries:', JSON.stringify(parsed, null, 2));
          resolve(parsed);
        } catch (e) {
          console.log('Raw response:', responseData);
          resolve({ error: 'Invalid JSON response' });
        }
      });
    });

    req.on('error', (err) => {
      console.error('❌ All journal entries check failed:', err.message);
      reject(err);
    });

    req.end();
  });
};

// Run tests
async function runTests() {
  console.log('🚀 Starting Hall booking journal mirror tests...\n');
  
  try {
    // Test 1: Create Hall Booking
    console.log('1️⃣ Creating Hall booking...');
    const bookingResult = await createHallBooking();
    
    if (bookingResult.error) {
      console.log('❌ Hall booking creation failed, skipping journal tests');
      return;
    }
    
    // Wait a moment for journal mirror to process
    console.log('\n⏳ Waiting 2 seconds for journal mirror...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Check Journal Entries (HALL A/C filter)
    console.log('\n2️⃣ Checking journal entries (HALL A/C filter)...');
    await checkJournalEntries();
    
    // Test 3: Check All Journal Entries
    console.log('\n3️⃣ Checking all journal entries...');
    await checkAllJournalEntries();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

runTests();
