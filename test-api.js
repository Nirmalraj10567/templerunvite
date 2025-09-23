import axios from 'axios';

async function testAPI() {
  try {
    console.log('Testing API connection...');
    
    // Test if backend is running
    const healthCheck = await axios.get('http://localhost:4000/');
    console.log('✓ Backend is running:', healthCheck.data);
    
    // Test login
    console.log('\nTesting login...');
    const loginResponse = await axios.post('http://localhost:4000/api/login', {
      username: 'superadmin',
      password: 'superadmin123'
    });
    
    if (loginResponse.data.success) {
      console.log('✓ Login successful');
      const token = loginResponse.data.token;
      
      // Test member creation
      console.log('\nTesting member creation...');
      console.log('User info:', loginResponse.data.user);
      
      const memberData = {
        name: 'Test Member',
        mobile: '9876543210',
        email: 'test@example.com',
        createLogin: true,
        password: '123456',
        role: 'member',
        customPermissions: [
          { id: 'session_logs', access: 'view' }
        ]
      };
      
      console.log('Sending member data:', memberData);
      
      const memberResponse = await axios.post('http://localhost:4000/api/members', memberData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✓ Member creation successful:', memberResponse.data);
      
      // Test tax registration creation
      console.log('\nTesting tax registration creation...');
      const taxPayload = {
        referenceNumber: 'TAX-REF-001',
        date: new Date().toISOString().slice(0,10),
        subdivision: 'SUB-101',
        name: 'Tax Payer One',
        alternativeName: 'TP1',
        wifeName: 'Wife Name',
        education: 'Bachelor Degree',
        occupation: 'Engineer',
        fatherName: 'Father Name',
        address: '123 Street, City',
        birthDate: '1990-01-01',
        village: 'Sample Village',
        mobileNumber: '9876543210',
        aadhaarNumber: '123412341234',
        panNumber: 'ABCDE1234F',
        clan: 'Sample Clan',
        group: 'Sample Group',
        postalCode: '600001',
        maleHeirs: 1,
        femaleHeirs: 1,
      };
      const taxRes = await axios.post('http://localhost:4000/api/tax-registrations', taxPayload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✓ Tax registration created:', taxRes.data);
      
    }
    
  } catch (error) {
    console.error('❌ API Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testAPI();