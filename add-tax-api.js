const fetch = require('node-fetch');

async function addTaxData() {
  try {
    // Login first
    const loginRes = await fetch('http://localhost:4000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'superadmin', password: 'superadmin123' })
    });
    
    const loginData = await loginRes.json();
    if (!loginData.success) throw new Error('Login failed');
    
    const token = loginData.token;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    console.log('✓ Logged in successfully');

    // Add tax settings
    const taxSettings = [
      { year: 2023, taxAmount: 450, description: 'Landowners Tax 2023', isActive: true, includePreviousYears: true },
      { year: 2024, taxAmount: 500, description: 'Landowners Tax 2024', isActive: true, includePreviousYears: true },
      { year: 2025, taxAmount: 600, description: 'Landowners Tax 2025', isActive: true, includePreviousYears: false }
    ];

    console.log('\n--- Adding Tax Settings ---');
    for (const setting of taxSettings) {
      try {
        const res = await fetch('http://localhost:4000/api/tax-settings', {
          method: 'POST',
          headers,
          body: JSON.stringify(setting)
        });
        const data = await res.json();
        console.log(`✓ ${setting.year}: ₹${setting.taxAmount} (Include Previous: ${setting.includePreviousYears ? 'ON' : 'OFF'})`);
      } catch (err) {
        console.log(`- ${setting.year}: Error - ${err.message}`);
      }
    }

    // Add tax registrations
    const taxRegs = [
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
        taxAmount: 450,
        amountPaid: 200,
        outstandingAmount: 250,
        templeId: 1
      },
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
        taxAmount: 500,
        amountPaid: 500,
        outstandingAmount: 0,
        templeId: 1
      },
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
        taxAmount: 500,
        amountPaid: 0,
        outstandingAmount: 500,
        templeId: 1
      }
    ];

    console.log('\n--- Adding Tax Registrations ---');
    for (const reg of taxRegs) {
      try {
        const res = await fetch('http://localhost:4000/api/tax-registrations', {
          method: 'POST',
          headers,
          body: JSON.stringify(reg)
        });
        const data = await res.json();
        console.log(`✓ ${reg.name} (${reg.mobileNumber}) - ${reg.year}: ₹${reg.outstandingAmount} outstanding`);
      } catch (err) {
        console.log(`- ${reg.name}: Error - ${err.message}`);
      }
    }

    // Test cumulative calculation
    console.log('\n--- Testing Cumulative Calculation ---');
    const testRes = await fetch('http://localhost:4000/api/tax-calculations/cumulative/9999999999?currentYear=2025', { headers });
    const testData = await testRes.json();
    console.log('NEW user cumulative:', testData);

    console.log('\n🎯 Test Complete! Now try:');
    console.log('1. Enter 9876543210 in Tax Entry - Should show Raman with ₹250 outstanding');
    console.log('2. Enter 9999999999 in Tax Entry - Should show ₹1550 cumulative for NEW user');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

addTaxData();
