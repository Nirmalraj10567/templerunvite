const BASE_URL = 'https://tmsapi.xesstechlink.com/api';

async function testPasswordLogin() {
  console.log('\n--- Testing Password Login API (/api/users/login) ---');
  try {
    console.log('Calling /api/users/login for admin/admin123...');
    const res = await fetch(`${BASE_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n✅ Password Login Successful!');
      return data.token;
    } else {
      console.log('\n❌ Password Login Failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Password Login Error:', error.message);
  }
  return null;
}

async function testSmartLogin() {
  console.log('\n--- Testing Smart Login API (/api/users/login/smart) ---');
  try {
    console.log('Calling /api/users/login/smart for member 8888888888...');
    const smartRes = await fetch(`${BASE_URL}/users/login/smart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '8888888888' })
    });
    const smartData = await smartRes.json();
    console.log('Response:', JSON.stringify(smartData, null, 2));

    console.log('\nCalling /api/users/login/smart for admin 8888888887...');
    const adminSmartRes = await fetch(`${BASE_URL}/users/login/smart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '8888888887' })
    });
    const adminSmartData = await adminSmartRes.json();
    console.log('Response:', JSON.stringify(adminSmartData, null, 2));

  } catch (error) {
    console.error('❌ Smart Login Error:', error.message);
  }
}

async function runTests() {
  await testPasswordLogin();
  await testSmartLogin();
}

runTests();
