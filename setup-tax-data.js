const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'deev.sqlite3');
const db = new Database(dbPath);

try {
  console.log('Setting up tax dummy data...');

  // Insert tax settings
  const insertTaxSetting = db.prepare(`
    INSERT OR REPLACE INTO tax_settings 
    (temple_id, year, tax_amount, description, is_active, include_previous_years, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const taxSettings = [
    [1, 2023, 450.00, 'Landowners Tax 2023', 1, 1],
    [1, 2024, 500.00, 'Landowners Tax 2024', 1, 1], 
    [1, 2025, 600.00, 'Landowners Tax 2025', 1, 0]
  ];

  taxSettings.forEach(setting => {
    insertTaxSetting.run(setting);
    console.log(`✓ Tax setting ${setting[1]}: ₹${setting[2]} (Include Previous: ${setting[5] ? 'ON' : 'OFF'})`);
  });

  // Insert tax registrations
  const insertTaxReg = db.prepare(`
    INSERT OR REPLACE INTO user_tax_registrations 
    (temple_id, reference_number, date, subdivision, name, father_name, address, mobile_number, aadhaar_number, clan, \`group\`, year, tax_amount, amount_paid, outstanding_amount, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const taxRegistrations = [
    [1, 'TAX-2023-001', '2023-03-15', 'subdivision1', 'Raman Kumar', 'Krishnan Kumar', '123 Temple Street, Village A', '9876543210', '123456789012', 'Bharadwaja', 'Group A', 2023, 450.00, 200.00, 250.00, '2023-03-15 10:00:00', '2023-03-15 10:00:00'],
    [1, 'TAX-2024-001', '2024-04-10', 'subdivision2', 'Lakshmi Devi', 'Venkat Rao', '456 Main Road, Village B', '9876543211', '123456789013', 'Kashyapa', 'Group B', 2024, 500.00, 500.00, 0.00, '2024-04-10 11:00:00', '2024-04-10 11:00:00'],
    [1, 'TAX-2024-002', '2024-05-20', 'subdivision3', 'Suresh Babu', 'Raghavan Babu', '789 East Street, Village C', '9876543212', '123456789014', 'Vasishta', 'Group C', 2024, 500.00, 0.00, 500.00, '2024-05-20 12:00:00', '2024-05-20 12:00:00'],
    [1, 'TAX-2023-002', '2023-06-01', 'subdivision1', 'Priya Sharma', 'Mohan Sharma', '321 North Street, Village D', '9876543213', '123456789015', 'Atri', 'Group A', 2023, 450.00, 450.00, 0.00, '2023-06-01 14:00:00', '2023-06-01 14:00:00'],
    [1, 'TAX-2024-003', '2024-07-15', 'subdivision2', 'Priya Sharma', 'Mohan Sharma', '321 North Street, Village D', '9876543213', '123456789015', 'Atri', 'Group A', 2024, 500.00, 300.00, 200.00, '2024-07-15 15:00:00', '2024-07-15 15:00:00']
  ];

  taxRegistrations.forEach(reg => {
    insertTaxReg.run(reg);
    console.log(`✓ Tax registration: ${reg[4]} (${reg[7]}) - ${reg[11]}: ₹${reg[12]} (Outstanding: ₹${reg[14]})`);
  });

  // Verify the data
  console.log('\n--- Final Verification ---');
  const settings = db.prepare('SELECT * FROM tax_settings WHERE temple_id = 1 ORDER BY year').all();
  console.log('Tax Settings:');
  settings.forEach(s => {
    console.log(`  ${s.year}: ₹${s.tax_amount} (Include Previous: ${s.include_previous_years ? 'ON' : 'OFF'})`);
  });

  const registrations = db.prepare('SELECT * FROM user_tax_registrations WHERE temple_id = 1 ORDER BY year, name').all();
  console.log('\nTax Registrations:');
  registrations.forEach(r => {
    console.log(`  ${r.name} (${r.mobile_number}) - ${r.year}: ₹${r.outstanding_amount} outstanding`);
  });

  console.log('\n🎯 Test Scenarios:');
  console.log('1. Enter mobile 9876543210 (Raman) - Should show ₹250 outstanding from 2023');
  console.log('2. Enter mobile 9876543212 (Suresh) - Should show ₹500 outstanding from 2024');
  console.log('3. Enter NEW mobile (e.g., 9999999999) - Should show cumulative ₹1550 (₹450+₹500+₹600)');

} catch (error) {
  console.error('Error setting up tax data:', error);
} finally {
  db.close();
}
