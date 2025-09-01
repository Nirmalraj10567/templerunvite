const knex = require('knex');
const path = require('path');

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: path.join(__dirname, 'server', 'deev.sqlite3'),
  },
  useNullAsDefault: true,
});

async function insertData() {
  try {
    // Insert tax settings
    await db.raw(`
      INSERT OR IGNORE INTO tax_settings (temple_id, year, tax_amount, description, is_active, include_previous_years, created_at, updated_at)
      VALUES 
      (1, 2023, 450.00, 'Landowners Tax 2023', 1, 1, datetime('now'), datetime('now')),
      (1, 2024, 500.00, 'Landowners Tax 2024', 1, 1, datetime('now'), datetime('now')),
      (1, 2025, 600.00, 'Landowners Tax 2025', 1, 0, datetime('now'), datetime('now'))
    `);
    console.log('✓ Tax settings inserted');

    // Insert tax registrations
    await db.raw(`
      INSERT OR IGNORE INTO user_tax_registrations 
      (temple_id, reference_number, date, subdivision, name, father_name, address, mobile_number, aadhaar_number, clan, \`group\`, year, tax_amount, amount_paid, outstanding_amount, created_at, updated_at)
      VALUES 
      (1, 'TAX-2023-001', '2023-03-15', 'subdivision1', 'Raman Kumar', 'Krishnan Kumar', '123 Temple Street, Village A', '9876543210', '123456789012', 'Bharadwaja', 'Group A', 2023, 450.00, 200.00, 250.00, '2023-03-15 10:00:00', '2023-03-15 10:00:00'),
      (1, 'TAX-2024-001', '2024-04-10', 'subdivision2', 'Lakshmi Devi', 'Venkat Rao', '456 Main Road, Village B', '9876543211', '123456789013', 'Kashyapa', 'Group B', 2024, 500.00, 500.00, 0.00, '2024-04-10 11:00:00', '2024-04-10 11:00:00'),
      (1, 'TAX-2024-002', '2024-05-20', 'subdivision3', 'Suresh Babu', 'Raghavan Babu', '789 East Street, Village C', '9876543212', '123456789014', 'Vasishta', 'Group C', 2024, 500.00, 0.00, 500.00, '2024-05-20 12:00:00', '2024-05-20 12:00:00')
    `);
    console.log('✓ Tax registrations inserted');

    // Verify
    const settings = await db('tax_settings').where('temple_id', 1).orderBy('year');
    console.log('\nTax Settings:');
    settings.forEach(s => console.log(`  ${s.year}: ₹${s.tax_amount} (Include Previous: ${s.include_previous_years ? 'ON' : 'OFF'})`));

    const regs = await db('user_tax_registrations').where('temple_id', 1).orderBy('year');
    console.log('\nTax Registrations:');
    regs.forEach(r => console.log(`  ${r.name} (${r.mobile_number}) - ${r.year}: ₹${r.outstanding_amount} outstanding`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.destroy();
  }
}

insertData();
