const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'deev.sqlite3');
const db = new sqlite3.Database(dbPath);

async function addTaxData() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('Adding tax settings...');
      
      // Insert tax settings
      const taxSettings = [
        [1, 2023, 450.00, 'Landowners Tax 2023', 1, 1],
        [1, 2024, 500.00, 'Landowners Tax 2024', 1, 1], 
        [1, 2025, 600.00, 'Landowners Tax 2025', 1, 0]
      ];

      const insertTaxSetting = db.prepare(`
        INSERT OR REPLACE INTO tax_settings 
        (temple_id, year, tax_amount, description, is_active, include_previous_years, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      taxSettings.forEach(setting => {
        insertTaxSetting.run(setting, function(err) {
          if (err) console.error('Error inserting tax setting:', err);
          else console.log(`✓ Tax setting ${setting[1]}: ₹${setting[2]}`);
        });
      });
      insertTaxSetting.finalize();

      console.log('\nAdding tax registrations...');
      
      // Insert tax registrations
      const taxRegistrations = [
        [1, 'TAX-2023-001', '2023-03-15', 'subdivision1', 'Raman Kumar', 'Krishnan Kumar', '123 Temple Street, Village A', '9876543210', '123456789012', 'Bharadwaja', 'Group A', 2023, 450.00, 200.00, 250.00],
        [1, 'TAX-2024-001', '2024-04-10', 'subdivision2', 'Lakshmi Devi', 'Venkat Rao', '456 Main Road, Village B', '9876543211', '123456789013', 'Kashyapa', 'Group B', 2024, 500.00, 500.00, 0.00],
        [1, 'TAX-2024-002', '2024-05-20', 'subdivision3', 'Suresh Babu', 'Raghavan Babu', '789 East Street, Village C', '9876543212', '123456789014', 'Vasishta', 'Group C', 2024, 500.00, 0.00, 500.00],
        [1, 'TAX-2023-002', '2023-06-01', 'subdivision1', 'Priya Sharma', 'Mohan Sharma', '321 North Street, Village D', '9876543213', '123456789015', 'Atri', 'Group A', 2023, 450.00, 450.00, 0.00],
        [1, 'TAX-2024-003', '2024-07-15', 'subdivision2', 'Priya Sharma', 'Mohan Sharma', '321 North Street, Village D', '9876543213', '123456789015', 'Atri', 'Group A', 2024, 500.00, 300.00, 200.00]
      ];

      const insertTaxReg = db.prepare(`
        INSERT OR REPLACE INTO user_tax_registrations 
        (temple_id, reference_number, date, subdivision, name, father_name, address, mobile_number, aadhaar_number, clan, group, year, tax_amount, amount_paid, outstanding_amount, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      taxRegistrations.forEach(reg => {
        insertTaxReg.run(reg, function(err) {
          if (err) console.error('Error inserting tax registration:', err);
          else console.log(`✓ Tax registration: ${reg[4]} (${reg[7]}) - ${reg[11]}`);
        });
      });
      insertTaxReg.finalize();

      // Verify data
      setTimeout(() => {
        db.all('SELECT * FROM tax_settings WHERE temple_id = 1 ORDER BY year', (err, rows) => {
          if (err) console.error(err);
          else {
            console.log('\n--- Tax Settings Verification ---');
            rows.forEach(row => {
              console.log(`${row.year}: ₹${row.tax_amount} (Include Previous: ${row.include_previous_years ? 'ON' : 'OFF'})`);
            });
          }
        });

        db.all('SELECT * FROM user_tax_registrations WHERE temple_id = 1 ORDER BY year, name', (err, rows) => {
          if (err) console.error(err);
          else {
            console.log('\n--- Tax Registrations Verification ---');
            rows.forEach(row => {
              console.log(`${row.name} (${row.mobile_number}) - ${row.year}: ₹${row.tax_amount}, Paid: ₹${row.amount_paid}, Outstanding: ₹${row.outstanding_amount}`);
            });
          }
          
          db.close();
          resolve();
        });
      }, 1000);
    });
  });
}

addTaxData().then(() => {
  console.log('\n✅ Dummy tax data insertion completed!');
}).catch(err => {
  console.error('❌ Error:', err);
});
