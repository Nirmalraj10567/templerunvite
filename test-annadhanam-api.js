// Test script for Annadhanam API endpoints
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001/api';
const TEST_TOKEN = 'your-test-token-here'; // Replace with actual token

async function testAnnadhanamAPI() {
  console.log('Testing Annadhanam API endpoints...\n');

  // Test data
  const testData = {
    receiptNumber: 'ANN001',
    name: 'Test User',
    mobileNumber: '9876543210',
    food: 'Rice, Sambar, Curry',
    peoples: 50,
    time: '12:00',
    fromDate: '2024-01-15',
    toDate: '2024-01-15',
    remarks: 'Test entry'
  };

  try {
    // Test POST - Create new annadhanam entry
    console.log('1. Testing POST /api/annadhanam (Create)');
    const createResponse = await fetch(`${BASE_URL}/annadhanam`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      body: JSON.stringify(testData)
    });

    if (createResponse.ok) {
      const createResult = await createResponse.json();
      console.log('✅ Create successful:', createResult);
      const createdId = createResult.data.id;

      // Test GET - Fetch all annadhanam entries
      console.log('\n2. Testing GET /api/annadhanam (List)');
      const listResponse = await fetch(`${BASE_URL}/annadhanam`, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`
        }
      });

      if (listResponse.ok) {
        const listResult = await listResponse.json();
        console.log('✅ List successful:', listResult);
      } else {
        console.log('❌ List failed:', await listResponse.text());
      }

      // Test GET - Fetch single annadhanam entry
      console.log('\n3. Testing GET /api/annadhanam/:id (Get Single)');
      const getResponse = await fetch(`${BASE_URL}/annadhanam/${createdId}`, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`
        }
      });

      if (getResponse.ok) {
        const getResult = await getResponse.json();
        console.log('✅ Get single successful:', getResult);
      } else {
        console.log('❌ Get single failed:', await getResponse.text());
      }

      // Test PUT - Update annadhanam entry
      console.log('\n4. Testing PUT /api/annadhanam/:id (Update)');
      const updateData = { ...testData, name: 'Updated Test User', peoples: 75 };
      const updateResponse = await fetch(`${BASE_URL}/annadhanam/${createdId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKEN}`
        },
        body: JSON.stringify(updateData)
      });

      if (updateResponse.ok) {
        const updateResult = await updateResponse.json();
        console.log('✅ Update successful:', updateResult);
      } else {
        console.log('❌ Update failed:', await updateResponse.text());
      }

      // Test DELETE - Delete annadhanam entry
      console.log('\n5. Testing DELETE /api/annadhanam/:id (Delete)');
      const deleteResponse = await fetch(`${BASE_URL}/annadhanam/${createdId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`
        }
      });

      if (deleteResponse.ok) {
        const deleteResult = await deleteResponse.json();
        console.log('✅ Delete successful:', deleteResult);
      } else {
        console.log('❌ Delete failed:', await deleteResponse.text());
      }

    } else {
      console.log('❌ Create failed:', await createResponse.text());
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }

  console.log('\nTest completed!');
}

// Run the test
testAnnadhanamAPI();
