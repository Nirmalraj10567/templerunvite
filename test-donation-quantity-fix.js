const fetch = require('node-fetch');

async function testDonationQuantityFix() {
  console.log('🔍 Testing Donation Quantity Fix...\n');

  // You'll need to replace this with a real token
  const token = 'your-test-token-here';
  
  const baseUrl = 'https://tmsapi.xesstechlink.com/api/donations';
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const testCases = [
    {
      name: 'Valid quantity',
      data: {
        product: 'Test Product 1',
        quantity: 5,
        price: 100,
        donorName: 'Test Donor 1',
        donorContact: '1234567890'
      }
    },
    {
      name: 'Empty quantity (should default to 1)',
      data: {
        product: 'Test Product 2',
        quantity: '',
        price: 200,
        donorName: 'Test Donor 2',
        donorContact: '1234567890'
      }
    },
    {
      name: 'Invalid quantity (should default to 1)',
      data: {
        product: 'Test Product 3',
        quantity: 'invalid',
        price: 300,
        donorName: 'Test Donor 3',
        donorContact: '1234567890'
      }
    },
    {
      name: 'Zero quantity (should default to 1)',
      data: {
        product: 'Test Product 4',
        quantity: 0,
        price: 400,
        donorName: 'Test Donor 4',
        donorContact: '1234567890'
      }
    },
    {
      name: 'Negative quantity (should default to 1)',
      data: {
        product: 'Test Product 5',
        quantity: -5,
        price: 500,
        donorName: 'Test Donor 5',
        donorContact: '1234567890'
      }
    }
  ];

  try {
    for (const testCase of testCases) {
      console.log(`\n🧪 Testing: ${testCase.name}`);
      console.log('Data:', testCase.data);
      
      try {
        const response = await fetch(baseUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(testCase.data)
        });
        
        console.log('Status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Success! Created donation with ID:', result.data?.id);
          console.log('Final quantity in database:', result.data?.quantity);
          
          // Clean up - delete the test donation
          if (result.data?.id) {
            await fetch(`${baseUrl}/${result.data.id}`, {
              method: 'DELETE',
              headers
            });
            console.log('🧹 Cleaned up test donation');
          }
        } else {
          const errorText = await response.text();
          console.log('❌ Failed:', errorText);
        }
      } catch (error) {
        console.log('❌ Error:', error.message);
      }
    }

    console.log('\n🎉 All tests completed!');
    console.log('\n📋 Expected behavior:');
    console.log('- Valid quantities should be preserved');
    console.log('- Empty, invalid, zero, or negative quantities should default to 1');
    console.log('- No "Unknown column 'NaN'" errors should occur');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

console.log('📋 Testing Donation Quantity Fix');
console.log('This test will verify that:');
console.log('1. Valid quantities are preserved');
console.log('2. Invalid quantities default to 1');
console.log('3. No NaN errors occur');
console.log('');

testDonationQuantityFix();
