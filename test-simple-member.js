// Using built-in fetch (Node.js 18+)

async function testSimpleMember() {
  const baseUrl = 'http://localhost:4000';

  try {
    console.log('Testing backend connection...');

    // Test basic connection
    const healthResponse = await fetch(`${baseUrl}/`);
    const healthText = await healthResponse.text();
    console.log('✓ Backend response:', healthText);

    // Login first
    console.log('Testing login...');
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: '9999999999',
        username: "superadmin",
        password: 'superadmin123'
      })
    });

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.log('Login failed:', errorText);
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✓ Login successful');

    // Create member with minimal data
    const memberData = {
      name: 'Test User',
      mobile: '9876543212'
    };

    console.log('Creating member with minimal data:', memberData);

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

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSimpleMember();