const fetch = require('node-fetch');

async function testCalendarAPI() {
  try {
    console.log('Testing Calendar API...');
    
    // Test with today's date
    const today = new Date().toISOString().split('T')[0];
    console.log(`Testing with date: ${today}`);
    
    // You would need to replace this with a valid token for testing
    const token = 'your-test-token-here';
    
    const response = await fetch(`http://localhost:4000/api/calendar/${today}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      console.log('Response not OK:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('Error response:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('Calendar API Response:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error testing calendar API:', error.message);
  }
}

// Uncomment the line below to run the test
// testCalendarAPI();

console.log('Calendar API test file created. To test:');
console.log('1. Start your backend server');
console.log('2. Get a valid authentication token');
console.log('3. Replace "your-test-token-here" with the actual token');
console.log('4. Uncomment the testCalendarAPI() call');
console.log('5. Run: node test-calendar-api.js');
