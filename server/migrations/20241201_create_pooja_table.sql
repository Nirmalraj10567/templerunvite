-- Create pooja table
CREATE TABLE IF NOT EXISTS pooja (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  temple_id INTEGER NOT NULL DEFAULT 1,
  receipt_number TEXT NOT NULL,
  name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  time TEXT NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  remarks TEXT,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pooja_temple ON pooja(temple_id);
CREATE INDEX IF NOT EXISTS idx_pooja_receipt_number ON pooja(receipt_number);
CREATE INDEX IF NOT EXISTS idx_pooja_name ON pooja(name);
CREATE INDEX IF NOT EXISTS idx_pooja_mobile ON pooja(mobile_number);
CREATE INDEX IF NOT EXISTS idx_pooja_from_date ON pooja(from_date);
CREATE INDEX IF NOT EXISTS idx_pooja_to_date ON pooja(to_date);

-- Add pooja_registrations permission if it doesn't exist
INSERT OR IGNORE INTO permissions (id, name, description)
VALUES ('pooja_registrations', 'Pooja Registrations', 'Manage pooja registrations and religious ceremonies');

-- Grant full permission to admin role
INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level)
SELECT 'admin', 'pooja_registrations', 'full'
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions 
  WHERE role_id = 'admin' AND permission_id = 'pooja_registrations'
);

-- Grant view permission to member role
INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level)
SELECT 'member', 'pooja_registrations', 'view'
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions 
  WHERE role_id = 'member' AND permission_id = 'pooja_registrations'
);

-- Grant full permission to superadmin role
INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level)
SELECT 'superadmin', 'pooja_registrations', 'full'
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions 
  WHERE role_id = 'superadmin' AND permission_id = 'pooja_registrations'
);

-- Grant full permission to user with mobile 9999999999
INSERT OR IGNORE INTO user_permissions (user_id, permission_id, access_level)
SELECT u.id, 'pooja_registrations', 'full'
FROM users u
WHERE u.mobile = '9999999999'
AND NOT EXISTS (
  SELECT 1 FROM user_permissions up 
  WHERE up.user_id = u.id AND up.permission_id = 'pooja_registrations'
);

-- Insert sample test data
INSERT OR IGNORE INTO pooja (temple_id, receipt_number, name, mobile_number, time, from_date, to_date, remarks, created_by, created_at, updated_at) VALUES
(1, 'POO001', 'Rajesh Kumar', '9876543210', '06:00', '2024-01-15', '2024-01-15', 'Morning Ganapathy Pooja', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 'POO002', 'Priya Sharma', '9876543211', '18:00', '2024-01-16', '2024-01-16', 'Evening Lakshmi Pooja', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 'POO003', 'Suresh Reddy', '9876543212', '12:00', '2024-01-17', '2024-01-17', 'Noon Shiva Pooja', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 'POO004', 'Meera Patel', '9876543213', '08:00', '2024-01-18', '2024-01-20', '3-day Navagraha Pooja', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 'POO005', 'Kumar Singh', '9876543214', '19:00', '2024-01-19', '2024-01-19', 'Evening Durga Pooja', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 'POO006', 'Anita Desai', '9876543215', '07:30', '2024-01-20', '2024-01-20', 'Morning Saraswati Pooja', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 'POO007', 'Vikram Joshi', '9876543216', '17:30', '2024-01-21', '2024-01-21', 'Evening Hanuman Pooja', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 'POO008', 'Sunita Agarwal', '9876543217', '11:00', '2024-01-22', '2024-01-22', 'Morning Venkateswara Pooja', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 'POO009', 'Ramesh Gupta', '9876543218', '20:00', '2024-01-23', '2024-01-23', 'Night Kali Pooja', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 'POO010', 'Lakshmi Iyer', '9876543219', '09:00', '2024-01-24', '2024-01-26', '3-day Maha Lakshmi Pooja', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
