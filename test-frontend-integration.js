// Using built-in fetch (Node.js 18+)

async function testFrontendIntegration() {
  const baseUrl = 'http://localhost:4000';
  
  try {
    console.log('Testing frontend integration...');
    
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
    
    // Fetch members list (as frontend would do)
    console.log('Fetching members list...');
    const membersResponse = await fetch(`${baseUrl}/api/members`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!membersResponse.ok) {
      const errorText = await membersResponse.text();
      console.log('❌ Failed to fetch members:', errorText);
      return;
    }
    
    const membersData = await membersResponse.json();
    console.log('✓ Members fetched successfully:');
    
    // Display members in a table-like format (as frontend would)
    console.log('\n--- Members List ---');
    console.log('ID | Name | Username | Mobile | Email');
    console.log('---|------|----------|--------|-------');
    
    membersData.members.forEach(member => {
      console.log(`${member.id} | ${member.name} | ${member.username || '-'} | ${member.mobile_number} | ${member.email || '-'}`);
    });
    
    console.log('\n✓ Frontend integration test successful!');
    console.log(`Total members: ${membersData.members.length}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFrontendIntegration();