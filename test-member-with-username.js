// Using built-in fetch (Node.js 18+)

async function testMemberWithUsername() {
  const baseUrl = 'http://localhost:4000';
  
  try {
    console.log('Testing member creation with username...');
    
    // Login first
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: '9999999999',
        password: 'admin123'
      })
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✓ Login successful');
    
    // Create member with username
    const memberData = {
      name: 'John Doe',
      username: 'johndoe',
      mobile: '9876543211',
      email: 'john@example.com',
      createLogin: true,
      password: 'password123',
      role: 'member',
      customPermissions: [
        { id: 'member_view', access: 'view' }
      ]
    };
    
    console.log('Creating member:', memberData);
    
    const createResponse = await fetch(`${baseUrl}/api/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(memberData)
    });
    
    const createResult = await createResponse.json();
    console.log('✓ Member creation result:', createResult);
    
    // Fetch members to verify username is included
    const fetchResponse = await fetch(`${baseUrl}/api/members`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const fetchResult = await fetchResponse.json();
    console.log('✓ Members list:', fetchResult.members.map(m => ({
      id: m.id,
      name: m.name,
      username: m.username,
      mobile: m.mobile_number
    })));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testMemberWithUsername();