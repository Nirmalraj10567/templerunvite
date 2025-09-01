-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_no TEXT NOT NULL,
  survey_no TEXT NOT NULL,
  ward_no TEXT NOT NULL,
  street_name TEXT NOT NULL,
  area TEXT NOT NULL,
  city TEXT NOT NULL,
  pincode TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_mobile TEXT NOT NULL,
  owner_aadhaar TEXT,
  owner_address TEXT,
  tax_amount DECIMAL(10, 2) NOT NULL,
  tax_year INTEGER NOT NULL,
  tax_status TEXT NOT NULL DEFAULT 'pending',
  last_paid_date DATE,
  pending_amount DECIMAL(10, 2) NOT NULL,
  created_by INTEGER NOT NULL,
  temple_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (temple_id) REFERENCES temples(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_properties_temple ON properties(temple_id);
CREATE INDEX IF NOT EXISTS idx_properties_property_no ON properties(property_no);
CREATE INDEX IF NOT EXISTS idx_properties_owner_mobile ON properties(owner_mobile);
CREATE INDEX IF NOT EXISTS idx_properties_tax_status ON properties(tax_status);

-- Add property_registrations permission if it doesn't exist
INSERT OR IGNORE INTO permissions (id, name, description)
VALUES ('property_registrations', 'Property Registrations', 'Manage property registrations and tax details');

-- Grant view permission to admin role
INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level)
SELECT 'admin', 'property_registrations', 'full'
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions 
  WHERE role_id = 'admin' AND permission_id = 'property_registrations'
);

-- Grant view permission to member role
INSERT OR IGNORE INTO role_permissions (role_id, permission_id, access_level)
SELECT 'member', 'property_registrations', 'view'
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions 
  WHERE role_id = 'member' AND permission_id = 'property_registrations'
);
