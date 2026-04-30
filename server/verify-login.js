/**
 * Quick test to verify login endpoint is working
 * Run with: node verify-login.js
 */

const axios = require('axios');

async function verifyLogin() {
  console.log('='.repeat(60));
  console.log('VERIFYING LOGIN ENDPOINT');
  console.log('='.repeat(60));

  try {
    console.log('\nSending login request to: https://templeapi.agniplay.com/api/users/login\n');

    const response = await axios.post('https://templeapi.agniplay.com/api/users/login', {
      username: 'test_admin',
      password: 'test123'
    });

    if (response.data.success) {
      console.log('✅ LOGIN SUCCESSFUL!\n');
      console.log('User Info:');
      console.log('  Username:', response.data.user.username);
      console.log('  Role:', response.data.user.role);
      console.log('  Temple:', response.data.user.templeName);
      console.log('  Permissions:', response.data.user.permissions.length);
      
      const daybookPerm = response.data.user.permissions.find(p => p.id === 'daybook');
      if (daybookPerm) {
        console.log('  ✅ Daybook Permission:', daybookPerm.access);
      } else {
        console.log('  ❌ Daybook Permission: NOT FOUND');
      }

      console.log('\nToken (first 50 chars):');
      console.log('  ', response.data.token.substring(0, 50) + '...\n');

      console.log('='.repeat(60));
      console.log('TEST DAYBOOK API');
      console.log('='.repeat(60));
      console.log('\nUse this token to test daybook:\n');
      console.log(`curl -X GET https://templeapi.agniplay.com/api/daybook \\`);
      console.log(`  -H "Authorization: Bearer ${response.data.token}"\n`);

      // Test daybook API
      console.log('\nTesting daybook API...');
      const daybookResponse = await axios.get('https://templeapi.agniplay.com/api/daybook', {
        headers: {
          Authorization: `Bearer ${response.data.token}`
        }
      });

      if (daybookResponse.data.success) {
        console.log('✅ Daybook API is working!');
        console.log('  Entries found:', daybookResponse.data.total);
        console.log('  Data:', daybookResponse.data.data.length, 'items');
      }

    } else {
      console.log('❌ Login failed:', response.data);
    }

  } catch (error) {
    console.error('❌ LOGIN FAILED!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
      console.error('\nMake sure the backend server is running on port 4000!');
    }
  }
}

verifyLogin();
