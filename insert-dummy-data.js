const knex = require('knex');
const path = require('path');

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: path.join(__dirname, 'server', 'deev.sqlite3'),
  },
  useNullAsDefault: true,
});

async function insertDummyData() {
  try {
    console.log('Inserting dummy tax data...');

    // Insert tax settings
    await db('tax_settings').insert([
      {
        temple_id: 1,
        year: 2023,
        tax_amount: 450.00,
        description: 'Landowners Tax 2023',
        is_active: true,
        include_previous_years: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        temple_id: 1,
        year: 2024,
        tax_amount: 500.00,
        description: 'Landowners Tax 2024',
        is_active: true,
        include_previous_years: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        temple_id: 1,
        year: 2025,
        tax_amount: 600.00,
        description: 'Landowners Tax 2025',
        is_active: true,
        include_previous_years: false,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]).onConflict(['temple_id', 'year']).ignore();

    console.log('✓ Tax settings inserted');

    // Insert tax registrations
    await db('user_tax_registrations').insert([
      {
        temple_id: 1,
        reference_number: 'TAX-2023-001',
        date: '2023-03-15',
        subdivision: 'subdivision1',
        name: 'Raman Kumar',
        father_name: 'Krishnan Kumar',
        address: '123 Temple Street, Village A',
        mobile_number: '9876543210',
        aadhaar_number: '123456789012',
        clan: 'Bharadwaja',
        group: 'Group A',
        year: 2023,
        tax_amount: 450.00,
        amount_paid: 200.00,
        outstanding_amount: 250.00,
        created_at: '2023-03-15 10:00:00',
        updated_at: '2023-03-15 10:00:00'
      },
      {
        temple_id: 1,
        reference_number: 'TAX-2024-001',
        date: '2024-04-10',
        subdivision: 'subdivision2',
        name: 'Lakshmi Devi',
        father_name: 'Venkat Rao',
        address: '456 Main Road, Village B',
        mobile_number: '9876543211',
        aadhaar_number: '123456789013',
        clan: 'Kashyapa',
        group: 'Group B',
        year: 2024,
        tax_amount: 500.00,
        amount_paid: 500.00,
        outstanding_amount: 0.00,
        created_at: '2024-04-10 11:00:00',
        updated_at: '2024-04-10 11:00:00'
      },
      {
        temple_id: 1,
        reference_number: 'TAX-2024-002',
        date: '2024-05-20',
        subdivision: 'subdivision3',
        name: 'Suresh Babu',
        father_name: 'Raghavan Babu',
        address: '789 East Street, Village C',
        mobile_number: '9876543212',
        aadhaar_number: '123456789014',
        clan: 'Vasishta',
        group: 'Group C',
        year: 2024,
        tax_amount: 500.00,
        amount_paid: 0.00,
        outstanding_amount: 500.00,
        created_at: '2024-05-20 12:00:00',
        updated_at: '2024-05-20 12:00:00'
      }
    ]).onConflict(['temple_id', 'mobile_number', 'year']).ignore();

    console.log('✓ Tax registrations inserted');

    // Verify data
    const settings = await db('tax_settings').where('temple_id', 1).orderBy('year');
    console.log('\nTax Settings:');
    settings.forEach(s => {
      console.log(`  ${s.year}: ₹${s.tax_amount} (Include Previous: ${s.include_previous_years ? 'ON' : 'OFF'})`);
    });

    const regs = await db('user_tax_registrations').where('temple_id', 1).orderBy('year');
    console.log('\nTax Registrations:');
    regs.forEach(r => {
      console.log(`  ${r.name} (${r.mobile_number}) - ${r.year}: ₹${r.outstanding_amount} outstanding`);
    });

    console.log('\n🧪 Test Instructions:');
    console.log('Backend is on port 4000, not 8080!');
    console.log('Use: http://localhost:4000/api/tax-registrations?search=9876543210');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.destroy();
  }
}

insertDummyData();
