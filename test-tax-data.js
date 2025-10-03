import axios from 'axios';

async function addTaxDummyData() {
  try {
    console.log('Adding tax dummy data via API...');
    
    // Login first
    const loginResponse = await axios.post('http://localhost:4000/api/login', {
      username: 'superadmin',
      password: 'superadmin123'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }
    
    const token = loginResponse.data.token;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Add tax settings for 2023, 2024, 2025
    const taxSettings = [
      { year: 2023, taxAmount: 450.00, description: 'Landowners Tax 2023', isActive: true, includePreviousYears: true },
      { year: 2024, taxAmount: 500.00, description: 'Landowners Tax 2024', isActive: true, includePreviousYears: true },
      { year: 2025, taxAmount: 600.00, description: 'Landowners Tax 2025', isActive: true, includePreviousYears: false }
    ];

    console.log('\n--- Adding Tax Settings ---');
    for (const setting of taxSettings) {
      try {
        const response = await axios.post('http://localhost:4000/api/tax-settings', setting, { headers });
        console.log(`✓ ${setting.year}: ₹${setting.taxAmount} (Include Previous: ${setting.includePreviousYears ? 'ON' : 'OFF'})`);
      } catch (err) {
        console.log(`- ${setting.year}: Already exists or error -`, err.response?.data?.error || err.message);
      }
    }

    // Add sample tax registrations
    const taxRegistrations = [
      // User 1: 2023 registration with partial payment
      {
        referenceNumber: 'TAX-2023-001',
        date: '2023-03-15',
        subdivision: 'subdivision1',
        name: 'Raman Kumar',
        fatherName: 'Krishnan Kumar',
        address: '123 Temple Street, Village A',
        mobileNumber: '9876543210',
        aadhaarNumber: '123456789012',
        clan: 'Bharadwaja',
        group: 'Group A',
        year: 2023,
        taxAmount: 450.00,
        amountPaid: 200.00,
        outstandingAmount: 250.00
      },
      // User 2: 2024 registration with full payment
      {
        referenceNumber: 'TAX-2024-001',
        date: '2024-04-10',
        subdivision: 'subdivision2',
        name: 'Lakshmi Devi',
        fatherName: 'Venkat Rao',
        address: '456 Main Road, Village B',
        mobileNumber: '9876543211',
        aadhaarNumber: '123456789013',
        clan: 'Kashyapa',
        group: 'Group B',
        year: 2024,
        taxAmount: 500.00,
        amountPaid: 500.00,
        outstandingAmount: 0.00
      },
      // User 3: 2024 registration with no payment
      {
        referenceNumber: 'TAX-2024-002',
        date: '2024-05-20',
        subdivision: 'subdivision3',
        name: 'Suresh Babu',
        fatherName: 'Raghavan Babu',
        address: '789 East Street, Village C',
        mobileNumber: '9876543212',
        aadhaarNumber: '123456789014',
        clan: 'Vasishta',
        group: 'Group C',
        year: 2024,
        taxAmount: 500.00,
        amountPaid: 0.00,
        outstandingAmount: 500.00
      }
    ];

    console.log('\n--- Adding Tax Registrations ---');
    for (const reg of taxRegistrations) {
      try {
        const response = await axios.post('http://localhost:4000/api/tax-registrations', reg, { headers });
        console.log(`✓ ${reg.name} (${reg.mobileNumber}) - ${reg.year}: ₹${reg.outstandingAmount} outstanding`);
      } catch (err) {
        console.log(`- ${reg.name}: Error -`, err.response?.data?.error || err.message);
      }
    }

    // Test cumulative calculation
    console.log('\n--- Testing Cumulative Calculation ---');
    try {
      const testResponse = await axios.get('http://localhost:4000/api/tax-calculations/cumulative/9999999999?currentYear=2025', { headers });
      console.log('NEW user (9999999999) cumulative calculation:', testResponse.data);
    } catch (err) {
      console.log('Cumulative test error:', err.response?.data || err.message);
    }

    // Verify data
    console.log('\n--- Verification ---');
    const listResponse = await axios.get('http://localhost:4000/api/tax-registrations?pageSize=10', { headers });
    console.log(`Total tax registrations: ${listResponse.data.total}`);
    
    console.log('\n🎯 Test Instructions:');
    console.log('1. Go to Tax Settings (/dashboard/tax/settings) - View the 2023, 2024, 2025 settings');
    console.log('2. Go to Tax Entry (/dashboard/tax/entry):');
    console.log('   - Enter 9876543210 (Raman) - Should show ₹250 outstanding from 2023');
    console.log('   - Enter 9876543212 (Suresh) - Should show ₹500 outstanding from 2024');
    console.log('   - Enter NEW mobile (9999999999) - Should show cumulative ₹1550 total');

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

addTaxDummyData();
