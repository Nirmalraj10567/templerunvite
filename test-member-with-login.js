// Using built-in fetch (Node.js 18+)

async function testMemberWithLogin() {
  const baseUrl = 'http://localhost:4000';
  
  try {
    console.log('Testing member creation with login...');
    
    // Login as superadmin
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: '9999999999',
        password: 'superadmin123'
      })
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✓ Login successful');
    
    // Create member with username and login
    const memberData = {
      name: 'Admin User',
      username: 'adminuser',
      mobile: '9876543213',
      email: 'admin@temple.com',
      createLogin: true,
      password: 'password123',
      role: 'admin',
      permissionLevel: 'full',
      customPermissions: [
        { id: 'member_entry', access: 'full' },
        { id: 'member_view', access: 'full' }
      ]
    };
    
    console.log('Creating member with login:', memberData);
    
    const createResponse = await fetch(`${baseUrl}/api/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(memberData)
    });
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.log('❌ Member creation failed:', errorText);
      return;
    }
    
    const createResult = await createResponse.json();
    console.log('✓ Member creation successful:', createResult);
    
    // Test login with the new user
    console.log('Testing login with new user...');
    const newUserLoginResponse = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'adminuser',
        password: 'password123'
      })
    });
    
    if (!newUserLoginResponse.ok) {
      const errorText = await newUserLoginResponse.text();
      console.log('❌ New user login failed:', errorText);
      return;
    }
    
    const newUserLoginData = await newUserLoginResponse.json();
    console.log('✓ New user login successful:', {
      username: newUserLoginData.user.username,
      role: newUserLoginData.user.role,
      permissions: newUserLoginData.user.permissions?.length || 0
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testMemberWithLogin();