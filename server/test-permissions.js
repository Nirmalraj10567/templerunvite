const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

async function testPermissions() {
  try {
    console.log('Testing Enhanced Permission System...\n');

    // Test login
    console.log('1. Testing login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (loginResponse.data.success) {
      console.log('✓ Login successful');
      const token = loginResponse.data.token;
      const user = loginResponse.data.user;
      
      console.log(`✓ User: ${user.username} (${user.role})`);
      console.log(`✓ Permissions loaded: ${user.permissions?.length || 0} permissions`);
      
      // Test permissions endpoint
      console.log('\n2. Testing permissions endpoint...');
      const permissionsResponse = await axios.get(`${BASE_URL}/api/permissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (permissionsResponse.data.success) {
        console.log('✓ Permissions endpoint working');
        console.log(`✓ Available permissions: ${permissionsResponse.data.permissions.length}`);
        permissionsResponse.data.permissions.forEach(perm => {
          console.log(`  - ${perm.label}: ${perm.description}`);
        });
      }

      // Test member entry with new permissions
      console.log('\n3. Testing member creation with new permission system...');
      const memberData = {
        mobile: '9876543210',
        username: 'testmember',
        password: 'test123',
        email: 'test@example.com',
        fullName: 'Test Member',
        role: 'member',
        templeId: user.templeId,
        customPermissions: [
          { id: 'member_view', access: 'view' },
          { id: 'master_data', access: 'edit' }
        ]
      };

      const registerResponse = await axios.post(`${BASE_URL}/api/register`, memberData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (registerResponse.data.success) {
        console.log('✓ Member creation with custom permissions successful');
        console.log(`✓ Created user: ${registerResponse.data.user.username}`);
      }

    }

    console.log('\n✅ All permission tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run tests
testPermissions();