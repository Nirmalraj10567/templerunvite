const fs = require('fs');
const path = require('path');

// Direct SQL insertion
const dbPath = path.join(__dirname, 'server', 'deev.sqlite3');

console.log('Adding dummy tax data...');

// Create SQL commands
const sqlCommands = `
-- Tax Settings
INSERT OR REPLACE INTO tax_settings (temple_id, year, tax_amount, description, is_active, include_previous_years, created_at, updated_at)
VALUES 
(1, 2023, 450.00, 'Landowners Tax 2023', 1, 1, datetime('now'), datetime('now')),
(1, 2024, 500.00, 'Landowners Tax 2024', 1, 1, datetime('now'), datetime('now')),
(1, 2025, 600.00, 'Landowners Tax 2025', 1, 0, datetime('now'), datetime('now'));

-- Tax Registrations  
INSERT OR REPLACE INTO user_tax_registrations 
(temple_id, reference_number, date, subdivision, name, father_name, address, mobile_number, aadhaar_number, clan, \`group\`, year, tax_amount, amount_paid, outstanding_amount, created_at, updated_at)
VALUES 
(1, 'TAX-2023-001', '2023-03-15', 'subdivision1', 'Raman Kumar', 'Krishnan Kumar', '123 Temple Street, Village A', '9876543210', '123456789012', 'Bharadwaja', 'Group A', 2023, 450.00, 200.00, 250.00, '2023-03-15 10:00:00', '2023-03-15 10:00:00'),
(1, 'TAX-2024-001', '2024-04-10', 'subdivision2', 'Lakshmi Devi', 'Venkat Rao', '456 Main Road, Village B', '9876543211', '123456789013', 'Kashyapa', 'Group B', 2024, 500.00, 500.00, 0.00, '2024-04-10 11:00:00', '2024-04-10 11:00:00'),
(1, 'TAX-2024-002', '2024-05-20', 'subdivision3', 'Suresh Babu', 'Raghavan Babu', '789 East Street, Village C', '9876543212', '123456789014', 'Vasishta', 'Group C', 2024, 500.00, 0.00, 500.00, '2024-05-20 12:00:00', '2024-05-20 12:00:00');
`;

// Write to temp SQL file
fs.writeFileSync('temp-tax-data.sql', sqlCommands);

console.log('✓ Created SQL file with dummy data');
console.log('📋 Dummy Data Summary:');
console.log('');
console.log('Tax Settings:');
console.log('  2023: ₹450 (Include Previous: ON)');
console.log('  2024: ₹500 (Include Previous: ON)');
console.log('  2025: ₹600 (Include Previous: OFF)');
console.log('');
console.log('Tax Registrations:');
console.log('  Raman Kumar (9876543210) - 2023: ₹250 outstanding');
console.log('  Lakshmi Devi (9876543211) - 2024: ₹0 outstanding (paid)');
console.log('  Suresh Babu (9876543212) - 2024: ₹500 outstanding');
console.log('');
console.log('🧪 Test Scenarios:');
console.log('  NEW user (e.g., 9999999999) joining in 2025:');
console.log('    Total = ₹450 (2023) + ₹500 (2024) + ₹600 (2025) = ₹1550');
console.log('');
console.log('🚀 Next Steps:');
console.log('1. Start backend: node server/backend.js');
console.log('2. Go to /dashboard/tax/settings to see tax settings');
console.log('3. Go to /dashboard/tax/entry to test cumulative calculation');
console.log('4. Enter mobile numbers above to see different scenarios');
