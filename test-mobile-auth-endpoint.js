async function test() {
  const BASE_URL = 'https://tmsapi.xesstechlink.com/api';
  try {
    console.log('Testing /mobile-auth/test...');
    const res = await fetch(`${BASE_URL}/mobile-auth/test`);
    const data = await res.json();
    console.log('Response:', data);
  } catch (e) {
    console.error(e);
  }
}
test();
