/**
 * Test registration via API
 * Run with: node test-register.js
 */

const axios = require('axios');

async function testRegistration() {
  console.log('='.repeat(60));
  console.log('TESTING REGISTRATION API');
  console.log('='.repeat(60));

  try {
    const timestamp = Date.now();
    const testData = {
      mobile: `999999${String(timestamp).slice(-4)}`,
      username: `testuser${timestamp}`,
      password: 'test123',
      email: `test${timestamp}@example.com`,
      fullName: 'Test User Registration'
    };

    console.log('\nSending registration request...');
    console.log('URL: https://templeapi.agniplay.com/api/users/register');
    console.log('Data:', JSON.stringify(testData, null, 2));

    const response = await axios.post(
      'https://templeapi.agniplay.com/api/users/register',
      testData,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (response.data && response.data.success) {
      console.log('\n✅ REGISTRATION SUCCESSFUL!\n');
      console.log('User created:');
      console.log('  ID:', response.data.user?.id);
      console.log('  Username:', response.data.user?.username);
      console.log('  Mobile:', response.data.user?.mobile);
      console.log('  Role:', response.data.user?.role);
      console.log('  Temple ID:', response.data.user?.templeId);
      console.log('\nYou can now login with:');
      console.log(`  Username: ${testData.username}`);
      console.log(`  Password: ${testData.password}`);
    } else {
      console.log('❌ Registration failed:', response.data);
    }

  } catch (error) {
    console.error('\n❌ REGISTRATION FAILED!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
      
      if (error.response.status === 500) {
        console.error('\nInternal server error. Check backend server logs.');
        console.error('The database error is likely in the permissions insert.');
      }
    } else {
      console.error('Error:', error.message);
      console.error('\nMake sure the backend server is running on port 4000!');
    }
  }
}

testRegistration();
