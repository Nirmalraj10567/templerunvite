-- Create annadhanam table
CREATE TABLE IF NOT EXISTS annadhanam (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  temple_id INTEGER NOT NULL DEFAULT 1,
  receipt_number TEXT NOT NULL,
  name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  food TEXT NOT NULL,
  peoples INTEGER NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_annadhanam_temple ON annadhanam(temple_id);
CREATE INDEX IF NOT EXISTS idx_annadhanam_receipt_number ON annadhanam(receipt_number);
CREATE INDEX IF NOT EXISTS idx_annadhanam_name ON annadhanam(name);
CREATE INDEX IF NOT EXISTS idx_annadhanam_mobile ON annadhanam(mobile_number);
CREATE INDEX IF NOT EXISTS idx_annadhanam_from_date ON annadhanam(from_date);
CREATE INDEX IF NOT EXISTS idx_annadhanam_to_date ON annadhanam(to_date);

-- Add annadhanam_registrations permission if it doesn't exist
INSERT OR IGNORE INTO permissions (id, name, description)
VALUES ('annadhanam_registrations', 'Annadhanam Registrations', 'Manage annadhanam registrations and food distribution');

-- Grant full permission to admin role
INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level)
SELECT 'admin', 'annadhanam_registrations', 'full'
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions 
  WHERE role_id = 'admin' AND permission_id = 'annadhanam_registrations'
);

-- Grant view permission to member role
INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level)
SELECT 'member', 'annadhanam_registrations', 'view'
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions 
  WHERE role_id = 'member' AND permission_id = 'annadhanam_registrations'
);

-- Grant full permission to superadmin role
INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level)
SELECT 'superadmin', 'annadhanam_registrations', 'full'
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions 
  WHERE role_id = 'superadmin' AND permission_id = 'annadhanam_registrations'
);
