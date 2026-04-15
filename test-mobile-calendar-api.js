const fetch = require('node-fetch');

async function testMobileCalendarAPI() {
  try {
    console.log('Testing Mobile Calendar API...');
    
    // Test with today's date
    const today = new Date().toISOString().split('T')[0];
    console.log(`Testing with date: ${today}`);
    
    // Test today endpoint
    console.log('\n1. Testing /api/mobile/calendar/today');
    const todayResponse = await fetch(`http://localhost:4000/api/mobile/calendar/today?mobile=9999999999&templeId=12`);
    
    if (!todayResponse.ok) {
      console.log('Today endpoint not OK:', todayResponse.status, todayResponse.statusText);
      const errorText = await todayResponse.text();
      console.log('Error response:', errorText);
    } else {
      const todayData = await todayResponse.json();
      console.log('Today API Response:', JSON.stringify(todayData, null, 2));
    }
    
    // Test specific date endpoint
    console.log('\n2. Testing /api/mobile/calendar/' + today);
    const dateResponse = await fetch(`http://localhost:4000/api/mobile/calendar/${today}?mobile=9999999999&templeId=12`);
    
    if (!dateResponse.ok) {
      console.log('Date endpoint not OK:', dateResponse.status, dateResponse.statusText);
      const errorText = await dateResponse.text();
      console.log('Error response:', errorText);
    } else {
      const dateData = await dateResponse.json();
      console.log('Date API Response:', JSON.stringify(dateData, null, 2));
    }
    
    // Test range endpoint
    console.log('\n3. Testing /api/mobile/calendar/range');
    const rangeResponse = await fetch(`http://localhost:4000/api/mobile/calendar/range?from=${today}&to=${today}&mobile=9999999999&templeId=12`);
    
    if (!rangeResponse.ok) {
      console.log('Range endpoint not OK:', rangeResponse.status, rangeResponse.statusText);
      const errorText = await rangeResponse.text();
      console.log('Error response:', errorText);
    } else {
      const rangeData = await rangeResponse.json();
      console.log('Range API Response:', JSON.stringify(rangeData, null, 2));
    }
    
  } catch (error) {
    console.error('Error testing mobile calendar API:', error.message);
  }
}

// Uncomment the line below to run the test
// testMobileCalendarAPI();

console.log('Mobile Calendar API test file created. To test:');
console.log('1. Start your backend server');
console.log('2. Uncomment the testMobileCalendarAPI() call');
console.log('3. Run: node test-mobile-calendar-api.js');
console.log('\nAvailable endpoints:');
console.log('- GET /api/mobile/calendar/today?mobile=PHONE&templeId=TEMPLE_ID');
console.log('- GET /api/mobile/calendar/YYYY-MM-DD?mobile=PHONE&templeId=TEMPLE_ID');
console.log('- GET /api/mobile/calendar/range?from=YYYY-MM-DD&to=YYYY-MM-DD&mobile=PHONE&templeId=TEMPLE_ID');
console.log('- GET /api/mobile/calendar/all?mobile=PHONE&templeId=TEMPLE_ID&limit=50&offset=0');
console.log('\nWeb API endpoints:');
console.log('- GET /api/calendar/all?limit=100&offset=0 (requires authentication)');
