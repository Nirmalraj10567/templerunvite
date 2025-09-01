-- Insert tax settings for 2023, 2024, 2025
INSERT OR REPLACE INTO tax_settings (temple_id, year, tax_amount, description, is_active, include_previous_years, created_at, updated_at)
VALUES 
(1, 2023, 450.00, 'Landowners Tax 2023', 1, 1, datetime('now'), datetime('now')),
(1, 2024, 500.00, 'Landowners Tax 2024', 1, 1, datetime('now'), datetime('now')),
(1, 2025, 600.00, 'Landowners Tax 2025', 1, 0, datetime('now'), datetime('now'));

-- Insert sample tax registrations
INSERT OR REPLACE INTO user_tax_registrations 
(temple_id, reference_number, date, subdivision, name, father_name, address, mobile_number, aadhaar_number, clan, group, year, tax_amount, amount_paid, outstanding_amount, created_at, updated_at)
VALUES 
-- User 1: 2023 registration with partial payment
(1, 'TAX-2023-001', '2023-03-15', 'subdivision1', 'Raman Kumar', 'Krishnan Kumar', '123 Temple Street, Village A', '9876543210', '123456789012', 'Bharadwaja', 'Group A', 2023, 450.00, 200.00, 250.00, '2023-03-15 10:00:00', '2023-03-15 10:00:00'),

-- User 2: 2024 registration with full payment  
(1, 'TAX-2024-001', '2024-04-10', 'subdivision2', 'Lakshmi Devi', 'Venkat Rao', '456 Main Road, Village B', '9876543211', '123456789013', 'Kashyapa', 'Group B', 2024, 500.00, 500.00, 0.00, '2024-04-10 11:00:00', '2024-04-10 11:00:00'),

-- User 3: 2024 registration with no payment
(1, 'TAX-2024-002', '2024-05-20', 'subdivision3', 'Suresh Babu', 'Raghavan Babu', '789 East Street, Village C', '9876543212', '123456789014', 'Vasishta', 'Group C', 2024, 500.00, 0.00, 500.00, '2024-05-20 12:00:00', '2024-05-20 12:00:00'),

-- User 4: Multi-year registrations (2023 paid, 2024 partial)
(1, 'TAX-2023-002', '2023-06-01', 'subdivision1', 'Priya Sharma', 'Mohan Sharma', '321 North Street, Village D', '9876543213', '123456789015', 'Atri', 'Group A', 2023, 450.00, 450.00, 0.00, '2023-06-01 14:00:00', '2023-06-01 14:00:00'),

(1, 'TAX-2024-003', '2024-07-15', 'subdivision2', 'Priya Sharma', 'Mohan Sharma', '321 North Street, Village D', '9876543213', '123456789015', 'Atri', 'Group A', 2024, 500.00, 300.00, 200.00, '2024-07-15 15:00:00', '2024-07-15 15:00:00');
