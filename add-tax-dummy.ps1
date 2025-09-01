# PowerShell script to add dummy tax data
$dbPath = ".\server\deev.sqlite3"

Write-Host "Adding dummy tax data to database..." -ForegroundColor Green

# Tax Settings
$taxSettingsSQL = @"
INSERT OR REPLACE INTO tax_settings (temple_id, year, tax_amount, description, is_active, include_previous_years, created_at, updated_at)
VALUES 
(1, 2023, 450.00, 'Landowners Tax 2023', 1, 1, datetime('now'), datetime('now')),
(1, 2024, 500.00, 'Landowners Tax 2024', 1, 1, datetime('now'), datetime('now')),
(1, 2025, 600.00, 'Landowners Tax 2025', 1, 0, datetime('now'), datetime('now'));
"@

# Tax Registrations
$taxRegistrationsSQL = @"
INSERT OR REPLACE INTO user_tax_registrations 
(temple_id, reference_number, date, subdivision, name, father_name, address, mobile_number, aadhaar_number, clan, 'group', year, tax_amount, amount_paid, outstanding_amount, created_at, updated_at)
VALUES 
(1, 'TAX-2023-001', '2023-03-15', 'subdivision1', 'Raman Kumar', 'Krishnan Kumar', '123 Temple Street, Village A', '9876543210', '123456789012', 'Bharadwaja', 'Group A', 2023, 450.00, 200.00, 250.00, '2023-03-15 10:00:00', '2023-03-15 10:00:00'),
(1, 'TAX-2024-001', '2024-04-10', 'subdivision2', 'Lakshmi Devi', 'Venkat Rao', '456 Main Road, Village B', '9876543211', '123456789013', 'Kashyapa', 'Group B', 2024, 500.00, 500.00, 0.00, '2024-04-10 11:00:00', '2024-04-10 11:00:00'),
(1, 'TAX-2024-002', '2024-05-20', 'subdivision3', 'Suresh Babu', 'Raghavan Babu', '789 East Street, Village C', '9876543212', '123456789014', 'Vasishta', 'Group C', 2024, 500.00, 0.00, 500.00, '2024-05-20 12:00:00', '2024-05-20 12:00:00'),
(1, 'TAX-2023-002', '2023-06-01', 'subdivision1', 'Priya Sharma', 'Mohan Sharma', '321 North Street, Village D', '9876543213', '123456789015', 'Atri', 'Group A', 2023, 450.00, 450.00, 0.00, '2023-06-01 14:00:00', '2023-06-01 14:00:00'),
(1, 'TAX-2024-003', '2024-07-15', 'subdivision2', 'Priya Sharma', 'Mohan Sharma', '321 North Street, Village D', '9876543213', '123456789015', 'Atri', 'Group A', 2024, 500.00, 300.00, 200.00, '2024-07-15 15:00:00', '2024-07-15 15:00:00');
"@

try {
    # Execute tax settings
    sqlite3.exe $dbPath $taxSettingsSQL
    Write-Host "✓ Tax settings added" -ForegroundColor Green
    
    # Execute tax registrations  
    sqlite3.exe $dbPath $taxRegistrationsSQL
    Write-Host "✓ Tax registrations added" -ForegroundColor Green
    
    # Verify data
    Write-Host "`n--- Verification ---" -ForegroundColor Yellow
    $verifySQL = "SELECT year, tax_amount, include_previous_years FROM tax_settings WHERE temple_id = 1 ORDER BY year;"
    $settings = sqlite3.exe $dbPath $verifySQL
    Write-Host "Tax Settings:" -ForegroundColor Cyan
    $settings | ForEach-Object { Write-Host "  $_" }
    
    $regSQL = "SELECT name, mobile_number, year, outstanding_amount FROM user_tax_registrations WHERE temple_id = 1 ORDER BY year, name;"
    $regs = sqlite3.exe $dbPath $regSQL
    Write-Host "`nTax Registrations:" -ForegroundColor Cyan
    $regs | ForEach-Object { Write-Host "  $_" }
    
    Write-Host "`n🎯 Test Instructions:" -ForegroundColor Green
    Write-Host "1. Start backend: node server/backend.js"
    Write-Host "2. Go to Tax Entry and test these mobiles:"
    Write-Host "   - 9876543210 (Raman) - ₹250 outstanding from 2023"
    Write-Host "   - 9876543212 (Suresh) - ₹500 outstanding from 2024" 
    Write-Host "   - 9999999999 (NEW user) - ₹1550 cumulative (₹450+₹500+₹600)"
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
