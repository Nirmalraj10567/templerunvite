const knex = require('knex');
const path = require('path');

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: path.join(__dirname, 'server', 'deev.sqlite3'),
  },
  useNullAsDefault: true,
});

async function insertTaxDummyData() {
  try {
    console.log('Inserting dummy tax data...');
    
    // Check if tax_settings table exists
    const hasTaxSettings = await db.schema.hasTable('tax_settings');
    console.log('tax_settings table exists:', hasTaxSettings);
    
    if (hasTaxSettings) {
      // Insert tax settings for 2023, 2024, 2025
      const existingSettings = await db('tax_settings').where('temple_id', 1).select('year');
      const existingYears = existingSettings.map(s => s.year);
      
      const taxSettings = [
        { year: 2023, tax_amount: 450.00, description: 'Landowners Tax 2023', include_previous_years: true },
        { year: 2024, tax_amount: 500.00, description: 'Landowners Tax 2024', include_previous_years: true },
        { year: 2025, tax_amount: 600.00, description: 'Landowners Tax 2025', include_previous_years: false }
      ];

      for (const setting of taxSettings) {
        if (!existingYears.includes(setting.year)) {
          await db('tax_settings').insert({
            temple_id: 1,
            year: setting.year,
            tax_amount: setting.tax_amount,
            description: setting.description,
            is_active: true,
            include_previous_years: setting.include_previous_years,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          console.log(`✓ Created tax setting for ${setting.year}: ₹${setting.tax_amount}`);
        } else {
          console.log(`- Tax setting for ${setting.year} already exists`);
        }
      }
    }

    // Check if user_tax_registrations table exists
    const hasTaxRegs = await db.schema.hasTable('user_tax_registrations');
    console.log('user_tax_registrations table exists:', hasTaxRegs);
    
    if (hasTaxRegs) {
      // Insert sample tax registrations
      const existingRegs = await db('user_tax_registrations').where('temple_id', 1).select('id');
      
      if (existingRegs.length === 0) {
        const taxRegistrations = [
          // User 1: Registered in 2023, partial payment
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
          // User 2: Registered in 2024, full payment
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
          // User 3: Registered in 2024, no payment
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
          },
          // User 4: Multiple years registration
          {
            temple_id: 1,
            reference_number: 'TAX-2023-002',
            date: '2023-06-01',
            subdivision: 'subdivision1',
            name: 'Priya Sharma',
            father_name: 'Mohan Sharma',
            address: '321 North Street, Village D',
            mobile_number: '9876543213',
            aadhaar_number: '123456789015',
            clan: 'Atri',
            group: 'Group A',
            year: 2023,
            tax_amount: 450.00,
            amount_paid: 450.00,
            outstanding_amount: 0.00,
            created_at: '2023-06-01 14:00:00',
            updated_at: '2023-06-01 14:00:00'
          },
          {
            temple_id: 1,
            reference_number: 'TAX-2024-003',
            date: '2024-07-15',
            subdivision: 'subdivision2',
            name: 'Priya Sharma',
            father_name: 'Mohan Sharma',
            address: '321 North Street, Village D',
            mobile_number: '9876543213',
            aadhaar_number: '123456789015',
            clan: 'Atri',
            group: 'Group A',
            year: 2024,
            tax_amount: 500.00,
            amount_paid: 300.00,
            outstanding_amount: 200.00,
            created_at: '2024-07-15 15:00:00',
            updated_at: '2024-07-15 15:00:00'
          }
        ];

        for (const reg of taxRegistrations) {
          await db('user_tax_registrations').insert(reg);
        }
        console.log(`✓ Created ${taxRegistrations.length} dummy tax registrations`);
      } else {
        console.log(`- ${existingRegs.length} tax registrations already exist`);
      }
    }

    // Verify the data
    console.log('\n--- Verification ---');
    const settings = await db('tax_settings').where('temple_id', 1).select('*');
    console.log('Tax Settings:');
    settings.forEach(s => {
      console.log(`  ${s.year}: ₹${s.tax_amount} (Include Previous: ${s.include_previous_years ? 'ON' : 'OFF'})`);
    });

    const registrations = await db('user_tax_registrations').where('temple_id', 1).select('*');
    console.log('\nTax Registrations:');
    registrations.forEach(r => {
      console.log(`  ${r.name} (${r.mobile_number}) - ${r.year}: ₹${r.tax_amount}, Paid: ₹${r.amount_paid}, Outstanding: ₹${r.outstanding_amount}`);
    });

  } catch (error) {
    console.error('Error inserting dummy data:', error);
  } finally {
    await db.destroy();
  }
}

insertTaxDummyData();
