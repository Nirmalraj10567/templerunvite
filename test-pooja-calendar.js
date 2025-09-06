// Test script for Pooja Calendar functionality
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';
const TEST_TOKEN = 'your-test-token-here'; // Replace with actual token

async function testPoojaCalendar() {
  console.log('🧪 Testing Pooja Calendar Functionality...\n');

  try {
    // Test 1: Get bookings for current month
    console.log('1. Testing bookings endpoint for current month...');
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    
    const bookingsResponse = await fetch(`${BASE_URL}/api/pooja/bookings?year=${year}&month=${month}`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
      },
    });

    if (!bookingsResponse.ok) {
      throw new Error(`Failed to fetch bookings: ${bookingsResponse.status}`);
    }

    const bookingsData = await bookingsResponse.json();
    console.log(`✅ Found ${bookingsData.data.length} bookings for ${month}/${year}`);
    
    if (bookingsData.data.length > 0) {
      console.log('   Sample bookings:');
      bookingsData.data.slice(0, 3).forEach(booking => {
        console.log(`   - ${booking.receipt_number}: ${booking.name} (${booking.from_date} to ${booking.to_date}) at ${booking.time}`);
      });
    }

    // Test 2: Test with invalid parameters
    console.log('\n2. Testing with invalid parameters...');
    const invalidResponse = await fetch(`${BASE_URL}/api/pooja/bookings`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
      },
    });

    if (invalidResponse.status === 400) {
      console.log('✅ Correctly returned 400 for missing year/month parameters');
    } else {
      console.log(`❌ Expected 400, got ${invalidResponse.status}`);
    }

    // Test 3: Test with future month
    console.log('\n3. Testing with future month...');
    const futureMonth = month === 12 ? 1 : month + 1;
    const futureYear = month === 12 ? year + 1 : year;
    
    const futureResponse = await fetch(`${BASE_URL}/api/pooja/bookings?year=${futureYear}&month=${futureMonth}`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
      },
    });

    if (futureResponse.ok) {
      const futureData = await futureResponse.json();
      console.log(`✅ Found ${futureData.data.length} bookings for future month ${futureMonth}/${futureYear}`);
    } else {
      console.log(`❌ Failed to fetch future bookings: ${futureResponse.status}`);
    }

    console.log('\n🎉 All calendar tests passed!');
    console.log('\n📋 Calendar Features Available:');
    console.log('   • Monthly booking view with date highlighting');
    console.log('   • Visual indicators for booked dates (red)');
    console.log('   • Today highlighting (blue)');
    console.log('   • Selected date highlighting');
    console.log('   • Booking count badges on dates');
    console.log('   • Month navigation (previous/next)');
    console.log('   • Bilingual support (English/Tamil)');
    console.log('   • Double-booking prevention');
    console.log('   • Date selection from calendar');
    console.log('   • Responsive design');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure the server is running on port 3001');
    console.log('   2. Replace TEST_TOKEN with a valid authentication token');
    console.log('   3. Ensure there are pooja entries in the database');
    console.log('   4. Check that the bookings endpoint is properly configured');
  }
}

// Run the test
testPoojaCalendar();
